import type { DatabaseService } from './databaseService';
import type { WebSocketService } from './websocketService';
import { WaveGenerator } from '../algorithms/waveGenerator';
import { TaskScheduler } from '../algorithms/taskScheduler';
import { CollisionDetector } from '../algorithms/pathfinding';
import type { Task, Order, Wave, Robot, Exception } from '../types';

export class SchedulingService {
  private dbService: DatabaseService;
  private wsService: WebSocketService;
  private waveGenerator: WaveGenerator;
  private taskScheduler: TaskScheduler | null = null;
  private collisionDetector: CollisionDetector;
  private simulationInterval: NodeJS.Timeout | null = null;

  constructor(dbService: DatabaseService, wsService: WebSocketService) {
    this.dbService = dbService;
    this.wsService = wsService;
    this.waveGenerator = new WaveGenerator({
      maxOrdersPerWave: 10,
      maxItemsPerWave: 100,
      priorityWeights: { low: 1, medium: 2, high: 4, urgent: 8 },
    });
    this.collisionDetector = new CollisionDetector();
  }

  public initScheduler(): void {
    const floors = this.dbService.getFloors();
    if (floors.length > 0) {
      const racks = this.dbService.getRacks(floors[0].id);
      this.taskScheduler = new TaskScheduler(floors[0].width, floors[0].height, racks);
    }

    const robots = this.dbService.getRobots();
    robots.forEach((robot) => {
      this.collisionDetector.updateRobotPosition(robot.id, robot.x, robot.y);
    });
  }

  public generateWaves(): Wave[] {
    const orders = this.dbService.getOrders('pending');
    const skus = this.dbService.getSKUs();
    const locations = this.dbService.getLocations();

    const waveData = this.waveGenerator.generateWaves(orders, skus, locations);
    const waves: Wave[] = [];
    let waveCounter = this.dbService.getWaves().length + 1;

    for (const data of waveData) {
      const wave = this.dbService.createWave({
        waveNo: `W${String(waveCounter).padStart(4, '0')}`,
        status: 'pending',
        orderIds: data.orderIds,
        robotIds: [],
        priority: 'medium',
      });
      waves.push(wave);
      waveCounter++;

      data.orderIds.forEach((orderId) => {
        this.dbService.updateOrder(orderId, { waveId: wave.id, status: 'processing' });
      });

      this.createWaveTasks(wave.id, data.orderIds);
      this.wsService.broadcastWaveUpdate(wave);
    }

    this.dbService.createLog({
      type: 'system',
      level: 'info',
      message: `Generated ${waves.length} waves`,
    });

    return waves;
  }

  private createWaveTasks(waveId: string, orderIds: string[]): void {
    for (const orderId of orderIds) {
      const order = this.dbService.getOrderById(orderId);
      if (!order) continue;

      for (const item of order.items) {
        const locations = this.dbService
          .getLocations()
          .filter((l) => l.skuId === item.skuId && l.status === 'occupied' && l.quantity > 0);

        if (locations.length > 0) {
          this.dbService.createTask({
            waveId,
            orderId,
            type: 'pick',
            status: 'pending',
            fromLocationId: locations[0].id,
            skuId: item.skuId,
            quantity: Math.min(item.quantity, locations[0].quantity),
            priority: order.priority === 'urgent' ? 10 : order.priority === 'high' ? 7 : order.priority === 'medium' ? 5 : 3,
          });
        } else {
          this.dbService.createException({
            type: 'inventory_shortage',
            severity: 'high',
            status: 'open',
            message: `SKU ${item.skuName} is out of stock`,
            relatedId: orderId,
            relatedType: 'order',
          });
        }
      }
    }
  }

  public assignTasks(): { taskId: string; robotId: string }[] {
    if (!this.taskScheduler) {
      this.initScheduler();
      if (!this.taskScheduler) return [];
    }

    const tasks = this.dbService.getTasks('pending');
    const robots = this.dbService.getRobots();
    const locations = this.dbService.getLocations();

    const assignments = this.taskScheduler.assignTasks(tasks, robots, locations);

    for (const assignment of assignments) {
      this.dbService.updateTask(assignment.taskId, {
        robotId: assignment.robotId,
        status: 'assigned',
        path: assignment.path,
      });

      this.dbService.updateRobot(assignment.robotId, {
        status: 'busy',
        currentTaskId: assignment.taskId,
      });

      const task = this.dbService.getTaskById(assignment.taskId);
      if (task) {
        this.wsService.broadcastTaskUpdate(task);
      }
    }

    this.dbService.createLog({
      type: 'task',
      level: 'info',
      message: `Assigned ${assignments.length} tasks`,
    });

    return assignments;
  }

  public startSimulation(): void {
    if (this.simulationInterval) return;

    this.simulationInterval = setInterval(() => {
      this.processTasks();
      this.detectCongestion();
    }, 500);

    this.dbService.createLog({
      type: 'system',
      level: 'info',
      message: 'Simulation started',
    });
  }

  public stopSimulation(): void {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;

      this.dbService.createLog({
        type: 'system',
        level: 'info',
        message: 'Simulation stopped',
      });
    }
  }

  private processTasks(): void {
    const inProgressTasks = this.dbService.getTasks('in_progress');

    for (const task of inProgressTasks) {
      this.simulateTaskProgress(task);
    }

    const assignedTasks = this.dbService.getTasks('assigned');
    for (const task of assignedTasks) {
      this.startTask(task);
    }
  }

  private startTask(task: Task): void {
    const robot = task.robotId ? this.dbService.getRobotById(task.robotId) : null;
    if (!robot) return;

    this.dbService.updateTask(task.id, {
      status: 'in_progress',
      startedAt: new Date().toISOString(),
    });

    this.dbService.updateRobot(robot.id, {
      status: 'busy',
    });

    this.dbService.createLog({
      type: 'task',
      level: 'info',
      message: `Task ${task.id} started by robot ${robot.name}`,
      relatedId: task.id,
    });
  }

  private simulateTaskProgress(task: Task): void {
    if (!task.robotId || !task.path || task.path.length === 0) return;

    const robot = this.dbService.getRobotById(task.robotId);
    if (!robot) return;

    const currentPathIndex = this.getCurrentPathIndex(robot, task.path);
    if (currentPathIndex < task.path.length - 1) {
      const nextPosition = task.path[currentPathIndex + 1];

      if (this.collisionDetector.checkCollision(robot.id, nextPosition.x, nextPosition.y)) {
        this.handleCollision(task, robot);
        return;
      }

      this.dbService.updateRobot(robot.id, {
        x: nextPosition.x,
        y: nextPosition.y,
        battery: Math.max(0, robot.battery - 0.1),
      });

      this.collisionDetector.updateRobotPosition(robot.id, nextPosition.x, nextPosition.y, task.path);

      this.wsService.broadcastRobotUpdate(this.dbService.getRobotById(robot.id));
    } else {
      this.completeTask(task, robot);
    }
  }

  private getCurrentPathIndex(robot: Robot, path: { x: number; y: number }[]): number {
    for (let i = 0; i < path.length; i++) {
      if (path[i].x === robot.x && path[i].y === robot.y) {
        return i;
      }
    }
    return 0;
  }

  private completeTask(task: Task, robot: Robot): void {
    this.dbService.updateTask(task.id, {
      status: 'completed',
      completedAt: new Date().toISOString(),
    });

    this.dbService.updateRobot(robot.id, {
      status: 'idle',
      currentTaskId: undefined,
    });

    this.collisionDetector.removeRobot(robot.id);

    if (task.fromLocationId) {
      const location = this.dbService.getLocationById(task.fromLocationId);
      if (location) {
        const newQuantity = Math.max(0, location.quantity - task.quantity);
        this.dbService.updateLocation(task.fromLocationId, {
          quantity: newQuantity,
          status: newQuantity > 0 ? 'occupied' : 'empty',
        });
      }
    }

    this.checkWaveCompletion(task.waveId);

    this.wsService.broadcastTaskUpdate(this.dbService.getTaskById(task.id));
    this.wsService.broadcastRobotUpdate(this.dbService.getRobotById(robot.id));

    this.dbService.createLog({
      type: 'task',
      level: 'info',
      message: `Task ${task.id} completed`,
      relatedId: task.id,
    });
  }

  private checkWaveCompletion(waveId: string | undefined): void {
    if (!waveId) return;

    const tasks = this.dbService.getTasks(undefined, waveId);
    const allCompleted = tasks.every((t) => t.status === 'completed');

    if (allCompleted) {
      this.dbService.updateWave(waveId, {
        status: 'completed',
        completedAt: new Date().toISOString(),
      });

      const wave = this.dbService.getWaveById(waveId);
      if (wave) {
        for (const orderId of wave.orderIds) {
          this.dbService.updateOrder(orderId, { status: 'completed' });
        }
        this.wsService.broadcastWaveUpdate(wave);
      }

      this.dbService.createLog({
        type: 'system',
        level: 'info',
        message: `Wave ${waveId} completed`,
        relatedId: waveId,
      });
    }
  }

  private handleCollision(task: Task, robot: Robot): void {
    this.dbService.createException({
      type: 'path_conflict',
      severity: 'medium',
      status: 'open',
      message: `Path conflict detected for robot ${robot.name}`,
      relatedId: robot.id,
      relatedType: 'robot',
    });

    if (this.taskScheduler) {
      const locations = this.dbService.getLocations();
      const congestionPoints = this.collisionDetector
        .getCongestionPoints(robot.floorId)
        .map((cp) => ({ x: cp.x, y: cp.y }));

      const newPath = this.taskScheduler.replanPath(task, robot, locations, congestionPoints);

      this.dbService.updateTask(task.id, { path: newPath });
      this.wsService.broadcastTaskUpdate(this.dbService.getTaskById(task.id));
    }
  }

  private detectCongestion(): void {
    const floors = this.dbService.getFloors();
    for (const floor of floors) {
      const congestionPoints = this.collisionDetector.getCongestionPoints(floor.id);
      for (const point of congestionPoints) {
        const severity = point.robotCount >= 4 ? 'high' : point.robotCount >= 3 ? 'medium' : 'low';
        this.dbService.createCongestionPoint({
          x: point.x,
          y: point.y,
          floorId: floor.id,
          severity,
          robotCount: point.robotCount,
        });

        if (severity === 'high') {
          this.wsService.broadcastCongestionAlert({
            floorId: floor.id,
            x: point.x,
            y: point.y,
            severity,
            robotCount: point.robotCount,
          });

          this.dbService.createException({
            type: 'congestion',
            severity: 'high',
            status: 'open',
            message: `High congestion detected at (${point.x}, ${point.y}) on floor ${floor.name}`,
            details: { x: point.x, y: point.y, robotCount: point.robotCount },
          });
        }
      }
    }
  }

  public cancelTask(taskId: string): Task | undefined {
    const task = this.dbService.getTaskById(taskId);
    if (!task) return undefined;

    if (task.status === 'completed' || task.status === 'cancelled') {
      return task;
    }

    this.dbService.updateTask(taskId, { status: 'cancelled' });

    if (task.robotId) {
      const robot = this.dbService.getRobotById(task.robotId);
      if (robot) {
        this.dbService.updateRobot(task.robotId, {
          status: 'idle',
          currentTaskId: undefined,
        });
        this.collisionDetector.removeRobot(task.robotId);
        this.wsService.broadcastRobotUpdate(this.dbService.getRobotById(task.robotId));
      }
    }

    if (this.taskScheduler) {
      this.taskScheduler.unlockTask(taskId);
    }

    const updatedTask = this.dbService.getTaskById(taskId);
    if (updatedTask) {
      this.wsService.broadcastTaskUpdate(updatedTask);
    }

    this.dbService.createLog({
      type: 'task',
      level: 'warning',
      message: `Task ${taskId} cancelled`,
      relatedId: taskId,
    });

    return updatedTask;
  }

  public reassignTask(taskId: string, newRobotId: string): Task | undefined {
    const task = this.dbService.getTaskById(taskId);
    if (!task) return undefined;

    const oldRobotId = task.robotId;
    if (oldRobotId) {
      this.dbService.updateRobot(oldRobotId, {
        status: 'idle',
        currentTaskId: undefined,
      });
      this.collisionDetector.removeRobot(oldRobotId);
    }

    this.dbService.updateTask(taskId, {
      robotId: newRobotId,
      status: 'assigned',
    });

    this.dbService.updateRobot(newRobotId, {
      status: 'busy',
      currentTaskId: taskId,
    });

    const updatedTask = this.dbService.getTaskById(taskId);
    if (updatedTask) {
      this.wsService.broadcastTaskUpdate(updatedTask);
      this.wsService.broadcastRobotUpdate(this.dbService.getRobotById(newRobotId));
    }

    this.dbService.createLog({
      type: 'task',
      level: 'info',
      message: `Task ${taskId} reassigned to robot ${newRobotId}`,
      relatedId: taskId,
    });

    return updatedTask;
  }
}

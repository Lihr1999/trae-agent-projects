import type { Task, Robot, Location } from '../types';
import { AStarPathfinder } from './pathfinding';

export interface ScheduleResult {
  taskId: string;
  robotId: string;
  path: { x: number; y: number }[];
  estimatedTime: number;
}

export class TaskScheduler {
  private pathfinder: AStarPathfinder;
  private lockedTasks: Set<string> = new Set();

  constructor(width: number, height: number, racks: any[]) {
    this.pathfinder = new AStarPathfinder(width, height, racks);
  }

  public assignTasks(tasks: Task[], robots: Robot[], locations: Location[]): ScheduleResult[] {
    const results: ScheduleResult[] = [];
    const availableRobots = robots.filter((r) => r.status === 'idle' && r.battery > 20);
    const pendingTasks = tasks.filter((t) => t.status === 'pending' && !this.lockedTasks.has(t.id));

    pendingTasks.sort((a, b) => b.priority - a.priority);

    for (const task of pendingTasks) {
      if (availableRobots.length === 0) break;

      const bestRobot = this.findBestRobot(task, availableRobots, locations);
      if (bestRobot) {
        const path = this.calculatePath(task, bestRobot, locations);
        if (path.length > 0) {
          this.lockedTasks.add(task.id);
          results.push({
            taskId: task.id,
            robotId: bestRobot.id,
            path,
            estimatedTime: this.calculateEstimatedTime(path, bestRobot.speed),
          });

          const idx = availableRobots.indexOf(bestRobot);
          availableRobots.splice(idx, 1);
        }
      }
    }

    return results;
  }

  private findBestRobot(task: Task, robots: Robot[], locations: Location[]): Robot | null {
    let bestRobot: Robot | null = null;
    let bestScore = Infinity;

    const targetLocation = locations.find((l) => l.id === task.fromLocationId);
    if (!targetLocation) return null;

    for (const robot of robots) {
      const distance = Math.abs(robot.x - targetLocation.row) + Math.abs(robot.y - targetLocation.column);
      const batteryScore = 100 - robot.battery;
      const score = distance + batteryScore;

      if (score < bestScore) {
        bestScore = score;
        bestRobot = robot;
      }
    }

    return bestRobot;
  }

  private calculatePath(
    task: Task,
    robot: Robot,
    locations: Location[]
  ): { x: number; y: number }[] {
    const fromLocation = locations.find((l) => l.id === task.fromLocationId);
    const toLocation = locations.find((l) => l.id === task.toLocationId);

    if (!fromLocation) return [];

    const pathToPickup = this.pathfinder.findPath(
      Math.floor(robot.x),
      Math.floor(robot.y),
      fromLocation.column,
      fromLocation.row
    );

    if (toLocation) {
      const pathToDropoff = this.pathfinder.findPath(
        fromLocation.column,
        fromLocation.row,
        toLocation.column,
        toLocation.row
      );
      return [...pathToPickup, ...pathToDropoff.slice(1)];
    }

    return pathToPickup;
  }

  private calculateEstimatedTime(path: { x: number; y: number }[], speed: number): number {
    return path.length / speed;
  }

  public unlockTask(taskId: string): void {
    this.lockedTasks.delete(taskId);
  }

  public isTaskLocked(taskId: string): boolean {
    return this.lockedTasks.has(taskId);
  }

  public updatePathfinder(racks: any[]): void {
    this.pathfinder.updateObstacles(racks);
  }

  public replanPath(
    task: Task,
    robot: Robot,
    locations: Location[],
    congestionPoints: { x: number; y: number }[]
  ): { x: number; y: number }[] {
    const originalPath = task.path || [];
    const affectedSegment = this.findAffectedSegment(originalPath, congestionPoints);

    if (!affectedSegment) {
      return originalPath;
    }

    const fromLocation = locations.find((l) => l.id === task.fromLocationId);
    const toLocation = locations.find((l) => l.id === task.toLocationId);

    if (!fromLocation) return originalPath;

    const detourPath = this.pathfinder.findPath(
      affectedSegment.start.x,
      affectedSegment.start.y,
      toLocation?.column || fromLocation.column,
      toLocation?.row || fromLocation.row
    );

    return [...originalPath.slice(0, affectedSegment.startIndex), ...detourPath];
  }

  private findAffectedSegment(
    path: { x: number; y: number }[],
    congestionPoints: { x: number; y: number }[]
  ): { start: { x: number; y: number }; startIndex: number } | null {
    for (let i = 0; i < path.length; i++) {
      const point = path[i];
      if (congestionPoints.some((cp) => cp.x === point.x && cp.y === point.y)) {
        return {
          start: i > 0 ? path[i - 1] : point,
          startIndex: Math.max(0, i - 1),
        };
      }
    }
    return null;
  }
}

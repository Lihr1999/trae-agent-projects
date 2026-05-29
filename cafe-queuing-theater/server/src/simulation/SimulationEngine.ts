import { v4 as uuidv4 } from 'uuid';
import {
  SimulationConfig,
  SimulationState,
  DeltaState,
  Agent,
  Employee,
  Order,
  Seat,
  MapElement,
  EventLog,
  AnomalyInfo,
  AgentState,
  EmotionState,
  DEFAULT_CONFIG,
} from '../types';
import { Quadtree } from '../quadtree/Quadtree';
import { SocialForce, LBMFluid } from '../dynamics';
import { SIREpidemic } from '../emotion/SIREpidemic';
import { QueueNetwork, DeadlockDetector } from '../queuing';

interface DiscreteEvent {
  id: string;
  timestamp: number;
  type: string;
  payload: Record<string, any>;
  execute: () => void;
}

export class SimulationEngine {
  private config: SimulationConfig;
  private state: SimulationState;
  private quadtree: Quadtree;
  private socialForce: SocialForce;
  private lbmFluid: LBMFluid | null = null;
  private sirEpidemic: SIREpidemic;
  private queueNetwork: QueueNetwork;
  private deadlockDetector: DeadlockDetector;

  private eventQueue: DiscreteEvent[] = [];
  private lastTime: number = 0;
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  private currentFps: number = 0;

  private agentIdCounter: number = 0;
  private orderIdCounter: number = 0;

  private previousState: Partial<SimulationState> = {};
  private listeners: ((delta: DeltaState) => void)[] = [];

  constructor(config: Partial<SimulationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = this.createInitialState();

    this.quadtree = new Quadtree(
      { x: 0, y: 0, width: this.config.mapWidth, height: this.config.mapHeight },
      10,
      8
    );

    this.socialForce = new SocialForce(this.config.socialForce);
    this.sirEpidemic = new SIREpidemic(this.config.sirParams);
    this.queueNetwork = new QueueNetwork(this.config.queuingTopology);
    this.deadlockDetector = new DeadlockDetector(5000);
  }

  private createInitialState(): SimulationState {
    return {
      time: 0,
      running: false,
      speed: 1,
      agents: [],
      employees: [],
      orders: [],
      seats: [],
      queues: [],
      mapElements: [],
      flowField: null,
      heatMap: null,
      sirMatrix: null,
      deadlockInfo: {
        detected: false,
        timestamp: 0,
        involvedAgents: [],
        involvedSeats: [],
        waitGraph: [],
        seatUtilization: 0,
      },
      anomalies: [],
      statistics: {
        totalArrivals: 0,
        totalDepartures: 0,
        avgWaitTime: 0,
        avgServiceTime: 0,
        seatUtilization: 0,
        queueLengths: {},
        sirCounts: { S: 0, I: 0, R: 0 },
        quadtreeDepth: 0,
        fps: 0,
      },
      quadtreeSnapshot: null,
    };
  }

  public init(
    mapElements: MapElement[],
    seats: Seat[],
    employees: Omit<Employee, 'id'>[]
  ): void {
    this.state.mapElements = [...mapElements];
    this.state.seats = seats.map((s) => ({ ...s, occupied: 0, reserved: false }));
    this.state.employees = employees.map((e, i) => ({
      ...e,
      id: `emp-${Date.now()}-${i}`,
    }));

    this.lbmFluid = new LBMFluid(
      this.config.lbmParams,
      this.config.mapWidth,
      this.config.mapHeight,
      mapElements
    );

    this.state.queues = this.queueNetwork.getAllQueues();
  }

  public start(): void {
    this.state.running = true;
    this.lastTime = performance.now();
    this.scheduleNextArrival();
  }

  public pause(): void {
    this.state.running = false;
  }

  public reset(): void {
    this.state = this.createInitialState();
    this.eventQueue = [];
    this.quadtree.clear();
    this.queueNetwork.clear();
    this.deadlockDetector.reset();
    this.agentIdCounter = 0;
    this.orderIdCounter = 0;
    this.frameCount = 0;
  }

  public step(): void {
    if (!this.state.running) return;

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1) * this.state.speed;
    this.lastTime = now;

    this.state.time += dt;
    this.frameCount++;

    if (now - this.lastFpsUpdate >= 1000) {
      this.currentFps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsUpdate = now;
      this.state.statistics.fps = this.currentFps;
    }

    this.processDiscreteEvents();
    this.updateAgents(dt);
    this.updateEmployees(dt);
    this.updateQueues();
    this.updateFluidDynamics();
    this.updateEmotionDynamics(dt);
    this.detectAnomalies();
    this.updateStatistics();

    const delta = this.computeDelta();
    this.notifyListeners(delta);

    this.previousState = { ...this.state };
  }

  private processDiscreteEvents(): void {
    const now = this.state.time;
    const dueEvents = this.eventQueue.filter((e) => e.timestamp <= now);
    this.eventQueue = this.eventQueue.filter((e) => e.timestamp > now);

    for (const event of dueEvents) {
      event.execute();
      this.addEventLog(event.type, event.payload);
    }
  }

  private scheduleNextArrival(): void {
    const lambda = this.getCurrentLambda();
    const interarrivalTime = -Math.log(Math.random()) / lambda;
    const arrivalTime = this.state.time + interarrivalTime;

    this.scheduleEvent(arrivalTime, 'agent_arrival', {}, () => {
      this.spawnAgentGroup();
      if (this.state.running && this.state.agents.length < this.config.maxAgents) {
        this.scheduleNextArrival();
      }
    });
  }

  private getCurrentLambda(): number {
    const timeOfDay = (this.state.time % 3600) / 60;
    let lambda = this.config.arrivalModel.lambda;

    for (const peak of this.config.arrivalModel.peakHours) {
      if (timeOfDay >= peak.start && timeOfDay <= peak.end) {
        lambda *= peak.multiplier;
        break;
      }
    }

    return lambda;
  }

  private spawnAgentGroup(): void {
    const groupSize = this.sampleGroupSize();
    const groupId = groupSize > 1 ? `group-${uuidv4()}` : undefined;
    const color = this.getRandomColor();

    const entrance = this.state.mapElements.find((e) => e.type === 'entrance');
    if (!entrance) return;

    const spawnX = entrance.polygon[0].x + 30;
    const spawnY =
      entrance.polygon[0].y +
      (entrance.polygon[2].y - entrance.polygon[0].y) / 2;

    for (let i = 0; i < groupSize; i++) {
      const offsetX = (Math.random() - 0.5) * 30;
      const offsetY = (Math.random() - 0.5) * 30;

      const agent: Agent = {
        id: `agent-${++this.agentIdCounter}`,
        position: { x: spawnX + offsetX, y: spawnY + offsetY },
        velocity: { x: 0, y: 0 },
        desiredVelocity: { x: 1, y: 0 },
        target: { x: spawnX + 100, y: spawnY + offsetY },
        state: 'queuing',
        emotion: 'S',
        groupId,
        frustration: 0,
        patience: 0.8 + Math.random() * 0.4,
        size: 0.8 + Math.random() * 0.4,
        color,
      };

      this.state.agents.push(agent);
      this.quadtree.insert(agent);
      this.queueNetwork.enqueue('order', agent.id);
    }

    this.state.statistics.totalArrivals += groupSize;
  }

  private sampleGroupSize(): number {
    const r = Math.random();
    const dist = this.config.arrivalModel.groupSizeDistribution;
    let cumulative = 0;

    for (let i = 0; i < dist.length; i++) {
      cumulative += dist[i];
      if (r < cumulative) {
        return i + 1;
      }
    }

    return 1;
  }

  private getRandomColor(): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  private updateAgents(dt: number): void {
    this.updateAgentTargets();

    const forces = this.socialForce.computeForces(
      this.state.agents,
      this.state.mapElements,
      dt
    );

    const updatedAgents = this.socialForce.updateAgents(
      this.state.agents,
      forces,
      dt
    );

    for (let i = 0; i < updatedAgents.length; i++) {
      const agent = updatedAgents[i];

      agent.position.x = Math.max(10, Math.min(this.config.mapWidth - 10, agent.position.x));
      agent.position.y = Math.max(10, Math.min(this.config.mapHeight - 10, agent.position.y));

      this.quadtree.update(agent);

      if (agent.state === 'leaving' && agent.position.x > this.config.mapWidth - 20) {
        this.removeAgent(agent.id);
      }

      if (agent.emotion === 'R' && agent.state !== 'leaving') {
        agent.state = 'leaving';
        agent.target = { x: this.config.mapWidth + 50, y: agent.position.y };
        this.queueNetwork.dequeue('order', agent.id);
        this.queueNetwork.dequeue('pickup', agent.id);
        this.queueNetwork.dequeue('roaming', agent.id);

        if (agent.seatId) {
          this.releaseSeat(agent.seatId, agent.id);
        }
      }
    }

    this.state.agents = updatedAgents.filter((a) => this.state.agents.some((orig) => orig.id === a.id));
  }

  private updateAgentTargets(): void {
    for (const agent of this.state.agents) {
      if (agent.state === 'queuing') {
        const queueType = this.queueNetwork.getAgentQueue(agent.id);
        if (queueType === 'order') {
          const bar = this.state.mapElements.find((e) => e.type === 'bar');
          if (bar) {
            agent.target = {
              x: bar.polygon[0].x + (bar.polygon[1].x - bar.polygon[0].x) / 2,
              y: bar.polygon[0].y + (bar.polygon[2].y - bar.polygon[0].y) / 2 + 50,
            };
          }
        }
      } else if (agent.state === 'waiting') {
        agent.target = {
          x: this.config.mapWidth / 2 + (Math.random() - 0.5) * 100,
          y: this.config.mapHeight / 2 + (Math.random() - 0.5) * 100,
        };
      } else if (agent.state === 'roaming' || agent.state === 'seating') {
        if (!agent.seatId) {
          const availableSeat = this.findAvailableSeat(agent);
          if (availableSeat) {
            agent.target = { ...availableSeat.position };
          } else {
            agent.target = {
              x: this.config.mapWidth / 2 + (Math.random() - 0.5) * 200,
              y: this.config.mapHeight * 0.7 + (Math.random() - 0.5) * 100,
            };
          }
        }
      }

      if (agent.groupId && agent.state !== 'leaving') {
        const groupMembers = this.state.agents.filter(
          (a) => a.groupId === agent.groupId && a.id !== agent.id
        );
        if (groupMembers.length > 0) {
          const centerX = groupMembers.reduce((sum, a) => sum + a.position.x, 0) / groupMembers.length;
          const centerY = groupMembers.reduce((sum, a) => sum + a.position.y, 0) / groupMembers.length;
          agent.target.x = agent.target.x * 0.7 + centerX * 0.3;
          agent.target.y = agent.target.y * 0.7 + centerY * 0.3;
        }
      }
    }
  }

  private findAvailableSeat(agent: Agent): Seat | null {
    const groupSize = agent.groupId
      ? this.state.agents.filter((a) => a.groupId === agent.groupId).length
      : 1;

    for (const seat of this.state.seats) {
      if (seat.reserved) continue;
      const available = seat.capacity - seat.occupied;
      if (available >= groupSize) {
        if (agent.groupId) {
          if (seat.groupId && seat.groupId !== agent.groupId) continue;
        }
        return seat;
      }
    }

    return null;
  }

  private releaseSeat(seatId: string, agentId: string): void {
    const seat = this.state.seats.find((s) => s.id === seatId);
    if (seat) {
      seat.occupied = Math.max(0, seat.occupied - 1);
      if (seat.occupied === 0) {
        seat.groupId = undefined;
        seat.reserved = false;
      }

      const agent = this.state.agents.find((a) => a.id === agentId);
      if (agent) {
        agent.seatId = undefined;
      }
    }
  }

  private assignSeat(agent: Agent, seat: Seat): boolean {
    const groupSize = agent.groupId
      ? this.state.agents.filter((a) => a.groupId === agent.groupId).length
      : 1;

    if (seat.capacity - seat.occupied < groupSize) return false;

    seat.occupied += groupSize;
    if (agent.groupId) {
      seat.groupId = agent.groupId;
    }

    agent.seatId = seat.id;
    agent.state = 'seating';

    const groupMembers = this.state.agents.filter(
      (a) => a.groupId === agent.groupId && a.id !== agent.id
    );
    for (const member of groupMembers) {
      member.seatId = seat.id;
      member.state = 'seating';
    }

    this.addEventLog('seat_assigned', {
      agentId: agent.id,
      seatId: seat.id,
      groupId: agent.groupId,
      groupSize,
    });

    return true;
  }

  private updateEmployees(dt: number): void {
    for (const employee of this.state.employees) {
      if (employee.currentOrder) {
        const order = this.state.orders.find((o) => o.id === employee.currentOrder);
        if (order && order.status === 'preparing') {
          const effectiveDt = dt * employee.efficiency * (1 - employee.fatigue * 0.5);
          order.complexity -= effectiveDt;

          employee.processingTime += dt;
          employee.fatigue = Math.min(1, employee.fatigue + this.config.employeeConfig.baseFatigueRate * dt);
          employee.efficiency = Math.max(0.3, 1 - employee.fatigue * 0.7);

          if (employee.fatigue > this.config.employeeConfig.fatigueThreshold) {
            this.addAnomaly('employee_fatigue', 'medium', '员工疲劳度超标', {
              employeeId: employee.id,
              fatigue: employee.fatigue,
            });
          }

          if (order.complexity <= 0) {
            order.status = 'ready';
            order.completedAt = this.state.time;
            employee.currentOrder = undefined;
            employee.processingTime = 0;
            this.queueNetwork.releaseServer('order', order.agentId);

            const agent = this.state.agents.find((a) => a.id === order.agentId);
            if (agent) {
              agent.state = 'waiting';
              this.queueNetwork.enqueue('pickup', agent.id);
            }
          }
        }
      } else {
        const assignedEmployee = this.queueNetwork.assignServer('order', this.state.employees);
        if (assignedEmployee && assignedEmployee.id === employee.id) {
          const nextAgentId = this.queueNetwork.getNextAgent('order');
          if (nextAgentId) {
            const agent = this.state.agents.find((a) => a.id === nextAgentId);
            if (agent) {
              agent.state = 'ordering';
              const order: Order = {
                id: `order-${++this.orderIdCounter}`,
                agentId: agent.id,
                type: ['coffee', 'tea', 'sandwich', 'dessert'][Math.floor(Math.random() * 4)],
                complexity: 5 + Math.random() * 10,
                status: 'preparing',
                createdAt: this.state.time,
                startedAt: this.state.time,
                employeeId: employee.id,
              };
              this.state.orders.push(order);
              agent.orderId = order.id;
              employee.currentOrder = order.id;
            }
          }
        }

        employee.fatigue = Math.max(0, employee.fatigue - this.config.employeeConfig.recoveryRate * dt);
        employee.efficiency = Math.max(0.3, 1 - employee.fatigue * 0.7);
      }

      const homeDistance = Math.sqrt(
        Math.pow(employee.position.x - employee.station.x, 2) +
        Math.pow(employee.position.y - employee.station.y, 2)
      );
      if (homeDistance > 5) {
        const dx = employee.station.x - employee.position.x;
        const dy = employee.station.y - employee.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        employee.position.x += (dx / dist) * 0.5 * dt * 60;
        employee.position.y += (dy / dist) * 0.5 * dt * 60;
      }
    }

    for (const employee of this.state.employees) {
      if (!employee.currentOrder) {
        const pickupAgentId = this.queueNetwork.getNextAgent('pickup');
        if (pickupAgentId) {
          const order = this.state.orders.find(
            (o) => o.agentId === pickupAgentId && o.status === 'ready'
          );
          if (order) {
            order.status = 'delivered';
            this.queueNetwork.dequeue('pickup', pickupAgentId);

            const agent = this.state.agents.find((a) => a.id === pickupAgentId);
            if (agent) {
              agent.state = 'roaming';
              this.queueNetwork.enqueue('roaming', agent.id);
            }
          }
        }
      }
    }
  }

  private updateQueues(): void {
    this.state.queues = this.queueNetwork.getAllQueues();

    for (const agent of this.state.agents) {
      if (agent.state === 'roaming' && !agent.seatId) {
        const seat = this.findAvailableSeat(agent);
        if (seat) {
          const dist = Math.sqrt(
            Math.pow(agent.position.x - seat.position.x, 2) +
            Math.pow(agent.position.y - seat.position.y, 2)
          );
          if (dist < 20) {
            this.assignSeat(agent, seat);
            this.queueNetwork.dequeue('roaming', agent.id);
          }
        }
      }
    }

    if (this.config.deadlockDetection) {
      const deadlockInfo = this.deadlockDetector.detectDeadlock(
        this.state.agents,
        this.state.seats,
        this.state.time
      );

      if (deadlockInfo.detected) {
        this.state.deadlockInfo = deadlockInfo;
        this.addAnomaly(
          'deadlock_detected',
          'critical',
          '拼桌死锁检测',
          deadlockInfo
        );
      }
    }
  }

  private updateFluidDynamics(): void {
    if (!this.lbmFluid) return;

    this.lbmFluid.applyAgentForces(this.state.agents);
    this.lbmFluid.step();

    this.state.flowField = this.lbmFluid.getGrid();

    const reynolds = this.lbmFluid.computeReynoldsNumber();
    if (reynolds > 2000) {
      this.addAnomaly('high_reynolds', 'high', '高雷诺数湍流', { reynolds });
    }

    const turbulence = this.lbmFluid.detectTurbulence();
    if (turbulence.length > 5) {
      this.addAnomaly('turbulence', 'medium', '人流湍流检测', {
        turbulenceCount: turbulence.length,
        points: turbulence,
      });
    }
  }

  private updateEmotionDynamics(dt: number): void {
    for (const agent of this.state.agents) {
      if (agent.state === 'queuing' || agent.state === 'waiting') {
        agent.patience = Math.max(0, agent.patience - 0.001 * dt);
        if (agent.patience < 0.3) {
          agent.frustration = Math.min(1, agent.frustration + 0.002 * dt);
        }
      }
    }

    this.sirEpidemic.step(this.state.agents, dt);

    this.state.heatMap = this.sirEpidemic.generateHeatMap(
      this.state.agents,
      this.config.mapWidth,
      this.config.mapHeight,
      20
    );

    this.state.sirMatrix = this.sirEpidemic.buildAdjacencyMatrix(
      this.state.agents,
      this.config.sirParams.infectionRadius
    );

    if (this.sirEpidemic.detectAvalanche(this.state.agents)) {
      this.addAnomaly('emotional_avalanche', 'critical', '情绪雪崩检测', {
        sCount: this.state.agents.filter((a) => a.emotion === 'S').length,
        iCount: this.state.agents.filter((a) => a.emotion === 'I').length,
        rCount: this.state.agents.filter((a) => a.emotion === 'R').length,
      });
    }
  }

  private detectAnomalies(): void {
    if (!this.config.anomalyDetection) return;

    const jitteringAgents = this.socialForce.detectLocalExtrema(this.state.agents);
    if (jitteringAgents.length > 0) {
      this.addAnomaly('local_extrema', 'medium', 'Agent局部极值抖动', {
        agentIds: jitteringAgents,
      });
    }

    const quadtreeAnomalies = this.quadtree.getAnomalies();
    for (const anomaly of quadtreeAnomalies) {
      this.addAnomaly(anomaly.type, 'high', anomaly.description, anomaly.data);
    }

    this.state.quadtreeSnapshot = this.quadtree.getSnapshot();
    this.state.statistics.quadtreeDepth = this.state.quadtreeSnapshot.maxDepth;

    if (this.state.quadtreeSnapshot.maxDepth > 6) {
      this.addAnomaly('quadtree_depth_imbalance', 'high', '四叉树深度失衡', {
        maxDepth: this.state.quadtreeSnapshot.maxDepth,
        distribution: this.state.quadtreeSnapshot.depthDistribution,
      });
    }
  }

  private updateStatistics(): void {
    const sCount = this.state.agents.filter((a) => a.emotion === 'S').length;
    const iCount = this.state.agents.filter((a) => a.emotion === 'I').length;
    const rCount = this.state.agents.filter((a) => a.emotion === 'R').length;

    this.state.statistics.sirCounts = { S: sCount, I: iCount, R: rCount };

    const queueStats = this.queueNetwork.getQueueStats();
    this.state.statistics.queueLengths = {};
    for (const [id, stats] of Object.entries(queueStats)) {
      this.state.statistics.queueLengths[id] = stats.waiting;
    }

    const totalCapacity = this.state.seats.reduce((sum, s) => sum + s.capacity, 0);
    const totalOccupied = this.state.seats.reduce((sum, s) => sum + s.occupied, 0);
    this.state.statistics.seatUtilization = totalCapacity > 0 ? totalOccupied / totalCapacity : 0;

    const completedOrders = this.state.orders.filter((o) => o.completedAt);
    if (completedOrders.length > 0) {
      const totalServiceTime = completedOrders.reduce(
        (sum, o) => sum + ((o.completedAt || 0) - (o.startedAt || 0)),
        0
      );
      this.state.statistics.avgServiceTime = totalServiceTime / completedOrders.length;

      const totalWaitTime = completedOrders.reduce(
        (sum, o) => sum + ((o.startedAt || 0) - o.createdAt),
        0
      );
      this.state.statistics.avgWaitTime = totalWaitTime / completedOrders.length;
    }
  }

  private removeAgent(agentId: string): void {
    const index = this.state.agents.findIndex((a) => a.id === agentId);
    if (index !== -1) {
      const agent = this.state.agents[index];
      this.quadtree.remove(agentId);

      if (agent.seatId) {
        this.releaseSeat(agent.seatId, agentId);
      }

      this.state.agents.splice(index, 1);
      this.state.statistics.totalDepartures++;

      this.addEventLog('agent_departure', {
        agentId,
        frustration: agent.frustration,
        emotion: agent.emotion,
      });
    }
  }

  private scheduleEvent(
    timestamp: number,
    type: string,
    payload: Record<string, any>,
    execute: () => void
  ): void {
    this.eventQueue.push({
      id: `evt-${uuidv4()}`,
      timestamp,
      type,
      payload,
      execute,
    });

    this.eventQueue.sort((a, b) => a.timestamp - b.timestamp);
  }

  private addEventLog(eventType: string, payload: Record<string, any>): void {
    const event: EventLog = {
      id: `log-${uuidv4()}`,
      timestamp: this.state.time,
      eventType,
      payload,
    };
    this.state.anomalies = this.state.anomalies.filter(
      (a) => this.state.time - a.timestamp < 10
    );
  }

  private addAnomaly(
    type: string,
    severity: AnomalyInfo['severity'],
    description: string,
    data: Record<string, any>
  ): void {
    const existing = this.state.anomalies.find((a) => a.type === type);
    if (existing && this.state.time - existing.timestamp < 5) {
      existing.severity = severity;
      existing.data = { ...existing.data, ...data };
      return;
    }

    this.state.anomalies.push({
      type,
      timestamp: this.state.time,
      severity,
      description,
      data,
    });
  }

  private computeDelta(): DeltaState {
    const prev = this.previousState;
    const current = this.state;

    const delta: DeltaState = {
      time: current.time,
      updatedAgents: [],
      updatedEmployees: [],
      updatedOrders: [],
      updatedQueues: [],
      newEvents: [],
      anomalies: current.anomalies.filter(
        (a) => !prev.anomalies?.some((pa: AnomalyInfo) => pa.type === a.type)
      ),
      statistics: {},
    };

    for (const agent of current.agents) {
      const prevAgent = (prev.agents as Agent[])?.find((a: Agent) => a.id === agent.id);
      if (!prevAgent || this.hasChanged(agent, prevAgent)) {
        delta.updatedAgents.push({ ...agent });
      }
    }

    for (const employee of current.employees) {
      const prevEmp = (prev.employees as Employee[])?.find((e: Employee) => e.id === employee.id);
      if (!prevEmp || this.hasChanged(employee, prevEmp)) {
        delta.updatedEmployees.push({ ...employee });
      }
    }

    for (const order of current.orders) {
      const prevOrder = (prev.orders as Order[])?.find((o: Order) => o.id === order.id);
      if (!prevOrder || this.hasChanged(order, prevOrder)) {
        delta.updatedOrders.push({ ...order });
      }
    }

    for (const queue of current.queues) {
      const prevQueue = (prev.queues as typeof queue[])?.find((q: any) => q.id === queue.id);
      if (!prevQueue || this.hasChanged(queue, prevQueue)) {
        delta.updatedQueues.push({ ...queue });
      }
    }

    delta.statistics = {
      fps: current.statistics.fps,
      totalArrivals: current.statistics.totalArrivals,
      totalDepartures: current.statistics.totalDepartures,
      sirCounts: current.statistics.sirCounts,
      queueLengths: current.statistics.queueLengths,
      seatUtilization: current.statistics.seatUtilization,
      quadtreeDepth: current.statistics.quadtreeDepth,
    };

    return delta;
  }

  private hasChanged(obj1: any, obj2: any): boolean {
    return JSON.stringify(obj1) !== JSON.stringify(obj2);
  }

  public subscribe(listener: (delta: DeltaState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(delta: DeltaState): void {
    for (const listener of this.listeners) {
      listener(delta);
    }
  }

  public getState(): SimulationState {
    return { ...this.state };
  }

  public getConfig(): SimulationConfig {
    return { ...this.config };
  }

  public updateConfig(config: Partial<SimulationConfig>): void {
    this.config = { ...this.config, ...config };

    if (config.socialForce) {
      this.socialForce = new SocialForce(config.socialForce);
    }
    if (config.sirParams) {
      this.sirEpidemic.updateParams(config.sirParams);
    }
    if (config.queuingTopology) {
      this.queueNetwork.updateTopology(config.queuingTopology);
    }
    if (config.lbmParams && this.state.mapElements.length > 0) {
      this.lbmFluid = new LBMFluid(
        config.lbmParams,
        this.config.mapWidth,
        this.config.mapHeight,
        this.state.mapElements
      );
    }
  }

  public setSpeed(speed: number): void {
    this.state.speed = Math.max(0.1, Math.min(10, speed));
  }

  public getAnomalies(): AnomalyInfo[] {
    return [...this.state.anomalies];
  }

  public getDeadlockRecoverySuggestions(): string[] {
    if (!this.state.deadlockInfo.detected) return [];
    return this.deadlockDetector.getRecoverySuggestions(
      this.state.deadlockInfo,
      this.state.agents,
      this.state.seats
    );
  }
}

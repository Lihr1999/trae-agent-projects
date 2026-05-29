export interface Point {
  x: number;
  y: number;
}

export interface Vector {
  x: number;
  y: number;
}

export type MapElementType = 'bar' | 'seat' | 'entrance' | 'obstacle';

export interface MapElement {
  id: string;
  type: MapElementType;
  polygon: Point[];
  properties: Record<string, any>;
}

export type AgentState = 'queuing' | 'ordering' | 'waiting' | 'seating' | 'leaving' | 'roaming';
export type EmotionState = 'S' | 'I' | 'R';

export interface Agent {
  id: string;
  position: Point;
  velocity: Vector;
  desiredVelocity: Vector;
  target: Point;
  state: AgentState;
  emotion: EmotionState;
  groupId?: string;
  frustration: number;
  patience: number;
  orderId?: string;
  seatId?: string;
  size: number;
  color: string;
}

export interface Employee {
  id: string;
  position: Point;
  station: Point;
  skillMatrix: number[];
  fatigue: number;
  efficiency: number;
  currentOrder?: string;
  processingTime: number;
}

export interface Order {
  id: string;
  agentId: string;
  type: string;
  complexity: number;
  status: 'queued' | 'preparing' | 'ready' | 'delivered';
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  employeeId?: string;
}

export interface Seat {
  id: string;
  position: Point;
  capacity: number;
  occupied: number;
  groupId?: string;
  reserved: boolean;
}

export interface Queue {
  id: string;
  name: string;
  type: 'order' | 'pickup' | 'roaming';
  agents: string[];
  capacity: number;
  servers: number;
  servingAgents: string[];
}

export interface QueuingTopology {
  orderQueue: { servers: number; capacity: number };
  pickupQueue: { servers: number; capacity: number };
  roamingQueue: { capacity: number };
}

export interface ArrivalModel {
  lambda: number;
  groupSizeDistribution: number[];
  peakHours: { start: number; end: number; multiplier: number }[];
}

export interface SocialForceParams {
  A: number;
  B: number;
  k: number;
  kappa: number;
  tau: number;
  maxSpeed: number;
}

export interface LBMParams {
  relaxationTime: number;
  initialDensity: number;
  gridSize: number;
  viscosity: number;
}

export interface SIRParams {
  beta: number;
  gamma: number;
  infectionRadius: number;
  frustrationThreshold: number;
}

export interface EmployeeConfig {
  count: number;
  baseFatigueRate: number;
  recoveryRate: number;
  fatigueThreshold: number;
}

export interface SimulationConfig {
  id: string;
  name: string;
  mapWidth: number;
  mapHeight: number;
  queuingTopology: QueuingTopology;
  arrivalModel: ArrivalModel;
  socialForce: SocialForceParams;
  lbmParams: LBMParams;
  sirParams: SIRParams;
  employeeConfig: EmployeeConfig;
  timeStep: number;
  maxAgents: number;
  anomalyDetection: boolean;
  deadlockDetection: boolean;
}

export interface LBMGrid {
  density: number[][];
  velocity: Vector[][];
  populations: number[][][];
}

export interface HeatMap {
  resolution: number;
  values: number[][];
  timestamp: number;
}

export interface SIRMatrix {
  adjacency: boolean[][];
  agentIds: string[];
}

export interface QuadTreeSnapshot {
  timestamp: number;
  nodes: {
    boundary: { x: number; y: number; width: number; height: number };
    depth: number;
    agentCount: number;
  }[];
  depthDistribution: number[];
  maxDepth: number;
}

export interface DeadlockInfo {
  detected: boolean;
  timestamp: number;
  involvedAgents: string[];
  involvedSeats: string[];
  waitGraph: { from: string; to: string }[];
  seatUtilization: number;
}

export interface AnomalyInfo {
  type: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  data: Record<string, any>;
}

export interface EventLog {
  id: string;
  timestamp: number;
  eventType: string;
  payload: Record<string, any>;
}

export interface SimulationState {
  time: number;
  running: boolean;
  speed: number;
  agents: Agent[];
  employees: Employee[];
  orders: Order[];
  seats: Seat[];
  queues: Queue[];
  mapElements: MapElement[];
  flowField: LBMGrid | null;
  heatMap: HeatMap | null;
  sirMatrix: SIRMatrix | null;
  deadlockInfo: DeadlockInfo;
  anomalies: AnomalyInfo[];
  statistics: {
    totalArrivals: number;
    totalDepartures: number;
    avgWaitTime: number;
    avgServiceTime: number;
    seatUtilization: number;
    queueLengths: Record<string, number>;
    sirCounts: { S: number; I: number; R: number };
    quadtreeDepth: number;
    fps: number;
  };
  quadtreeSnapshot: QuadTreeSnapshot | null;
}

export interface DeltaState {
  time: number;
  updatedAgents: Partial<Agent>[];
  updatedEmployees: Partial<Employee>[];
  updatedOrders: Partial<Order>[];
  updatedQueues: Partial<Queue>[];
  newEvents: EventLog[];
  anomalies: AnomalyInfo[];
  statistics: Partial<SimulationState['statistics']>;
}

export interface PresetScenario {
  id: string;
  name: string;
  description: string;
  icon: string;
  config: Partial<SimulationConfig>;
  mapElements: MapElement[];
  seats: Seat[];
  employees: Omit<Employee, 'id'>[];
  anomalyTrigger?: string;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  config: SimulationConfig;
  mapElements: MapElement[];
  seats: Seat[];
}

export const DEFAULT_CONFIG: SimulationConfig = {
  id: 'default',
  name: 'Default Simulation',
  mapWidth: 800,
  mapHeight: 600,
  queuingTopology: {
    orderQueue: { servers: 2, capacity: 10 },
    pickupQueue: { servers: 2, capacity: 10 },
    roamingQueue: { capacity: 20 },
  },
  arrivalModel: {
    lambda: 0.5,
    groupSizeDistribution: [0.3, 0.4, 0.2, 0.1],
    peakHours: [],
  },
  socialForce: {
    A: 2000,
    B: 0.08,
    k: 1.2e5,
    kappa: 2.4e5,
    tau: 0.5,
    maxSpeed: 1.5,
  },
  lbmParams: {
    relaxationTime: 0.8,
    initialDensity: 1.0,
    gridSize: 20,
    viscosity: 0.1,
  },
  sirParams: {
    beta: 0.3,
    gamma: 0.1,
    infectionRadius: 50,
    frustrationThreshold: 0.7,
  },
  employeeConfig: {
    count: 3,
    baseFatigueRate: 0.001,
    recoveryRate: 0.0005,
    fatigueThreshold: 0.7,
  },
  timeStep: 0.05,
  maxAgents: 100,
  anomalyDetection: true,
  deadlockDetection: true,
};

export const LBM_WEIGHTS = [
  4 / 9,
  1 / 9, 1 / 9, 1 / 9, 1 / 9,
  1 / 36, 1 / 36, 1 / 36, 1 / 36,
];

export const LBM_DIRECTIONS: Vector[] = [
  { x: 0, y: 0 },
  { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 },
  { x: 1, y: 1 }, { x: -1, y: 1 }, { x: -1, y: -1 }, { x: 1, y: -1 },
];

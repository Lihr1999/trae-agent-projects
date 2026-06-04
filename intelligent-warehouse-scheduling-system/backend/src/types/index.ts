export interface Floor {
  id: string;
  name: string;
  level: number;
  width: number;
  height: number;
  createdAt: string;
  updatedAt: string;
}

export interface Rack {
  id: string;
  floorId: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rows: number;
  columns: number;
  createdAt: string;
  updatedAt: string;
}

export interface Location {
  id: string;
  rackId: string;
  code: string;
  row: number;
  column: number;
  level: number;
  status: 'empty' | 'occupied' | 'reserved' | 'blocked';
  skuId?: string;
  quantity: number;
  maxQuantity: number;
  createdAt: string;
  updatedAt: string;
}

export interface SKU {
  id: string;
  code: string;
  name: string;
  category: string;
  weight: number;
  volume: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  skuId: string;
  skuName: string;
  quantity: number;
  locationId?: string;
}

export interface Order {
  id: string;
  orderNo: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  items: OrderItem[];
  waveId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Wave {
  id: string;
  waveNo: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  orderIds: string[];
  robotIds: string[];
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
}

export type RobotStatus = 'idle' | 'busy' | 'charging' | 'error' | 'maintenance';

export interface Robot {
  id: string;
  name: string;
  floorId: string;
  status: RobotStatus;
  x: number;
  y: number;
  targetX?: number;
  targetY?: number;
  battery: number;
  currentTaskId?: string;
  speed: number;
  capacity: number;
  createdAt: string;
  updatedAt: string;
}

export interface PathNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent?: PathNode;
}

export interface Path {
  robotId: string;
  nodes: { x: number; y: number }[];
  taskId: string;
  createdAt: string;
}

export interface Task {
  id: string;
  waveId?: string;
  orderId?: string;
  robotId?: string;
  type: 'pick' | 'put' | 'move' | 'charge';
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'failed';
  fromLocationId?: string;
  toLocationId?: string;
  skuId?: string;
  quantity: number;
  priority: number;
  path?: { x: number; y: number }[];
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
}

export type ExceptionSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ExceptionStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface Exception {
  id: string;
  type: string;
  severity: ExceptionSeverity;
  status: ExceptionStatus;
  message: string;
  details?: any;
  relatedId?: string;
  relatedType?: string;
  handledBy?: string;
  resolution?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface LogEntry {
  id: string;
  type: 'system' | 'task' | 'robot' | 'user' | 'exception';
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  details?: any;
  relatedId?: string;
  createdAt: string;
}

export interface CongestionPoint {
  x: number;
  y: number;
  floorId: string;
  severity: 'low' | 'medium' | 'high';
  robotCount: number;
  createdAt: string;
}

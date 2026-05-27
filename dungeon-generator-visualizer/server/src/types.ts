export interface Position {
  x: number;
  y: number;
}

export interface Room {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  connected: boolean;
}

export interface Corridor {
  start: Position;
  end: Position;
  path: Position[];
}

export interface Door {
  x: number;
  y: number;
  roomId1: number;
  roomId2: number;
}

export interface Chest {
  x: number;
  y: number;
  roomId: number;
}

export interface Monster {
  x: number;
  y: number;
  roomId: number;
}

export interface Trap {
  x: number;
  y: number;
}

export interface BSPNode {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  left?: BSPNode;
  right?: BSPNode;
  room?: Room;
  isLeaf: boolean;
}

export enum TileType {
  WALL = 0,
  FLOOR = 1,
  CORRIDOR = 2,
  DOOR = 3,
  CHEST = 4,
  MONSTER = 5,
  TRAP = 6,
  START = 7,
  END = 8,
  CAVE_FLOOR = 9
}

export interface DungeonConfig {
  width: number;
  height: number;
  minRoomSize: number;
  maxRoomSize: number;
  minRooms: number;
  maxRooms: number;
  bspDepth: number;
  corridorBendiness: number;
  doorDensity: number;
  chestDensity: number;
  monsterDensity: number;
  trapDensity: number;
  seed: number;
  generatorType: 'bsp' | 'cave' | 'maze';
  caveFillProbability?: number;
  caveSmoothingIterations?: number;
}

export interface DungeonResult {
  config: DungeonConfig;
  tiles: TileType[][];
  rooms: Room[];
  corridors: Corridor[];
  doors: Door[];
  chests: Chest[];
  monsters: Monster[];
  traps: Trap[];
  bspTree?: BSPNode;
  generationSteps: GenerationStep[];
}

export interface GenerationStep {
  type: 'bsp_split' | 'room_grow' | 'corridor' | 'door' | 'cave' | 'maze';
  description: string;
  data: any;
}

export interface PathResult {
  algorithm: string;
  path: Position[];
  visited: Position[];
  nodesExpanded: number;
  pathLength: number;
  timeMs: number;
  openSetSize: number;
  closedSetSize: number;
  maxOpenSetSize: number;
  found: boolean;
}

export interface PathRequest {
  tiles: TileType[][];
  start: Position;
  end: Position;
  algorithm: 'astar' | 'dijkstra' | 'jps' | 'bfs';
  allowDiagonal?: boolean;
}

export interface DungeonSnapshot {
  id?: number;
  seed: number;
  config: string;
  tiles: string;
  createdAt: number;
}

export interface PathfindingStats {
  id?: number;
  snapshotId: number;
  algorithm: string;
  nodesExpanded: number;
  pathLength: number;
  timeMs: number;
  maxOpenSetSize: number;
  found: boolean;
  createdAt: number;
}

export interface PresetScenario {
  id: string;
  name: string;
  description: string;
  config: Partial<DungeonConfig>;
}

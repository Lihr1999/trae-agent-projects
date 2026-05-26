export interface CRDTIdentifier {
  siteId: string;
  clock: number;
}

export interface CRDTNode {
  id: CRDTIdentifier;
  value: string;
  tombstone: boolean;
  nextId: CRDTIdentifier | null;
}

export interface InsertOperation {
  type: 'insert';
  id: CRDTIdentifier;
  value: string;
  afterId: CRDTIdentifier | null;
  versionVector: VersionVector;
  siteId: string;
  timestamp: number;
}

export interface DeleteOperation {
  type: 'delete';
  targetId: CRDTIdentifier;
  versionVector: VersionVector;
  siteId: string;
  timestamp: number;
}

export type CRDTOperation = InsertOperation | DeleteOperation;

export interface VersionVector {
  [siteId: string]: number;
}

export interface Branch {
  id: string;
  name: string;
  parentBranchId: string | null;
  startVersion: VersionVector;
  createdAt: number;
  mergedAt: number | null;
}

export interface CursorPosition {
  siteId: string;
  position: number;
  selectionStart: number;
  selectionEnd: number;
}

export interface InitialState {
  text: string;
  nodes: CRDTNode[];
  versionVector: VersionVector;
  tombstoneCount: number;
  totalNodeCount: number;
  branches: Branch[];
  connectedClients: string[];
  cursorPositions: CursorPosition[];
}

export interface PresetInfo {
  id: string;
  name: string;
  description: string;
  anomalyType: string | null;
}

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

export interface DocumentSnapshot {
  id: string;
  documentId: string;
  nodes: CRDTNode[];
  versionVector: VersionVector;
  branchId: string;
  createdAt: number;
}

export interface OperationLog {
  id: string;
  documentId: string;
  operation: CRDTOperation;
  branchId: string;
  order: number;
}

export interface Preset {
  id: string;
  name: string;
  description: string;
  initialText: string;
  operations: CRDTOperation[];
  anomalyType: string | null;
}

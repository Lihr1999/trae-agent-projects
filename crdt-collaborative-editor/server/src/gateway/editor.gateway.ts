import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { CrdtService } from '../crdt/crdt.service';
import { DatabaseService } from '../database/database.service';
import { CRDTOperation } from '../crdt/crdt.types';
import { v4 as uuidv4 } from 'uuid';

interface CursorPosition {
  siteId: string;
  position: number;
  selectionStart: number;
  selectionEnd: number;
}

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
    credentials: true,
  },
  namespace: 'editor',
})
export class EditorGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private operationOrder: number = 0;
  private cursorPositions: Map<string, CursorPosition> = new Map();
  private readonly DEFAULT_DOCUMENT_ID = 'main-doc';

  constructor(
    private readonly crdtService: CrdtService,
    private readonly databaseService: DatabaseService,
  ) {
    this.databaseService.createDocument(this.DEFAULT_DOCUMENT_ID, 'Main Document');
    this.databaseService.createBranch({
      id: 'main-branch',
      documentId: this.DEFAULT_DOCUMENT_ID,
      name: 'main',
      parentBranchId: null,
      startVersion: {},
      createdAt: Date.now(),
      mergedAt: null,
    });
  }

  handleConnection(client: Socket) {
    const siteId = client.handshake.query.siteId as string;
    if (siteId) {
      this.databaseService.addConnectedClient(siteId, this.DEFAULT_DOCUMENT_ID);
      client.join(this.DEFAULT_DOCUMENT_ID);

      const state = {
        text: this.crdtService.getText(),
        nodes: this.crdtService.getNodes(),
        versionVector: this.crdtService.getVersionVector(),
        tombstoneCount: this.crdtService.getTombstoneCount(),
        totalNodeCount: this.crdtService.getTotalNodeCount(),
        branches: this.databaseService.getBranches(this.DEFAULT_DOCUMENT_ID),
        connectedClients: this.databaseService.getConnectedClients(this.DEFAULT_DOCUMENT_ID),
        cursorPositions: Array.from(this.cursorPositions.values()),
      };

      client.emit('initial-state', state);
      this.broadcastClientList();
    }
  }

  handleDisconnect(client: Socket) {
    const siteId = client.handshake.query.siteId as string;
    if (siteId) {
      this.databaseService.removeConnectedClient(siteId);
      this.cursorPositions.delete(siteId);
      this.broadcastClientList();
    }
  }

  @SubscribeMessage('operation')
  handleOperation(
    @MessageBody() data: { operation: CRDTOperation; simulateDelay?: number },
    @ConnectedSocket() client: Socket,
  ): void {
    const { operation, simulateDelay } = data;

    const applyOp = () => {
      const applied = this.crdtService.applyOperation(operation);

      if (applied) {
        this.operationOrder++;
        this.databaseService.insertOperationLog({
          documentId: this.DEFAULT_DOCUMENT_ID,
          branchId: 'main-branch',
          operation,
          order: this.operationOrder,
        });

        if (this.operationOrder % 50 === 0) {
          this.databaseService.saveSnapshot({
            id: uuidv4(),
            documentId: this.DEFAULT_DOCUMENT_ID,
            branchId: 'main-branch',
            nodes: this.crdtService.getNodes(),
            versionVector: this.crdtService.getVersionVector(),
            createdAt: Date.now(),
          });
        }

        client.to(this.DEFAULT_DOCUMENT_ID).emit('operation', {
          operation,
          text: this.crdtService.getText(),
          tombstoneCount: this.crdtService.getTombstoneCount(),
          totalNodeCount: this.crdtService.getTotalNodeCount(),
        });

        client.emit('operation-ack', {
          operationId: operation.type === 'insert' ? operation.id : operation.targetId,
          versionVector: this.crdtService.getVersionVector(),
        });
      }
    };

    if (simulateDelay && simulateDelay > 0) {
      setTimeout(applyOp, simulateDelay);
    } else {
      applyOp();
    }
  }

  @SubscribeMessage('bulk-operations')
  handleBulkOperations(
    @MessageBody() data: { operations: CRDTOperation[]; delay?: number },
    @ConnectedSocket() client: Socket,
  ): void {
    const { operations, delay = 50 } = data;
    let index = 0;

    const applyNext = () => {
      if (index < operations.length) {
        const operation = operations[index];
        const applied = this.crdtService.applyOperation(operation);

        if (applied) {
          this.operationOrder++;
          this.databaseService.insertOperationLog({
            documentId: this.DEFAULT_DOCUMENT_ID,
            branchId: 'main-branch',
            operation,
            order: this.operationOrder,
          });

          this.server.to(this.DEFAULT_DOCUMENT_ID).emit('operation', {
            operation,
            text: this.crdtService.getText(),
            tombstoneCount: this.crdtService.getTombstoneCount(),
            totalNodeCount: this.crdtService.getTotalNodeCount(),
          });
        }

        index++;
        setTimeout(applyNext, delay);
      } else {
        client.emit('bulk-operations-complete', {
          versionVector: this.crdtService.getVersionVector(),
          text: this.crdtService.getText(),
          tombstoneCount: this.crdtService.getTombstoneCount(),
          totalNodeCount: this.crdtService.getTotalNodeCount(),
          nodes: this.crdtService.getNodes(),
        });
      }
    };

    applyNext();
  }

  @SubscribeMessage('cursor-update')
  handleCursorUpdate(
    @MessageBody() data: CursorPosition,
    @ConnectedSocket() client: Socket,
  ): void {
    this.cursorPositions.set(data.siteId, data);
    client.to(this.DEFAULT_DOCUMENT_ID).emit('cursor-update', data);
  }

  @SubscribeMessage('create-branch')
  handleCreateBranch(
    @MessageBody() data: { name: string; parentBranchId: string | null },
  ): void {
    const branchId = uuidv4();
    this.databaseService.createBranch({
      id: branchId,
      documentId: this.DEFAULT_DOCUMENT_ID,
      name: data.name,
      parentBranchId: data.parentBranchId,
      startVersion: this.crdtService.getVersionVector(),
      createdAt: Date.now(),
      mergedAt: null,
    });

    this.server.to(this.DEFAULT_DOCUMENT_ID).emit('branch-created', {
      id: branchId,
      name: data.name,
      parentBranchId: data.parentBranchId,
      startVersion: this.crdtService.getVersionVector(),
      createdAt: Date.now(),
    });
  }

  @SubscribeMessage('merge-branch')
  handleMergeBranch(@MessageBody() data: { branchId: string }): void {
    this.databaseService.mergeBranch(data.branchId);
    this.server.to(this.DEFAULT_DOCUMENT_ID).emit('branch-merged', {
      branchId: data.branchId,
      mergedAt: Date.now(),
    });
  }

  @SubscribeMessage('reset-document')
  handleResetDocument(): void {
    this.crdtService.clear();
    this.operationOrder = 0;
    this.databaseService.clearAllData();
    this.databaseService.createDocument(this.DEFAULT_DOCUMENT_ID, 'Main Document');
    this.databaseService.createBranch({
      id: 'main-branch',
      documentId: this.DEFAULT_DOCUMENT_ID,
      name: 'main',
      parentBranchId: null,
      startVersion: {},
      createdAt: Date.now(),
      mergedAt: null,
    });
    this.cursorPositions.clear();

    this.server.to(this.DEFAULT_DOCUMENT_ID).emit('document-reset', {
      text: '',
      nodes: [],
      versionVector: {},
      tombstoneCount: 0,
      totalNodeCount: 0,
    });
  }

  @SubscribeMessage('get-stats')
  handleGetStats(@ConnectedSocket() client: Socket): void {
    client.emit('stats', {
      text: this.crdtService.getText(),
      versionVector: this.crdtService.getVersionVector(),
      tombstoneCount: this.crdtService.getTombstoneCount(),
      totalNodeCount: this.crdtService.getTotalNodeCount(),
      operationCount: this.operationOrder,
    });
  }

  private broadcastClientList(): void {
    const clients = this.databaseService.getConnectedClients(this.DEFAULT_DOCUMENT_ID);
    this.server.to(this.DEFAULT_DOCUMENT_ID).emit('clients-update', clients);
  }
}

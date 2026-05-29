import { WebSocketServer as WsServer, WebSocket } from 'ws';
import http from 'http';
import { v4 as uuidv4 } from 'uuid';
import { DeltaState, SimulationState } from '../types';

interface Client {
  id: string;
  ws: WebSocket;
  projectId: string | null;
  subscribed: boolean;
}

type MessageType =
  | 'hello'
  | 'subscribe'
  | 'unsubscribe'
  | 'command'
  | 'config_update'
  | 'full_state'
  | 'delta_state'
  | 'error'
  | 'ping'
  | 'pong';

interface WsMessage {
  type: MessageType;
  payload?: any;
  id?: string;
}

export class WebSocketServer {
  private wss: WsServer;
  private clients: Map<string, Client> = new Map();
  private stateBroadcaster: ReturnType<typeof setInterval> | null = null;
  private lastBroadcastTime: number = 0;
  private broadcastInterval: number = 16;

  constructor(server: http.Server) {
    this.wss = new WsServer({ server, path: '/ws' });
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      const clientId = uuidv4();
      const client: Client = {
        id: clientId,
        ws,
        projectId: null,
        subscribed: false,
      };

      this.clients.set(clientId, client);
      console.log(`[WS] Client connected: ${clientId}`);

      this.send(clientId, { type: 'hello', payload: { clientId, timestamp: Date.now() } });

      ws.on('message', (data: Buffer) => {
        this.handleMessage(clientId, data.toString());
      });

      ws.on('close', () => {
        this.handleDisconnect(clientId);
      });

      ws.on('error', (error) => {
        console.error(`[WS] Client ${clientId} error:`, error);
        this.handleDisconnect(clientId);
      });
    });

    this.wss.on('error', (error) => {
      console.error('[WS] Server error:', error);
    });
  }

  private handleMessage(clientId: string, data: string): void {
    try {
      const message: WsMessage = JSON.parse(data);
      const client = this.clients.get(clientId);
      if (!client) return;

      switch (message.type) {
        case 'hello':
          this.send(clientId, { type: 'hello', payload: { clientId, timestamp: Date.now() } });
          break;
        case 'subscribe':
          this.handleSubscribe(clientId, message.payload);
          break;
        case 'unsubscribe':
          this.handleUnsubscribe(clientId);
          break;
        case 'command':
          this.handleCommand(clientId, message.payload);
          break;
        case 'config_update':
          this.handleConfigUpdate(clientId, message.payload);
          break;
        case 'ping':
          this.send(clientId, { type: 'pong', payload: { timestamp: Date.now() } });
          break;
        default:
          this.send(clientId, {
            type: 'error',
            payload: { message: `Unknown message type: ${message.type}` },
            id: message.id,
          });
      }
    } catch (error) {
      console.error('[WS] Message parsing error:', error);
      this.send(clientId, {
        type: 'error',
        payload: { message: 'Invalid JSON message' },
      });
    }
  }

  private handleSubscribe(clientId: string, payload: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.projectId = payload?.projectId || 'default';
    client.subscribed = true;

    console.log(`[WS] Client ${clientId} subscribed to project ${client.projectId}`);

    if (this.onSubscribe) {
      this.onSubscribe(clientId, client.projectId || 'default');
    }
  }

  private handleUnsubscribe(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.subscribed = false;
    console.log(`[WS] Client ${clientId} unsubscribed`);
  }

  private handleCommand(clientId: string, payload: any): void {
    if (!this.onCommand) return;

    const { command, params } = payload;
    this.onCommand(clientId, command, params);
  }

  private handleConfigUpdate(clientId: string, payload: any): void {
    if (!this.onConfigUpdate) return;

    const { projectId, config } = payload;
    this.onConfigUpdate(clientId, projectId, config);
  }

  private handleDisconnect(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    if (this.onDisconnect) {
      this.onDisconnect(clientId, client.projectId);
    }

    this.clients.delete(clientId);
    console.log(`[WS] Client disconnected: ${clientId}`);
  }

  private send(clientId: string, message: WsMessage): void {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) return;

    try {
      client.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error(`[WS] Failed to send to ${clientId}:`, error);
    }
  }

  private broadcast(message: WsMessage, projectId?: string): void {
    const data = JSON.stringify(message);

    for (const client of this.clients.values()) {
      if (client.ws.readyState !== WebSocket.OPEN) continue;
      if (!client.subscribed) continue;
      if (projectId && client.projectId !== projectId) continue;

      try {
        client.ws.send(data);
      } catch (error) {
        console.error(`[WS] Broadcast failed for ${client.id}:`, error);
      }
    }
  }

  public broadcastFullState(state: SimulationState, projectId?: string): void {
    this.broadcast(
      {
        type: 'full_state',
        payload: state,
      },
      projectId
    );
  }

  public broadcastDelta(delta: DeltaState, projectId?: string): void {
    const now = performance.now();
    if (now - this.lastBroadcastTime < this.broadcastInterval) return;
    this.lastBroadcastTime = now;

    this.broadcast(
      {
        type: 'delta_state',
        payload: delta,
      },
      projectId
    );
  }

  public sendToClient(clientId: string, type: MessageType, payload: any, id?: string): void {
    this.send(clientId, { type, payload, id });
  }

  public sendError(clientId: string, message: string, id?: string): void {
    this.send(clientId, {
      type: 'error',
      payload: { message },
      id,
    });
  }

  public startBroadcastLoop(getState: () => DeltaState | null, projectId?: string): void {
    if (this.stateBroadcaster) {
      clearInterval(this.stateBroadcaster);
    }

    this.stateBroadcaster = setInterval(() => {
      const delta = getState();
      if (delta) {
        this.broadcastDelta(delta, projectId);
      }
    }, this.broadcastInterval);
  }

  public stopBroadcastLoop(): void {
    if (this.stateBroadcaster) {
      clearInterval(this.stateBroadcaster);
      this.stateBroadcaster = null;
    }
  }

  public setBroadcastInterval(ms: number): void {
    this.broadcastInterval = Math.max(8, ms);
  }

  public getClientCount(): number {
    return this.clients.size;
  }

  public getConnectedClients(): string[] {
    return Array.from(this.clients.keys());
  }

  public close(): void {
    this.stopBroadcastLoop();

    for (const client of this.clients.values()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.close(1001, 'Server shutting down');
      }
    }

    this.clients.clear();
    this.wss.close();
  }

  onSubscribe: ((clientId: string, projectId: string) => void) | null = null;
  onUnsubscribe: ((clientId: string) => void) | null = null;
  onCommand: ((clientId: string, command: string, params: any) => void) | null = null;
  onConfigUpdate: ((clientId: string, projectId: string, config: any) => void) | null = null;
  onDisconnect: ((clientId: string, projectId: string | null) => void) | null = null;
}

import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type { DatabaseService } from './databaseService';

interface WebSocketMessage {
  type: string;
  data: any;
}

export class WebSocketService {
  private wss: WebSocketServer;
  private dbService: DatabaseService;
  private clients: Map<string, WebSocket> = new Map();

  constructor(server: Server, dbService: DatabaseService) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.dbService = dbService;
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      const clientId = Date.now().toString();
      this.clients.set(clientId, ws);

      ws.on('message', (message: string) => {
        try {
          const parsed: WebSocketMessage = JSON.parse(message);
          this.handleMessage(clientId, parsed);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(clientId);
      });
    });
  }

  private handleMessage(clientId: string, message: WebSocketMessage): void {
    const ws = this.clients.get(clientId);
    if (!ws) return;

    switch (message.type) {
      case 'ping':
        this.sendToClient(clientId, { type: 'pong', data: { timestamp: Date.now() } });
        break;
      case 'subscribe':
        this.handleSubscription(clientId, message.data);
        break;
      case 'unsubscribe':
        this.handleUnsubscription(clientId, message.data);
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  private handleSubscription(clientId: string, data: { channel: string }): void {
    console.log(`Client ${clientId} subscribed to ${data.channel}`);
  }

  private handleUnsubscription(clientId: string, data: { channel: string }): void {
    console.log(`Client ${clientId} unsubscribed from ${data.channel}`);
  }

  public broadcast(type: string, data: any): void {
    const message = JSON.stringify({ type, data });
    this.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  public sendToClient(clientId: string, data: any): void {
    const ws = this.clients.get(clientId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  public broadcastRobotUpdate(robot: any): void {
    this.broadcast('robot:update', robot);
  }

  public broadcastTaskUpdate(task: any): void {
    this.broadcast('task:update', task);
  }

  public broadcastWaveUpdate(wave: any): void {
    this.broadcast('wave:update', wave);
  }

  public broadcastException(exception: any): void {
    this.broadcast('exception:new', exception);
  }

  public broadcastCongestionAlert(congestion: any): void {
    this.broadcast('congestion:alert', congestion);
  }

  public broadcastLayoutUpdate(floorId: string): void {
    this.broadcast('layout:update', { floorId });
  }

  public getClientCount(): number {
    return this.clients.size;
  }

  public close(): void {
    this.wss.close();
  }
}

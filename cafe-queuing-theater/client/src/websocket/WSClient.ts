import { useSimulationStore } from '@/store/useSimulationStore';

type MessageHandler = (data: any) => void;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private url: string;
  private clientId: string | null = null;
  private messageHandlers: Map<string, MessageHandler[]> = new Map();

  constructor(url: string) {
    this.url = url;
    this.clientId = this.generateClientId();
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('[WS] Connected to server');
          this.reconnectAttempts = 0;
          useSimulationStore.getState().setConnected(true);
          this.send('hello', { clientId: this.clientId });
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (e) {
            console.error('[WS] Failed to parse message:', e);
          }
        };

        this.ws.onerror = (error) => {
          console.error('[WS] Connection error:', error);
          reject(error);
        };

        this.ws.onclose = (event) => {
          console.log('[WS] Connection closed:', event.code, event.reason);
          useSimulationStore.getState().setConnected(false);
          this.scheduleReconnect();
        };
      } catch (e) {
        reject(e);
      }
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WS] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect().catch((e) => {
        console.error('[WS] Reconnect failed:', e);
      });
    }, delay);
  }

  private handleMessage(message: any): void {
    const { type, payload } = message;

    switch (type) {
      case 'hello':
        console.log('[WS] Server acknowledged:', payload);
        this.send('subscribe', { clientId: this.clientId });
        break;

      case 'full_state':
        console.log('[WS] Received full state');
        useSimulationStore.getState().setFullState(payload.state);
        break;

      case 'delta_state':
        useSimulationStore.getState().applyDelta(payload.delta);
        break;

      case 'config_update':
        useSimulationStore.getState().updateConfig(payload.config);
        break;

      case 'error':
        console.error('[WS] Server error:', payload.message);
        break;

      default:
        const handlers = this.messageHandlers.get(type);
        if (handlers) {
          handlers.forEach((handler) => handler(payload));
        }
    }
  }

  send(type: string, payload: any = {}): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload, clientId: this.clientId }));
    } else {
      console.warn('[WS] Cannot send message, connection not open');
    }
  }

  on(type: string, handler: MessageHandler): void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type)!.push(handler);
  }

  off(type: string, handler: MessageHandler): void {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      const idx = handlers.indexOf(handler);
      if (idx >= 0) {
        handlers.splice(idx, 1);
      }
    }
  }

  start(): void {
    this.send('command', { command: 'start' });
  }

  pause(): void {
    this.send('command', { command: 'pause' });
  }

  reset(): void {
    this.send('command', { command: 'reset' });
  }

  setSpeed(speed: number): void {
    this.send('command', { command: 'set_speed', params: { speed } });
  }

  loadPreset(presetId: string): void {
    this.send('command', { command: 'load_preset', params: { presetId } });
  }

  updateConfig(config: any): void {
    this.send('config_update', { config });
  }

  disconnect(): void {
    if (this.ws) {
      this.send('unsubscribe', { clientId: this.clientId });
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

let wsClient: WebSocketClient | null = null;

export function getWSClient(): WebSocketClient {
  if (!wsClient) {
    wsClient = new WebSocketClient('ws://localhost:3001/ws');
  }
  return wsClient;
}

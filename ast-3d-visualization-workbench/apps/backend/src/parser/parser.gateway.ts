import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ParserService } from './parser.service';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class ParserGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly parserService: ParserService) {}

  handleConnection(client: Socket) {
    console.log(`Parser WebSocket client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Parser WebSocket client disconnected: ${client.id}`);
  }

  @SubscribeMessage('parse')
  async handleParse(client: Socket, payload: { source: string; language: string }) {
    try {
      const result = await this.parserService.parse(payload.source, payload.language || 'javascript');
      client.emit('parse:result', result);
    } catch (error) {
      client.emit('parse:error', { message: error.message });
    }
  }

  @SubscribeMessage('parse:incremental')
  async handleIncrementalParse(
    client: Socket,
    payload: {
      source: string;
      language: string;
      previousSource?: string;
      editStartIndex?: number;
      editOldEndIndex?: number;
      editNewEndIndex?: number;
    },
  ) {
    try {
      const result = await this.parserService.parseIncremental(payload);
      client.emit('parse:incremental:result', result);
    } catch (error) {
      client.emit('parse:error', { message: error.message });
    }
  }

  broadcastParseResult(result: any) {
    this.server.emit('parse:broadcast', result);
  }
}

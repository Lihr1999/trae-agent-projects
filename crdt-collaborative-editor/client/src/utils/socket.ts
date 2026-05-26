import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';

export const siteId = `user-${uuidv4().slice(0, 8)}`;

export let socket: Socket | null = null;

export function connectSocket(): Socket {
  socket = io('http://localhost:3001/editor', {
    query: { siteId },
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    console.log(`Connected to server as ${siteId}`);
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from server');
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

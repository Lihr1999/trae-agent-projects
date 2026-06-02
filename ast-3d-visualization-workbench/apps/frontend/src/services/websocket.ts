import { io, Socket } from 'socket.io-client';
import type { ParseResult, LayoutResult, DiffResult } from '../../../../packages/shared/src';

let socket: Socket | null = null;

type ParseResultHandler = (result: ParseResult) => void;
type LayoutResultHandler = (result: LayoutResult) => void;
type DiffResultHandler = (result: DiffResult) => void;
type ErrorHandler = (error: string) => void;
type ProgressHandler = (progress: { stage: string; percent: number }) => void;

const handlers: {
  parseResult?: ParseResultHandler;
  layoutResult?: LayoutResultHandler;
  diffResult?: DiffResultHandler;
  error?: ErrorHandler;
  progress?: ProgressHandler;
} = {};

export function connect(): void {
  if (socket?.connected) return;

  socket = io('/', {
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('[WS] Connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[WS] Disconnected:', reason);
  });

  socket.on('parse-result', (result: ParseResult) => {
    handlers.parseResult?.(result);
  });

  socket.on('layout-result', (result: LayoutResult) => {
    handlers.layoutResult?.(result);
  });

  socket.on('diff-result', (result: DiffResult) => {
    handlers.diffResult?.(result);
  });

  socket.on('error', (error: string) => {
    handlers.error?.(error);
  });

  socket.on('parse-progress', (progress: { stage: string; percent: number }) => {
    handlers.progress?.(progress);
  });
}

export function disconnect(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function send(event: string, data: unknown): void {
  if (socket?.connected) {
    socket.emit(event, data);
  }
}

export function onParseResult(handler: ParseResultHandler): void {
  handlers.parseResult = handler;
}

export function onLayoutResult(handler: LayoutResultHandler): void {
  handlers.layoutResult = handler;
}

export function onDiffResult(handler: DiffResultHandler): void {
  handlers.diffResult = handler;
}

export function onError(handler: ErrorHandler): void {
  handlers.error = handler;
}

export function onProgress(handler: ProgressHandler): void {
  handlers.progress = handler;
}

export function isConnected(): boolean {
  return socket?.connected ?? false;
}

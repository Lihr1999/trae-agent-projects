import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import http from 'http';

import configsRouter from './src/routes/configs.js';
import presetsRouter from './src/routes/presets.js';
import cloudRouter from './src/routes/cloud.js';
import { ensureDataDir } from './src/fileStorage.js';

const PORT = process.env.PORT || 3001;
const WS_PORT = process.env.WS_PORT || 3002;

const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

app.use('/api/configs', configsRouter);
app.use('/api/presets', presetsRouter);
app.use('/api/cloud', cloudRouter);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.all('*', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const wss = new WebSocketServer({ port: WS_PORT });

const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('New WebSocket connection established');

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());

      if (message.type === 'param-update') {
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === client.OPEN) {
            client.send(JSON.stringify({
              type: 'param-broadcast',
              params: message.params,
              timestamp: new Date().toISOString()
            }));
          }
        });
      } else if (message.type === 'performance-report') {
        if (message.fps < 15) {
          ws.send(JSON.stringify({
            type: 'alert-notification',
            level: 'warning',
            message: 'Low performance detected! Consider reducing render quality.',
            data: message
          }));
        }
      }
    } catch (e) {
      console.error('Error parsing WebSocket message:', e);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log('WebSocket connection closed');
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
  });
});

async function startServer() {
  try {
    await ensureDataDir();
    console.log('Data directory initialized');

    server.listen(PORT, () => {
      console.log(`HTTP Server running on http://localhost:${PORT}`);
      console.log(`WebSocket Server running on ws://localhost:${WS_PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  wss.close();
  server.close(() => {
    process.exit(0);
  });
});

import fastify from 'fastify';
import cors from '@fastify/cors';
import { BSPDungeonGenerator } from './generators/bsp-generator';
import { CaveGenerator } from './generators/cave-generator';
import { AStarPathfinder } from './pathfinding/a-star';
import { DijkstraPathfinder } from './pathfinding/dijkstra';
import { JPSPathfinder } from './pathfinding/jps';
import { BFSPathfinder } from './pathfinding/bfs';
import { db } from './database';
import type {
  DungeonConfig,
  DungeonResult,
  PathRequest,
  PathResult,
  TileType
} from './types';

const server = fastify({ logger: true });

server.register(cors, {
  origin: true,
  credentials: true
});

server.get('/health', async () => {
  return { status: 'ok', timestamp: Date.now() };
});

server.post<{ Body: DungeonConfig }>('/api/generate', async (request, reply) => {
  try {
    const config = request.body;
    let result: DungeonResult;

    if (config.generatorType === 'cave') {
      const generator = new CaveGenerator(config);
      result = generator.generate();
    } else {
      const generator = new BSPDungeonGenerator(config);
      result = generator.generate();
    }

    const snapshotId = db.saveSnapshot({
      seed: config.seed,
      config: JSON.stringify(config),
      tiles: JSON.stringify(result.tiles),
      createdAt: Date.now()
    });

    return {
      ...result,
      snapshotId
    };
  } catch (error) {
    request.log.error(error);
    reply.status(500).send({ error: '生成地牢失败' });
  }
});

server.post<{ Body: PathRequest }>('/api/pathfind', async (request, reply) => {
  try {
    const { tiles, start, end, algorithm, allowDiagonal } = request.body;

    const width = tiles[0]?.length || 0;
    const height = tiles.length;

    if (
      start.x < 0 || start.x >= width || start.y < 0 || start.y >= height ||
      end.x < 0 || end.x >= width || end.y < 0 || end.y >= height
    ) {
      reply.status(400).send({ error: '起点或终点超出边界' });
      return;
    }

    let result: PathResult;

    switch (algorithm) {
      case 'astar':
        result = new AStarPathfinder(tiles, allowDiagonal).findPath(start, end);
        break;
      case 'dijkstra':
        result = new DijkstraPathfinder(tiles).findPath(start, end);
        break;
      case 'jps':
        result = new JPSPathfinder(tiles).findPath(start, end);
        break;
      case 'bfs':
        result = new BFSPathfinder(tiles).findPath(start, end);
        break;
      default:
        reply.status(400).send({ error: '未知的寻路算法' });
        return;
    }

    return result;
  } catch (error) {
    request.log.error(error);
    reply.status(500).send({ error: '寻路失败' });
  }
});

server.post<{ Body: { tiles: TileType[][]; start: any; end: any; snapshotId?: number } }>(
  '/api/pathfind/all',
  async (request, reply) => {
    try {
      const { tiles, start, end, snapshotId } = request.body;

      const algorithms = ['astar', 'dijkstra', 'jps', 'bfs'] as const;
      const results: PathResult[] = [];

      for (const algo of algorithms) {
        let result: PathResult;
        switch (algo) {
          case 'astar':
            result = new AStarPathfinder(tiles, false).findPath(start, end);
            break;
          case 'dijkstra':
            result = new DijkstraPathfinder(tiles).findPath(start, end);
            break;
          case 'jps':
            result = new JPSPathfinder(tiles).findPath(start, end);
            break;
          case 'bfs':
            result = new BFSPathfinder(tiles).findPath(start, end);
            break;
        }
        results.push(result);

        if (snapshotId) {
          db.savePathfindingStats({
            snapshotId,
            algorithm: result.algorithm,
            nodesExpanded: result.nodesExpanded,
            pathLength: result.pathLength,
            timeMs: result.timeMs,
            maxOpenSetSize: result.maxOpenSetSize,
            found: result.found,
            createdAt: Date.now()
          });
        }
      }

      return results;
    } catch (error) {
      request.log.error(error);
      reply.status(500).send({ error: '批量寻路失败' });
    }
  }
);

server.get('/api/snapshots', async () => {
  return db.listSnapshots();
});

server.get<{ Params: { id: string } }>('/api/snapshots/:id', async (request, reply) => {
  const snapshot = db.getSnapshot(parseInt(request.params.id));
  if (!snapshot) {
    reply.status(404).send({ error: '快照不存在' });
    return;
  }
  return snapshot;
});

server.delete<{ Params: { id: string } }>('/api/snapshots/:id', async (request, reply) => {
  db.deleteSnapshot(parseInt(request.params.id));
  return { success: true };
});

server.get('/api/stats/algorithm/:name', async (request) => {
  const { name } = request.params as { name: string };
  return db.getAlgorithmStats(name);
});

server.get('/api/presets', async () => {
  const presets = [
    {
      id: 'small-dungeon',
      name: '小型规则地牢十房间',
      description: '使用BSP算法生成的小型规则地牢，包含10个房间',
      config: {
        width: 50,
        height: 50,
        minRoomSize: 4,
        maxRoomSize: 10,
        minRooms: 8,
        maxRooms: 12,
        bspDepth: 4,
        corridorBendiness: 0.1,
        doorDensity: 0.3,
        chestDensity: 0.5,
        monsterDensity: 0.3,
        trapDensity: 0.05,
        seed: 12345,
        generatorType: 'bsp' as const
      }
    },
    {
      id: 'giant-cave',
      name: '巨型洞穴地图五百格',
      description: '使用drunken walker算法生成的巨型洞穴，500x500格',
      config: {
        width: 100,
        height: 100,
        minRoomSize: 3,
        maxRoomSize: 8,
        minRooms: 5,
        maxRooms: 10,
        bspDepth: 3,
        corridorBendiness: 0.2,
        doorDensity: 0,
        chestDensity: 0,
        monsterDensity: 0,
        trapDensity: 0,
        seed: 67890,
        generatorType: 'cave' as const,
        caveFillProbability: 0.45,
        caveSmoothingIterations: 5
      }
    },
    {
      id: 'narrow-maze',
      name: '窄走廊迷宫死胡同',
      description: '高弯曲度走廊生成的复杂迷宫，包含大量死胡同',
      config: {
        width: 80,
        height: 80,
        minRoomSize: 3,
        maxRoomSize: 5,
        minRooms: 15,
        maxRooms: 20,
        bspDepth: 5,
        corridorBendiness: 0.8,
        doorDensity: 0.1,
        chestDensity: 0.2,
        monsterDensity: 0.1,
        trapDensity: 0.1,
        seed: 54321,
        generatorType: 'bsp' as const
      }
    },
    {
      id: 'isolated-island',
      name: '起点终点不可达孤岛',
      description: '两个房间被走廊连接后又因洞穴算法侵蚀导致走廊消失形成孤岛',
      config: {
        width: 60,
        height: 60,
        minRoomSize: 5,
        maxRoomSize: 10,
        minRooms: 2,
        maxRooms: 2,
        bspDepth: 1,
        corridorBendiness: 0,
        doorDensity: 0,
        chestDensity: 0,
        monsterDensity: 0,
        trapDensity: 0,
        seed: 99999,
        generatorType: 'bsp' as const
      }
    }
  ];
  return presets;
});

const start = async () => {
  try {
    await db.init();
    console.log('数据库初始化完成');
    await server.listen({ port: 3001, host: '0.0.0.0' });
    console.log('服务器运行在 http://localhost:3001');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();

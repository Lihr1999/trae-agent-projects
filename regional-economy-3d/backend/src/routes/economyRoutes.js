import { prepare } from '../db.js';

export async function economyRoutes(fastify) {
  fastify.get('/api/flows', async (request, reply) => {
    const { level = 'province', limit = 200 } = request.query;
    const db = fastify.db;
    const rows = prepare(
      db,
      `SELECT f.id, f.from_id, f.to_id, f.value, f.type, r1.name as from_name, r2.name as to_name
       FROM flows f
       JOIN regions r1 ON f.from_id = r1.id
       JOIN regions r2 ON f.to_id = r2.id
       WHERE r1.level = ? AND r2.level = ?
       LIMIT ?`
    ).all(level, level, Number(limit));
    reply.send({ flows: rows });
  });

  fastify.get('/api/matrix', async (_request, reply) => {
    const db = fastify.db;
    const flows = prepare(db, 'SELECT from_id, to_id, value FROM flows').all();
    reply.send({ matrix: flows });
  });

  fastify.get('/api/presets', async (_request, reply) => {
    reply.send({
      presets: [
        { id: 1, name: '预设一', description: '东部沿海经济带', focus: ['北京', '上海', '广东', '江苏', '浙江'], camera: { height: 80 } },
        { id: 2, name: '预设二', description: '长江经济带', focus: ['上海', '江苏', '浙江', '安徽', '湖北', '湖南', '重庆', '四川'], camera: { height: 60 } },
        { id: 3, name: '预设三', description: '京津冀协同发展', focus: ['北京', '天津', '河北'], camera: { height: 40 } },
        { id: 4, name: '预设四', description: '粤港澳大湾区', focus: ['广东', '香港', '澳门'], camera: { height: 30 } },
      ],
    });
  });
}

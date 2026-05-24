import { simplifyGeoJSON } from '../utils/douglasPeucker.js';
import { prepare } from '../db.js';

export async function geoRoutes(fastify) {
  fastify.get('/api/geo/:level', async (request, reply) => {
    const { level } = request.params;
    const { parentId, tolerance = 0.02, simplified = 'true' } = request.query;
    const db = fastify.db;

    let rows;
    if (level === 'province') {
      rows = prepare(db, 'SELECT * FROM regions WHERE level = ?').all('province');
    } else if (level === 'city' && parentId) {
      rows = prepare(db, 'SELECT * FROM regions WHERE level = ? AND parent_id = ?').all('city', parentId);
    } else {
      rows = prepare(db, 'SELECT * FROM regions WHERE level = ?').all(level);
    }

    const features = rows
      .filter((r) => r.geojson)
      .map((r) => {
        try {
          let geom = JSON.parse(r.geojson);
          if (simplified !== 'false') {
            geom = simplifyGeoJSON(geom, Number(tolerance) || 0.02);
          }
          return {
            type: 'Feature',
            properties: {
              id: r.id,
              name: r.name,
              level: r.level,
              parent_id: r.parent_id,
              gdp: r.gdp,
              population: r.population,
            },
            geometry: geom.type ? geom : { type: 'Polygon', coordinates: geom },
          };
        } catch (e) {
          return null;
        }
      })
      .filter(Boolean);

    reply.send({ type: 'FeatureCollection', features });
  });

  fastify.get('/api/region/:id', async (request, reply) => {
    const { id } = request.params;
    const { tolerance = 0.02 } = request.query;
    const db = fastify.db;
    const row = prepare(db, 'SELECT * FROM regions WHERE id = ?').get(id);
    if (!row) return reply.status(404).send({ error: 'not found' });
    let geom;
    try {
      geom = row.geojson ? JSON.parse(row.geojson) : null;
    } catch (e) {
      geom = null;
    }
    if (geom) geom = simplifyGeoJSON(geom, Number(tolerance) || 0.02);
    reply.send({ ...row, geojson: geom, geojson_compressed: row.geojson });
  });
}

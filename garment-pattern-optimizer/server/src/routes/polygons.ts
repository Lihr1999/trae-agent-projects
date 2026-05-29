import Router from 'koa-router';
import { findSelfIntersections, isSimplePolygon } from '../algorithms/geometry';
import type { Point, Polygon, MarkerWarning } from '../types';

const router = new Router({ prefix: '/api/polygons' });

router.post('/validate', async (ctx) => {
  const { points } = ctx.request.body as { points: Point[] };
  
  if (!points || points.length < 3) {
    ctx.status = 400;
    ctx.body = {
      valid: false,
      error: '多边形至少需要3个顶点',
      warnings: []
    };
    return;
  }

  const warnings: MarkerWarning[] = [];
  
  const selfIntersections = findSelfIntersections(points);
  if (selfIntersections.length > 0) {
    warnings.push({
      type: 'self_intersection',
      message: `检测到 ${selfIntersections.length} 处自交点，这可能导致布尔运算崩溃`,
      highlightPoints: selfIntersections
    });
  }
  
  const isSimple = isSimplePolygon(points);
  
  ctx.body = {
    valid: isSimple,
    isSimple,
    selfIntersections,
    warnings: warnings.length > 0 ? warnings : undefined
  };
});

router.post('/area', async (ctx) => {
  const { points } = ctx.request.body as { points: Point[] };
  
  if (!points || points.length < 3) {
    ctx.status = 400;
    ctx.body = { error: '多边形至少需要3个顶点' };
    return;
  }
  
  const { getPolygonArea } = await import('../algorithms/geometry');
  const area = getPolygonArea(points);
  
  ctx.body = {
    area: Math.abs(area),
    signedArea: area
  };
});

router.post('/bounds', async (ctx) => {
  const { points } = ctx.request.body as { points: Point[] };
  
  if (!points || points.length < 3) {
    ctx.status = 400;
    ctx.body = { error: '多边形至少需要3个顶点' };
    return;
  }
  
  const { getPolygonBounds } = await import('../algorithms/geometry');
  const bounds = getPolygonBounds(points);
  
  ctx.body = {
    bounds,
    width: bounds.maxX - bounds.minX,
    height: bounds.maxY - bounds.minY
  };
});

router.post('/transform', async (ctx) => {
  const { points, rotation, translation, scale, center } = ctx.request.body as {
    points: Point[];
    rotation?: number;
    translation?: { dx: number; dy: number };
    scale?: { sx: number; sy: number };
    center?: Point;
  };
  
  if (!points || points.length < 3) {
    ctx.status = 400;
    ctx.body = { error: '多边形至少需要3个顶点' };
    return;
  }
  
  const { rotatePolygon, translatePolygon, scalePolygon, getPolygonCenter } = await import('../algorithms/geometry');
  
  let result = [...points];
  
  if (scale) {
    result = scalePolygon(result, scale.sx, scale.sy);
  }
  
  if (rotation !== undefined) {
    const rotCenter = center || getPolygonCenter(result);
    result = rotatePolygon(result, rotation, rotCenter);
  }
  
  if (translation) {
    result = translatePolygon(result, translation.dx, translation.dy);
  }
  
  ctx.body = {
    points: result
  };
});

router.post('/check-grain-constraint', async (ctx) => {
  const { rotation, grainAngle, tolerance } = ctx.request.body as {
    rotation: number;
    grainAngle: number;
    tolerance?: number;
  };
  
  const tol = tolerance ?? (5 * Math.PI / 180);
  
  const normalizeAngle = (angle: number): number => {
    let normalized = angle % (2 * Math.PI);
    if (normalized < 0) normalized += 2 * Math.PI;
    return normalized;
  };
  
  const normalizedRotation = normalizeAngle(rotation);
  const normalizedGrain = normalizeAngle(grainAngle);
  
  let angleDiff = Math.abs(normalizedRotation - normalizedGrain);
  while (angleDiff > Math.PI) {
    angleDiff = Math.abs(angleDiff - 2 * Math.PI);
  }
  
  const valid = angleDiff <= tol;
  
  const validRotations = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2].filter(rot => {
    const normalized = normalizeAngle(rot);
    let diff = Math.abs(normalized - normalizedGrain);
    while (diff > Math.PI) diff = Math.abs(diff - 2 * Math.PI);
    return diff <= tol;
  });
  
  ctx.body = {
    valid,
    angleDiff,
    tolerance: tol,
    validRotations,
    hasSolution: validRotations.length > 0,
    warning: validRotations.length === 0 
      ? {
          type: 'no_solution' as const,
          message: '布纹方向约束过严，没有满足条件的旋转角度。建议放宽容差或调整布纹方向。'
        }
      : undefined
  };
});

export default router;

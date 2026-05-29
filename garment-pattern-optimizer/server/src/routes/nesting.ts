import Router from 'koa-router';
import { HeuristicNesting } from '../algorithms/nesting';
import { computeNFP, computeInnerNFP } from '../algorithms/nfp';
import { findSelfIntersections, isSimplePolygon } from '../algorithms/geometry';
import type { Polygon, MarkerResult, MarkerWarning, Point } from '../types';

const router = new Router({ prefix: '/api/nesting' });

router.post('/compute', async (ctx) => {
  const { polygons, fabricWidth, fabricHeight, rotationStep, gap } = ctx.request.body as {
    polygons: Polygon[];
    fabricWidth: number;
    fabricHeight: number;
    rotationStep?: number;
    gap?: number;
  };
  
  if (!polygons || polygons.length === 0) {
    ctx.status = 400;
    ctx.body = { error: '请提供至少一个多边形' };
    return;
  }
  
  if (!fabricWidth || !fabricHeight) {
    ctx.status = 400;
    ctx.body = { error: '请提供有效的布料尺寸' };
    return;
  }
  
  const warnings: MarkerWarning[] = [];
  
  for (const polygon of polygons) {
    if (polygon.points.length < 3) {
      ctx.status = 400;
      ctx.body = { error: `多边形 "${polygon.name}" 至少需要3个顶点` };
      return;
    }
    
    const selfIntersections = findSelfIntersections(polygon.points);
    if (selfIntersections.length > 0) {
      warnings.push({
        type: 'self_intersection',
        message: `多边形 "${polygon.name}" 存在 ${selfIntersections.length} 处自交，这可能导致布尔运算失败或NFP计算异常`,
        polygonIds: [polygon.id],
        highlightPoints: selfIntersections
      });
    }
    
    if (!isSimplePolygon(polygon.points)) {
      warnings.push({
        type: 'self_intersection',
        message: `多边形 "${polygon.name}" 不是简单多边形，排料结果可能不准确`,
        polygonIds: [polygon.id]
      });
    }
  }
  
  try {
    const nesting = new HeuristicNesting({
      fabricWidth,
      fabricHeight,
      rotationStep,
      gap
    });
    
    const result = nesting.nest(polygons);
    
    if (warnings.length > 0) {
      result.warnings = [...(result.warnings || []), ...warnings];
    }
    
    ctx.body = result;
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      error: error instanceof Error ? error.message : '排料计算失败',
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }
});

router.post('/nfp', async (ctx) => {
  const { stationary, moving, detectSingularities } = ctx.request.body as {
    stationary: Point[];
    moving: Point[];
    detectSingularities?: boolean;
  };
  
  if (!stationary || stationary.length < 3 || !moving || moving.length < 3) {
    ctx.status = 400;
    ctx.body = { error: '两个多边形都至少需要3个顶点' };
    return;
  }
  
  const warnings: MarkerWarning[] = [];
  
  const stationarySelfInt = findSelfIntersections(stationary);
  const movingSelfInt = findSelfIntersections(moving);
  
  if (stationarySelfInt.length > 0 || movingSelfInt.length > 0) {
    warnings.push({
      type: 'self_intersection',
      message: '输入多边形存在自交，NFP计算可能产生异常结果',
      highlightPoints: [...stationarySelfInt, ...movingSelfInt]
    });
  }
  
  const result = computeNFP(stationary, moving, { detectSingularities });
  
  ctx.body = {
    ...result,
    warnings: warnings.length > 0 ? warnings : undefined
  };
});

router.post('/inner-nfp', async (ctx) => {
  const { container, polygon } = ctx.request.body as {
    container: Point[];
    polygon: Point[];
  };
  
  if (!container || container.length < 3 || !polygon || polygon.length < 3) {
    ctx.status = 400;
    ctx.body = { error: '两个多边形都至少需要3个顶点' };
    return;
  }
  
  const result = computeInnerNFP(container, polygon);
  ctx.body = result;
});

router.post('/validate-marker', async (ctx) => {
  const { placements, polygons, fabricWidth, fabricHeight } = ctx.request.body as {
    placements: Array<{ polygonId: string; position: Point; rotation: number }>;
    polygons: Polygon[];
    fabricWidth: number;
    fabricHeight: number;
  };
  
  const { rotatePolygon, translatePolygon, getPolygonCenter, getPolygonBounds } = await import('../algorithms/geometry');
  const { checkOverlap } = await import('../algorithms/nfp');
  
  const warnings: MarkerWarning[] = [];
  const errors: MarkerWarning[] = [];
  
  const transformedPolygons: { id: string; points: Point[] }[] = [];
  
  for (const placement of placements) {
    const polygon = polygons.find(p => p.id === placement.polygonId);
    if (!polygon) continue;
    
    const center = getPolygonCenter(polygon.points);
    const rotated = rotatePolygon(polygon.points, placement.rotation, center);
    const transformed = translatePolygon(rotated, placement.position.x, placement.position.y);
    
    const bounds = getPolygonBounds(transformed);
    if (bounds.minX < 0 || bounds.maxX > fabricWidth || bounds.minY < 0 || bounds.maxY > fabricHeight) {
      errors.push({
        type: 'collision',
        message: `多边形 "${polygon.name}" 超出布料边界`,
        polygonIds: [polygon.id]
      });
    }
    
    transformedPolygons.push({ id: polygon.id, points: transformed });
  }
  
  for (let i = 0; i < transformedPolygons.length; i++) {
    for (let j = i + 1; j < transformedPolygons.length; j++) {
      if (checkOverlap(transformedPolygons[i].points, transformedPolygons[j].points)) {
        errors.push({
          type: 'collision',
          message: `多边形发生重叠`,
          polygonIds: [transformedPolygons[i].id, transformedPolygons[j].id]
        });
      }
    }
  }
  
  const { getPolygonArea } = await import('../algorithms/geometry');
  const totalArea = polygons.reduce((sum, p) => sum + Math.abs(getPolygonArea(p.points)) * p.quantity, 0);
  const utilization = (totalArea / (fabricWidth * fabricHeight)) * 100;
  
  ctx.body = {
    valid: errors.length === 0,
    errors,
    warnings,
    utilization,
    totalArea,
    fabricArea: fabricWidth * fabricHeight
  };
});

export default router;

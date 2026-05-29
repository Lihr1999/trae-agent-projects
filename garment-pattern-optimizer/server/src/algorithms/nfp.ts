import type { Point, NFPResult } from '../types';
import * as geom from './geometry';
import polygonClipping from 'polygon-clipping';

const EPSILON = 1e-8;

interface TouchingPair {
  type: 'vertex-edge' | 'edge-vertex' | 'edge-edge' | 'vertex-vertex';
  stationaryVertex?: number;
  stationaryEdge?: [number, number];
  movingVertex?: number;
  movingEdge?: [number, number];
  translation: Point;
}

interface OrbitingState {
  stationary: Point[];
  moving: Point[];
  reversedMoving: Point[];
  currentTranslation: Point;
  nfpVertices: Point[];
  singularityPoints: Point[];
  visitedConfigs: Set<string>;
}

function toClippingPolygon(points: Point[]): polygonClipping.Polygon {
  return [points.map(p => [p.x, p.y])];
}

function fromClippingPolygon(poly: polygonClipping.Polygon): Point[] {
  return poly[0].map(([x, y]) => ({ x, y }));
}

function translateToOrigin(points: Point[]): Point[] {
  if (points.length === 0) return [];
  const minX = Math.min(...points.map(p => p.x));
  const minY = Math.min(...points.map(p => p.y));
  return points.map(p => ({ x: p.x - minX, y: p.y - minY }));
}

function pointToString(p: Point): string {
  return `${p.x.toFixed(8)},${p.y.toFixed(8)}`;
}

function configKey(translation: Point, touchingType: string, idx1: number, idx2: number): string {
  return `${pointToString(translation)}|${touchingType}|${idx1}|${idx2}`;
}

function findInitialTouching(stationary: Point[], reversedMoving: Point[]): TouchingPair | null {
  const n = stationary.length;
  const m = reversedMoving.length;

  let bestPair: TouchingPair | null = null;
  let minDist = Infinity;

  for (let i = 0; i < n; i++) {
    const sv = stationary[i];
    for (let j = 0; j < m; j++) {
      const mv = reversedMoving[j];
      const translation = { x: sv.x - mv.x, y: sv.y - mv.y };
      const dist = Math.sqrt(translation.x * translation.x + translation.y * translation.y);

      const translatedMoving = reversedMoving.map(p => ({
        x: p.x + translation.x,
        y: p.y + translation.y
      }));

      if (isValidTouchingPosition(stationary, translatedMoving)) {
        if (dist < minDist) {
          minDist = dist;
          bestPair = {
            type: 'vertex-vertex',
            stationaryVertex: i,
            movingVertex: j,
            translation
          };
        }
      }
    }
  }

  if (bestPair) return bestPair;

  for (let i = 0; i < n; i++) {
    const sv1 = stationary[i];
    const sv2 = stationary[(i + 1) % n];
    for (let j = 0; j < m; j++) {
      const mv = reversedMoving[j];
      const proj = projectPointOnSegment(mv, sv1, sv2);
      if (proj) {
        const translation = { x: proj.x - mv.x, y: proj.y - mv.y };
        const translatedMoving = reversedMoving.map(p => ({
          x: p.x + translation.x,
          y: p.y + translation.y
        }));

        if (isValidTouchingPosition(stationary, translatedMoving)) {
          const dist = Math.sqrt(translation.x * translation.x + translation.y * translation.y);
          if (dist < minDist) {
            minDist = dist;
            bestPair = {
              type: 'vertex-edge',
              stationaryEdge: [i, (i + 1) % n],
              movingVertex: j,
              translation
            };
          }
        }
      }
    }
  }

  for (let i = 0; i < n; i++) {
    const sv = stationary[i];
    for (let j = 0; j < m; j++) {
      const mv1 = reversedMoving[j];
      const mv2 = reversedMoving[(j + 1) % m];
      const proj = projectPointOnSegment(sv, mv1, mv2);
      if (proj) {
        const translation = { x: sv.x - proj.x, y: sv.y - proj.y };
        const translatedMoving = reversedMoving.map(p => ({
          x: p.x + translation.x,
          y: p.y + translation.y
        }));

        if (isValidTouchingPosition(stationary, translatedMoving)) {
          const dist = Math.sqrt(translation.x * translation.x + translation.y * translation.y);
          if (dist < minDist) {
            minDist = dist;
            bestPair = {
              type: 'edge-vertex',
              stationaryVertex: i,
              movingEdge: [j, (j + 1) % m],
              translation
            };
          }
        }
      }
    }
  }

  return bestPair;
}

function projectPointOnSegment(p: Point, s1: Point, s2: Point): Point | null {
  const dx = s2.x - s1.x;
  const dy = s2.y - s1.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq < EPSILON) return null;

  const t = ((p.x - s1.x) * dx + (p.y - s1.y) * dy) / lenSq;

  if (t < -EPSILON || t > 1 + EPSILON) return null;

  const clampedT = Math.max(0, Math.min(1, t));
  return {
    x: s1.x + clampedT * dx,
    y: s1.y + clampedT * dy
  };
}

function isValidTouchingPosition(stationary: Point[], translatedMoving: Point[]): boolean {
  for (const p of translatedMoving) {
    if (geom.isPointInPolygon(p, stationary)) {
      return false;
    }
  }

  const n = stationary.length;
  const m = translatedMoving.length;

  for (let i = 0; i < n; i++) {
    const s1 = stationary[i];
    const s2 = stationary[(i + 1) % n];
    for (let j = 0; j < m; j++) {
      const m1 = translatedMoving[j];
      const m2 = translatedMoving[(j + 1) % m];
      if (geom.doLinesIntersect(s1, s2, m1, m2)) {
        const intersection = geom.lineIntersection(s1, s2, m1, m2);
        if (intersection) {
          const isS1 = geom.distance(intersection, s1) < EPSILON;
          const isS2 = geom.distance(intersection, s2) < EPSILON;
          const isM1 = geom.distance(intersection, m1) < EPSILON;
          const isM2 = geom.distance(intersection, m2) < EPSILON;
          if (!(isS1 || isS2 || isM1 || isM2)) {
            return false;
          }
        }
      }
    }
  }

  return true;
}

function findAllTouchingPairs(stationary: Point[], reversedMoving: Point[], currentTranslation: Point): TouchingPair[] {
  const pairs: TouchingPair[] = [];
  const translatedMoving = reversedMoving.map(p => ({
    x: p.x + currentTranslation.x,
    y: p.y + currentTranslation.y
  }));

  const n = stationary.length;
  const m = reversedMoving.length;

  for (let i = 0; i < n; i++) {
    const sv = stationary[i];
    for (let j = 0; j < m; j++) {
      const mv = translatedMoving[j];
      if (geom.distance(sv, mv) < EPSILON) {
        const origMv = reversedMoving[j];
        pairs.push({
          type: 'vertex-vertex',
          stationaryVertex: i,
          movingVertex: j,
          translation: { x: sv.x - origMv.x, y: sv.y - origMv.y }
        });
      }
    }
  }

  for (let i = 0; i < n; i++) {
    const sv1 = stationary[i];
    const sv2 = stationary[(i + 1) % n];
    for (let j = 0; j < m; j++) {
      const mv = translatedMoving[j];
      const proj = projectPointOnSegment(mv, sv1, sv2);
      if (proj && geom.distance(mv, proj) < EPSILON) {
        const origMv = reversedMoving[j];
        pairs.push({
          type: 'vertex-edge',
          stationaryEdge: [i, (i + 1) % n],
          movingVertex: j,
          translation: { x: proj.x - origMv.x, y: proj.y - origMv.y }
        });
      }
    }
  }

  for (let i = 0; i < n; i++) {
    const sv = stationary[i];
    for (let j = 0; j < m; j++) {
      const mv1 = translatedMoving[j];
      const mv2 = translatedMoving[(j + 1) % m];
      const proj = projectPointOnSegment(sv, mv1, mv2);
      if (proj && geom.distance(sv, proj) < EPSILON) {
        const origMv1 = reversedMoving[j];
        const origMv2 = reversedMoving[(j + 1) % m];
        const t = ((proj.x - origMv1.x) * (origMv2.x - origMv1.x) + (proj.y - origMv1.y) * (origMv2.y - origMv1.y)) /
          Math.max(EPSILON, (origMv2.x - origMv1.x) ** 2 + (origMv2.y - origMv1.y) ** 2);
        const clampedT = Math.max(0, Math.min(1, t));
        const origProj = {
          x: origMv1.x + clampedT * (origMv2.x - origMv1.x),
          y: origMv1.y + clampedT * (origMv2.y - origMv1.y)
        };
        pairs.push({
          type: 'edge-vertex',
          stationaryVertex: i,
          movingEdge: [j, (j + 1) % m],
          translation: { x: sv.x - origProj.x, y: sv.y - origProj.y }
        });
      }
    }
  }

  for (let i = 0; i < n; i++) {
    const sv1 = stationary[i];
    const sv2 = stationary[(i + 1) % n];
    for (let j = 0; j < m; j++) {
      const mv1 = translatedMoving[j];
      const mv2 = translatedMoving[(j + 1) % m];
      if (areEdgesCollinearAndOverlapping(sv1, sv2, mv1, mv2)) {
        const origMv1 = reversedMoving[j];
        pairs.push({
          type: 'edge-edge',
          stationaryEdge: [i, (i + 1) % n],
          movingEdge: [j, (j + 1) % m],
          translation: { x: sv1.x - origMv1.x, y: sv1.y - origMv1.y }
        });
      }
    }
  }

  return pairs;
}

function areEdgesCollinearAndOverlapping(s1: Point, s2: Point, m1: Point, m2: Point): boolean {
  const d1 = geom.subtract(s2, s1);
  const d2 = geom.subtract(m2, m1);

  if (Math.abs(geom.cross(d1, d2)) > EPSILON) return false;

  const minSX = Math.min(s1.x, s2.x) - EPSILON;
  const maxSX = Math.max(s1.x, s2.x) + EPSILON;
  const minSY = Math.min(s1.y, s2.y) - EPSILON;
  const maxSY = Math.max(s1.y, s2.y) + EPSILON;

  const m1On = m1.x >= minSX && m1.x <= maxSX && m1.y >= minSY && m1.y <= maxSY;
  const m2On = m2.x >= minSX && m2.x <= maxSX && m2.y >= minSY && m2.y <= maxSY;

  return m1On || m2On;
}

function computeTranslationForPair(
  stationary: Point[],
  reversedMoving: Point[],
  pair: TouchingPair,
  currentTranslation: Point
): Point {
  const translatedMoving = reversedMoving.map(p => ({
    x: p.x + currentTranslation.x,
    y: p.y + currentTranslation.y
  }));

  if (pair.type === 'vertex-vertex' && pair.stationaryVertex !== undefined && pair.movingVertex !== undefined) {
    const sv = stationary[pair.stationaryVertex];
    const mv = reversedMoving[pair.movingVertex];
    return { x: sv.x - mv.x, y: sv.y - mv.y };
  }

  if (pair.type === 'vertex-edge' && pair.stationaryEdge && pair.movingVertex !== undefined) {
    const sv1 = stationary[pair.stationaryEdge[0]];
    const sv2 = stationary[pair.stationaryEdge[1]];
    const mv = translatedMoving[pair.movingVertex];
    const proj = projectPointOnSegment(mv, sv1, sv2);
    if (proj) {
      const origMv = reversedMoving[pair.movingVertex];
      return { x: proj.x - origMv.x, y: proj.y - origMv.y };
    }
  }

  if (pair.type === 'edge-vertex' && pair.stationaryVertex !== undefined && pair.movingEdge) {
    const sv = stationary[pair.stationaryVertex];
    const origMv1 = reversedMoving[pair.movingEdge[0]];
    const origMv2 = reversedMoving[pair.movingEdge[1]];

    const edgeDir = geom.normalize(geom.subtract(origMv2, origMv1));
    const edgeNormal = { x: -edgeDir.y, y: edgeDir.x };

    const toPoint = geom.subtract(sv, origMv1);
    const alongEdge = geom.dot(toPoint, edgeDir);
    const perpDist = geom.dot(toPoint, edgeNormal);

    const edgeLen = geom.distance(origMv1, origMv2);
    const clampedAlong = Math.max(0, Math.min(edgeLen, alongEdge));

    const contactPoint = {
      x: origMv1.x + edgeDir.x * clampedAlong,
      y: origMv1.y + edgeDir.y * clampedAlong
    };

    return { x: sv.x - contactPoint.x, y: sv.y - contactPoint.y };
  }

  if (pair.type === 'edge-edge' && pair.stationaryEdge && pair.movingEdge) {
    const sv1 = stationary[pair.stationaryEdge[0]];
    const origMv1 = reversedMoving[pair.movingEdge[0]];
    return { x: sv1.x - origMv1.x, y: sv1.y - origMv1.y };
  }

  return currentTranslation;
}

function detectSingularities(nfp: Point[], options: { detectSingularities?: boolean }): Point[] {
  if (!options.detectSingularities) return [];

  const singularities: Point[] = [];
  const n = nfp.length;

  for (let i = 0; i < n; i++) {
    const p1 = nfp[i];
    const p2 = nfp[(i + 1) % n];
    const p3 = nfp[(i + 2) % n];

    const v1 = geom.subtract(p2, p1);
    const v2 = geom.subtract(p3, p2);

    const cross = geom.cross(v1, v2);
    const dot = geom.dot(v1, v2);
    const len1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const len2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

    if (len1 < EPSILON || len2 < EPSILON) {
      singularities.push(p2);
      continue;
    }

    const angle = Math.acos(Math.max(-1, Math.min(1, dot / (len1 * len2))));

    if (Math.abs(cross) < EPSILON && Math.abs(angle - Math.PI) < 0.1) {
      singularities.push(p2);
    }

    if (len1 < 1e-4 || len2 < 1e-4) {
      singularities.push(p2);
    }
  }

  return singularities;
}

function isConvex(points: Point[]): boolean {
  const n = points.length;
  if (n < 3) return true;

  let sign = 0;
  for (let i = 0; i < n; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];

    const cross = geom.cross(geom.subtract(p2, p1), geom.subtract(p3, p2));
    if (Math.abs(cross) > EPSILON) {
      if (sign === 0) {
        sign = cross > 0 ? 1 : -1;
      } else if ((cross > 0 ? 1 : -1) !== sign) {
        return false;
      }
    }
  }
  return true;
}

function mergeNFPParts(parts: Point[][]): Point[] {
  if (parts.length === 0) return [];
  if (parts.length === 1) return parts[0];

  try {
    const clipperPolys = parts.map(p => toClippingPolygon(p));
    const result = polygonClipping.union(clipperPolys[0], ...clipperPolys.slice(1));
    if (result.length > 0 && result[0].length > 0) {
      return fromClippingPolygon(result[0] as polygonClipping.Polygon);
    }
  } catch (e) {
    console.warn('NFP union failed, using largest part:', e);
  }

  return parts.reduce((a, b) => a.length > b.length ? a : b);
}

export function computeNFP(
  stationary: Point[],
  moving: Point[],
  options?: { detectSingularities?: boolean }
): NFPResult {
  const opts = { detectSingularities: true, ...options };

  if (stationary.length < 3 || moving.length < 3) {
    return {
      polygon: [],
      valid: false,
      error: 'Polygons must have at least 3 vertices',
      singularityPoints: []
    };
  }

  try {
    const stationaryOrigin = translateToOrigin(stationary);
    const movingOrigin = translateToOrigin(moving);

    const isStationaryCCW = geom.isPolygonCCW(stationaryOrigin);
    const stationaryOriented = isStationaryCCW ? stationaryOrigin : geom.reversePolygon(stationaryOrigin);
    const reversedMoving = geom.reversePolygon(movingOrigin);

    const initialTouch = findInitialTouching(stationaryOriented, reversedMoving);

    if (!initialTouch) {
      return {
        polygon: [],
        valid: false,
        error: 'Could not find initial touching position',
        singularityPoints: []
      };
    }

    const state: OrbitingState = {
      stationary: stationaryOriented,
      moving: movingOrigin,
      reversedMoving,
      currentTranslation: initialTouch.translation,
      nfpVertices: [initialTouch.translation],
      singularityPoints: [],
      visitedConfigs: new Set()
    };

    const initialKey = configKey(
      initialTouch.translation,
      initialTouch.type,
      initialTouch.stationaryVertex ?? initialTouch.stationaryEdge?.[0] ?? 0,
      initialTouch.movingVertex ?? initialTouch.movingEdge?.[0] ?? 0
    );
    state.visitedConfigs.add(initialKey);

    const maxIterations = stationary.length * moving.length * 4;
    let iterations = 0;
    let completedLoop = false;
    const nfpParts: Point[][] = [];
    let currentPart: Point[] = [initialTouch.translation];

    while (iterations < maxIterations && !completedLoop) {
      iterations++;

      const touchingPairs = findAllTouchingPairs(
        state.stationary,
        state.reversedMoving,
        state.currentTranslation
      );

      if (touchingPairs.length === 0) {
        break;
      }

      let nextPair: TouchingPair | null = null;
      let maxAngle = -Infinity;

      for (const pair of touchingPairs) {
        const newTranslation = computeTranslationForPair(
          state.stationary,
          state.reversedMoving,
          pair,
          state.currentTranslation
        );

        const delta = geom.subtract(newTranslation, state.currentTranslation);
        if (Math.abs(delta.x) < EPSILON && Math.abs(delta.y) < EPSILON) {
          continue;
        }

        const key = configKey(
          newTranslation,
          pair.type,
          pair.stationaryVertex ?? pair.stationaryEdge?.[0] ?? 0,
          pair.movingVertex ?? pair.movingEdge?.[0] ?? 0
        );

        if (state.visitedConfigs.has(key)) {
          const startDist = geom.distance(newTranslation, initialTouch.translation);
          if (startDist < 1e-6 && currentPart.length > 2) {
            completedLoop = true;
          }
          continue;
        }

        const prevDir = currentPart.length >= 2
          ? geom.subtract(state.currentTranslation, currentPart[currentPart.length - 2])
          : { x: 1, y: 0 };

        const newDir = geom.subtract(newTranslation, state.currentTranslation);

        const cross = geom.cross(prevDir, newDir);
        const dot = geom.dot(prevDir, newDir);
        const angle = Math.atan2(cross, dot);

        if (angle > maxAngle) {
          maxAngle = angle;
          nextPair = { ...pair, translation: newTranslation };
        }
      }

      if (!nextPair) {
        break;
      }

      const newTranslation = nextPair.translation;
      const key = configKey(
        newTranslation,
        nextPair.type,
        nextPair.stationaryVertex ?? nextPair.stationaryEdge?.[0] ?? 0,
        nextPair.movingVertex ?? nextPair.movingEdge?.[0] ?? 0
      );

      state.visitedConfigs.add(key);

      const segStart = state.currentTranslation;
      const segEnd = newTranslation;

      let hasIntersection = false;
      for (let i = 0; i < currentPart.length - 2; i++) {
        if (geom.doLinesIntersect(segStart, segEnd, currentPart[i], currentPart[i + 1])) {
          hasIntersection = true;
          break;
        }
      }

      if (hasIntersection && currentPart.length > 3) {
        nfpParts.push([...currentPart]);
        currentPart = [newTranslation];
      } else {
        currentPart.push(newTranslation);
      }

      state.currentTranslation = newTranslation;
      state.nfpVertices.push(newTranslation);

      if (nextPair.type === 'vertex-vertex' || nextPair.type === 'edge-edge') {
        if (opts.detectSingularities) {
          state.singularityPoints.push(newTranslation);
        }
      }

      const distToStart = geom.distance(newTranslation, initialTouch.translation);
      if (distToStart < 1e-6 && currentPart.length > 2) {
        completedLoop = true;
      }
    }

    if (currentPart.length > 2) {
      nfpParts.push(currentPart);
    }

    let finalNFP: Point[];
    if (!isConvex(stationaryOriented) || !isConvex(movingOrigin)) {
      try {
        finalNFP = mergeNFPParts(nfpParts);
      } catch (e) {
        finalNFP = nfpParts.length > 0 ? nfpParts[0] : [];
      }
    } else {
      finalNFP = nfpParts.length > 0 ? nfpParts[0] : [];
    }

    if (finalNFP.length < 3) {
      return {
        polygon: [],
        valid: false,
        error: 'Failed to generate valid NFP polygon',
        singularityPoints: state.singularityPoints
      };
    }

    const singularities = detectSingularities(finalNFP, opts);
    const allSingularities = [...new Set([...state.singularityPoints, ...singularities])];

    return {
      polygon: finalNFP,
      valid: true,
      singularityPoints: allSingularities
    };

  } catch (error) {
    return {
      polygon: [],
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error during NFP computation',
      singularityPoints: []
    };
  }
}

export function computeInnerNFP(container: Point[], polygon: Point[]): NFPResult {
  if (container.length < 3 || polygon.length < 3) {
    return {
      polygon: [],
      valid: false,
      error: 'Polygons must have at least 3 vertices',
      singularityPoints: []
    };
  }

  try {
    const containerBounds = geom.getPolygonBounds(container);
    const polyBounds = geom.getPolygonBounds(polygon);

    const polyWidth = polyBounds.maxX - polyBounds.minX;
    const polyHeight = polyBounds.maxY - polyBounds.minY;
    const containerWidth = containerBounds.maxX - containerBounds.minX;
    const containerHeight = containerBounds.maxY - containerBounds.minY;

    if (polyWidth > containerWidth || polyHeight > containerHeight) {
      return {
        polygon: [],
        valid: false,
        error: 'Polygon is larger than container',
        singularityPoints: []
      };
    }

    const containerOrigin = translateToOrigin(container);
    const polygonOrigin = translateToOrigin(polygon);

    const isContainerCCW = geom.isPolygonCCW(containerOrigin);
    const containerOriented = isContainerCCW ? containerOrigin : geom.reversePolygon(containerOrigin);

    const minkowskiSum = computeMinkowskiSum(containerOriented, polygonOrigin, true);

    if (minkowskiSum.length < 3) {
      return {
        polygon: [],
        valid: false,
        error: 'Failed to compute inner NFP',
        singularityPoints: []
      };
    }

    const translatedSum = minkowskiSum.map(p => ({
      x: p.x + polyBounds.minX,
      y: p.y + polyBounds.minY
    }));

    try {
      const containerPoly = toClippingPolygon(containerOriented);
      const sumPoly = toClippingPolygon(translatedSum);
      const intersection = polygonClipping.intersection(containerPoly, sumPoly);

      if (intersection.length > 0 && intersection[0].length > 0) {
        const resultPoly = fromClippingPolygon(intersection[0] as polygonClipping.Polygon);
        const singularities = detectSingularities(resultPoly, { detectSingularities: true });

        return {
          polygon: resultPoly,
          valid: true,
          singularityPoints: singularities
        };
      }
    } catch (e) {
      console.warn('Inner NFP intersection failed:', e);
    }

    const singularities = detectSingularities(translatedSum, { detectSingularities: true });
    return {
      polygon: translatedSum,
      valid: true,
      singularityPoints: singularities
    };

  } catch (error) {
    return {
      polygon: [],
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error during inner NFP computation',
      singularityPoints: []
    };
  }
}

function computeMinkowskiSum(a: Point[], b: Point[], isInner: boolean = false): Point[] {
  const result: Point[] = [];

  if (a.length === 0 || b.length === 0) return result;

  const orientedA = isInner ? geom.reversePolygon(a) : a;

  for (const pa of orientedA) {
    for (const pb of b) {
      result.push({
        x: pa.x - pb.x,
        y: pa.y - pb.y
      });
    }
  }

  return convexHull(result);
}

function convexHull(points: Point[]): Point[] {
  const n = points.length;
  if (n < 3) return points;

  const sorted = [...points].sort((a, b) => {
    if (Math.abs(a.x - b.x) > EPSILON) return a.x - b.x;
    return a.y - b.y;
  });

  const hull: Point[] = [];

  for (let i = 0; i < n; i++) {
    while (hull.length >= 2 &&
      geom.cross(
        geom.subtract(hull[hull.length - 1], hull[hull.length - 2]),
        geom.subtract(sorted[i], hull[hull.length - 1])
      ) <= EPSILON) {
      hull.pop();
    }
    hull.push(sorted[i]);
  }

  const lowerSize = hull.length;
  for (let i = n - 2; i >= 0; i--) {
    while (hull.length > lowerSize &&
      geom.cross(
        geom.subtract(hull[hull.length - 1], hull[hull.length - 2]),
        geom.subtract(sorted[i], hull[hull.length - 1])
      ) <= EPSILON) {
      hull.pop();
    }
    hull.push(sorted[i]);
  }

  hull.pop();
  return hull;
}

export function translatePolygonToNFP(
  polygon: Point[],
  nfpPoint: Point,
  referencePoint: Point
): Point[] {
  const dx = nfpPoint.x - referencePoint.x;
  const dy = nfpPoint.y - referencePoint.y;
  return geom.translatePolygon(polygon, dx, dy);
}

export function getNFPCandidatePositions(nfp: Point[], referencePoint: Point): Point[] {
  const candidates: Point[] = [];
  
  for (const vertex of nfp) {
    candidates.push({
      x: referencePoint.x + vertex.x,
      y: referencePoint.y + vertex.y
    });
  }
  
  return candidates;
}

export function isPointInsideNFP(point: Point, nfp: Point[], referencePoint: Point): boolean {
  const translated = {
    x: point.x - referencePoint.x,
    y: point.y - referencePoint.y
  };
  
  let inside = false;
  const n = nfp.length;
  
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = nfp[i].x, yi = nfp[i].y;
    const xj = nfp[j].x, yj = nfp[j].y;
    
    if (((yi > translated.y) !== (yj > translated.y)) &&
        (translated.x < (xj - xi) * (translated.y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  
  return inside;
}

export function checkOverlap(A: Point[], B: Point[]): boolean {
  const nfpResult = computeNFP(A, B);
  if (!nfpResult.valid || nfpResult.polygon.length < 3) {
    return checkOverlapFallback(A, B);
  }
  
  const origin: Point = { x: 0, y: 0 };
  return isPointInsideNFP(origin, nfpResult.polygon, origin);
}

function checkOverlapFallback(A: Point[], B: Point[]): boolean {
  for (let i = 0; i < A.length; i++) {
    const a1 = A[i];
    const a2 = A[(i + 1) % A.length];
    
    for (let j = 0; j < B.length; j++) {
      const b1 = B[j];
      const b2 = B[(j + 1) % B.length];
      
      if (geom.doLinesIntersect(a1, a2, b1, b2)) {
        return true;
      }
    }
  }
  
  for (const point of A) {
    if (geom.isPointInPolygon(point, B)) {
      return true;
    }
  }
  
  for (const point of B) {
    if (geom.isPointInPolygon(point, A)) {
      return true;
    }
  }
  
  return false;
}

export function computeGap(A: Point[], B: Point[]): number {
  let minGap = Infinity;
  
  for (let i = 0; i < A.length; i++) {
    const a1 = A[i];
    const a2 = A[(i + 1) % A.length];
    
    for (let j = 0; j < B.length; j++) {
      const b1 = B[j];
      const b2 = B[(j + 1) % B.length];
      
      const gap = segmentDistance(a1, a2, b1, b2);
      if (gap < minGap) {
        minGap = gap;
      }
    }
  }
  
  return minGap;
}

function segmentDistance(p1: Point, p2: Point, p3: Point, p4: Point): number {
  const v = geom.subtract(p2, p1);
  const w = geom.subtract(p4, p3);
  const u = geom.subtract(p1, p3);
  
  const a = geom.dot(v, v);
  const b = geom.dot(v, w);
  const c = geom.dot(w, w);
  const d = geom.dot(v, u);
  const e = geom.dot(w, u);
  
  const denom = a * c - b * b;
  
  if (Math.abs(denom) < EPSILON) {
    return Math.min(
      pointToSegmentDistance(p1, p3, p4),
      pointToSegmentDistance(p2, p3, p4),
      pointToSegmentDistance(p3, p1, p2),
      pointToSegmentDistance(p4, p1, p2)
    );
  }
  
  const s = (b * e - c * d) / denom;
  const t = (a * e - b * d) / denom;
  
  if (s >= 0 && s <= 1 && t >= 0 && t <= 1) {
    const closest1 = geom.add(p1, { x: v.x * s, y: v.y * s });
    const closest2 = geom.add(p3, { x: w.x * t, y: w.y * t });
    return geom.distance(closest1, closest2);
  }
  
  return Math.min(
    pointToSegmentDistance(p1, p3, p4),
    pointToSegmentDistance(p2, p3, p4),
    pointToSegmentDistance(p3, p1, p2),
    pointToSegmentDistance(p4, p1, p2)
  );
}

function pointToSegmentDistance(point: Point, segStart: Point, segEnd: Point): number {
  const v = geom.subtract(segEnd, segStart);
  const w = geom.subtract(point, segStart);
  
  const c1 = geom.dot(w, v);
  if (c1 <= 0) {
    return geom.distance(point, segStart);
  }
  
  const c2 = geom.dot(v, v);
  if (c2 <= c1) {
    return geom.distance(point, segEnd);
  }
  
  const b = c1 / c2;
  const projection = geom.add(segStart, { x: v.x * b, y: v.y * b });
  return geom.distance(point, projection);
}

export function detectZeroWidthGaps(polygons: Point[][], threshold: number = 1e-6): Point[] {
  const zeroGapPoints: Point[] = [];
  
  for (let i = 0; i < polygons.length; i++) {
    for (let j = i + 1; j < polygons.length; j++) {
      const gap = computeGap(polygons[i], polygons[j]);
      if (gap < threshold && gap > EPSILON) {
        const midPoint = findNearbyPoint(polygons[i], polygons[j]);
        if (midPoint) {
          zeroGapPoints.push(midPoint);
        }
      }
    }
  }
  
  return zeroGapPoints;
}

function findNearbyPoint(A: Point[], B: Point[]): Point | null {
  let minDist = Infinity;
  let closestPoint: Point | null = null;
  
  for (const a of A) {
    for (const b of B) {
      const dist = geom.distance(a, b);
      if (dist < minDist) {
        minDist = dist;
        closestPoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      }
    }
  }
  
  return closestPoint;
}

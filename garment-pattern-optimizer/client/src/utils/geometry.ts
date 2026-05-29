import type { Point } from '../types';

const EPSILON = 1e-8;

export function add(p1: Point, p2: Point): Point {
  return { x: p1.x + p2.x, y: p1.y + p2.y };
}

export function subtract(p1: Point, p2: Point): Point {
  return { x: p1.x - p2.x, y: p1.y - p2.y };
}

export function multiply(p: Point, scalar: number): Point {
  return { x: p.x * scalar, y: p.y * scalar };
}

export function dot(p1: Point, p2: Point): number {
  return p1.x * p2.x + p1.y * p2.y;
}

export function cross(p1: Point, p2: Point): number {
  return p1.x * p2.y - p1.y * p2.x;
}

export function normalize(p: Point): Point {
  const len = Math.sqrt(p.x * p.x + p.y * p.y);
  if (len < EPSILON) return { x: 0, y: 0 };
  return { x: p.x / len, y: p.y / len };
}

export function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function rotatePolygon(points: Point[], angle: number, center: Point): Point[] {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return points.map(p => ({
    x: center.x + (p.x - center.x) * cos - (p.y - center.y) * sin,
    y: center.y + (p.x - center.x) * sin + (p.y - center.y) * cos
  }));
}

export function translatePolygon(points: Point[], dx: number, dy: number): Point[] {
  return points.map(p => ({ x: p.x + dx, y: p.y + dy }));
}

export function getPolygonCenter(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  
  const area = getPolygonArea(points);
  if (Math.abs(area) < EPSILON) {
    let sumX = 0, sumY = 0;
    for (const p of points) {
      sumX += p.x;
      sumY += p.y;
    }
    return { x: sumX / points.length, y: sumY / points.length };
  }
  
  let cx = 0, cy = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const factor = p1.x * p2.y - p2.x * p1.y;
    cx += (p1.x + p2.x) * factor;
    cy += (p1.y + p2.y) * factor;
  }
  
  return { x: cx / (6 * area), y: cy / (6 * area) };
}

export function getPolygonArea(points: Point[]): number {
  const n = points.length;
  if (n < 3) return 0;
  
  let area = 0;
  for (let i = 0; i < n; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    area += p1.x * p2.y - p2.x * p1.y;
  }
  return area / 2;
}

export function getPolygonBounds(points: Point[]): { minX: number; maxX: number; minY: number; maxY: number } {
  if (points.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }
  
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  
  return { minX, maxX, minY, maxY };
}

export function isPointNearSegment(point: Point, segStart: Point, segEnd: Point, threshold: number = 5): boolean {
  const v = subtract(segEnd, segStart);
  const w = subtract(point, segStart);
  
  const c1 = dot(w, v);
  if (c1 <= 0) return distance(point, segStart) <= threshold;
  
  const c2 = dot(v, v);
  if (c2 <= c1) return distance(point, segEnd) <= threshold;
  
  const b = c1 / c2;
  const pb = add(segStart, multiply(v, b));
  return distance(point, pb) <= threshold;
}

export function findNearestVertex(point: Point, points: Point[], threshold: number = 10): number | null {
  let nearestIndex: number | null = null;
  let minDist = threshold;
  
  for (let i = 0; i < points.length; i++) {
    const dist = distance(point, points[i]);
    if (dist < minDist) {
      minDist = dist;
      nearestIndex = i;
    }
  }
  
  return nearestIndex;
}

export function pointsToPathData(points: Point[]): string {
  if (points.length === 0) return '';
  
  const [first, ...rest] = points;
  const pathParts = [`M ${first.x} ${first.y}`];
  
  for (const p of rest) {
    pathParts.push(`L ${p.x} ${p.y}`);
  }
  
  pathParts.push('Z');
  return pathParts.join(' ');
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function getGrainLinePoints(center: Point, angle: number, length: number): [Point, Point] {
  const dx = Math.cos(angle) * length / 2;
  const dy = Math.sin(angle) * length / 2;
  return [
    { x: center.x - dx, y: center.y - dy },
    { x: center.x + dx, y: center.y + dy }
  ];
}

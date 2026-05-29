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

export function scalePolygon(points: Point[], sx: number, sy: number): Point[] {
  return points.map(p => ({ x: p.x * sx, y: p.y * sy }));
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

export function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  const n = polygon.length;
  if (n < 3) return false;
  
  let inside = false;
  const { x, y } = point;
  
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  
  return inside;
}

export function isPolygonCCW(points: Point[]): boolean {
  return getPolygonArea(points) > 0;
}

export function reversePolygon(points: Point[]): Point[] {
  return [...points].reverse();
}

function orientation(p1: Point, p2: Point, p3: Point): number {
  const val = (p2.y - p1.y) * (p3.x - p2.x) - (p2.x - p1.x) * (p3.y - p2.y);
  if (Math.abs(val) < EPSILON) return 0;
  return val > 0 ? 1 : 2;
}

function onSegment(p: Point, p1: Point, p2: Point): boolean {
  return p.x <= Math.max(p1.x, p2.x) && p.x >= Math.min(p1.x, p2.x) &&
         p.y <= Math.max(p1.y, p2.y) && p.y >= Math.min(p1.y, p2.y);
}

export function lineIntersection(p1: Point, p2: Point, p3: Point, p4: Point): Point | null {
  const denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
  
  if (Math.abs(denom) < EPSILON) {
    return null;
  }
  
  const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
  const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;
  
  if (ua >= -EPSILON && ua <= 1 + EPSILON && ub >= -EPSILON && ub <= 1 + EPSILON) {
    return {
      x: p1.x + ua * (p2.x - p1.x),
      y: p1.y + ua * (p2.y - p1.y)
    };
  }
  
  return null;
}

export function doLinesIntersect(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
  const o1 = orientation(p1, p2, p3);
  const o2 = orientation(p1, p2, p4);
  const o3 = orientation(p3, p4, p1);
  const o4 = orientation(p3, p4, p2);
  
  if (o1 !== o2 && o3 !== o4) return true;
  
  if (o1 === 0 && onSegment(p3, p1, p2)) return true;
  if (o2 === 0 && onSegment(p4, p1, p2)) return true;
  if (o3 === 0 && onSegment(p1, p3, p4)) return true;
  if (o4 === 0 && onSegment(p2, p3, p4)) return true;
  
  return false;
}

export function getEdgeNormal(p1: Point, p2: Point): Point {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return normalize({ x: -dy, y: dx });
}

export function isSimplePolygon(points: Point[]): boolean {
  const n = points.length;
  if (n < 3) return false;
  
  for (let i = 0; i < n; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    
    for (let j = i + 2; j < n; j++) {
      if (j === (i + 1) % n) continue;
      if (i === (j + 1) % n) continue;
      
      const p3 = points[j];
      const p4 = points[(j + 1) % n];
      
      if (doLinesIntersect(p1, p2, p3, p4)) {
        return false;
      }
    }
  }
  
  return true;
}

export function findSelfIntersections(points: Point[]): Point[] {
  const intersections: Point[] = [];
  const n = points.length;
  if (n < 3) return intersections;
  
  for (let i = 0; i < n; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    
    for (let j = i + 2; j < n; j++) {
      if (j === (i + 1) % n) continue;
      if (i === (j + 1) % n) continue;
      
      const p3 = points[j];
      const p4 = points[(j + 1) % n];
      
      const intersection = lineIntersection(p1, p2, p3, p4);
      if (intersection) {
        const exists = intersections.some(p => 
          Math.abs(p.x - intersection.x) < EPSILON && 
          Math.abs(p.y - intersection.y) < EPSILON
        );
        if (!exists) {
          intersections.push(intersection);
        }
      }
    }
  }
  
  return intersections;
}

export function isPolygonConvex(points: Point[]): boolean {
  const n = points.length;
  if (n < 3) return false;
  
  let sign = 0;
  
  for (let i = 0; i < n; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];
    
    const crossVal = cross(subtract(p2, p1), subtract(p3, p2));
    
    if (Math.abs(crossVal) > EPSILON) {
      const currentSign = crossVal > 0 ? 1 : -1;
      
      if (sign === 0) {
        sign = currentSign;
      } else if (sign !== currentSign) {
        return false;
      }
    }
  }
  
  return true;
}

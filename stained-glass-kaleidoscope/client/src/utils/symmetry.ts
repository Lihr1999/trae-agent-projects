import { Point } from '../types';

export function applyTransformation(
  point: Point,
  matrix: number[][]
): Point {
  if (matrix.length === 3) {
    const x = matrix[0][0] * point.x + matrix[0][1] * point.y + matrix[0][2];
    const y = matrix[1][0] * point.x + matrix[1][1] * point.y + matrix[1][2];
    const w = matrix[2][0] * point.x + matrix[2][1] * point.y + matrix[2][2];
    return { x: x / w, y: y / w };
  } else {
    const x =
      matrix[0][0] * point.x +
      matrix[0][1] * point.y +
      matrix[0][3];
    const y =
      matrix[1][0] * point.x +
      matrix[1][1] * point.y +
      matrix[1][3];
    const w =
      matrix[3][0] * point.x +
      matrix[3][1] * point.y +
      matrix[3][3];
    return { x: x / w, y: y / w };
  }
}

export function transformPolygon(
  vertices: Point[],
  matrix: number[][]
): Point[] {
  return vertices.map((v) => applyTransformation(v, matrix));
}

export function generateSymmetricCopies(
  baseVertices: Point[],
  matrices: number[][][]
): Point[][] {
  return matrices.map((matrix) => transformPolygon(baseVertices, matrix));
}

export function lerpPoint(a: Point, b: Point, t: number): Point {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

export function lerpPolygon(a: Point[], b: Point[], t: number): Point[] {
  if (a.length !== b.length) {
    const minLen = Math.min(a.length, b.length);
    return a.slice(0, minLen).map((p, i) => lerpPoint(p, b[i], t));
  }
  return a.map((p, i) => lerpPoint(p, b[i], t));
}

export function polygonCenter(vertices: Point[]): Point {
  if (vertices.length === 0) return { x: 0, y: 0 };
  const sum = vertices.reduce(
    (acc, v) => ({ x: acc.x + v.x, y: acc.y + v.y }),
    { x: 0, y: 0 }
  );
  return {
    x: sum.x / vertices.length,
    y: sum.y / vertices.length,
  };
}

export function scalePolygon(vertices: Point[], scale: number): Point[] {
  const center = polygonCenter(vertices);
  return vertices.map((v) => ({
    x: center.x + (v.x - center.x) * scale,
    y: center.y + (v.y - center.y) * scale,
  }));
}

export function rotatePolygon(vertices: Point[], angle: number): Point[] {
  const center = polygonCenter(vertices);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return vertices.map((v) => {
    const dx = v.x - center.x;
    const dy = v.y - center.y;
    return {
      x: center.x + dx * cos - dy * sin,
      y: center.y + dx * sin + dy * cos,
    };
  });
}

export function polygonArea(vertices: Point[]): number {
  if (vertices.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    area += vertices[i].x * vertices[j].y;
    area -= vertices[j].x * vertices[i].y;
  }
  return Math.abs(area) / 2;
}

export function isPointInPolygon(point: Point, vertices: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].x, yi = vertices[i].y;
    const xj = vertices[j].x, yj = vertices[j].y;
    
    const intersect = ((yi > point.y) !== (yj > point.y))
        && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

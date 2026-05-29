import { Point, DelaunayResult } from '../types';

export class DelaunayTriangulation {
  private points: Point[] = [];
  private triangles: number[][] = [];

  triangulate(points: Point[]): DelaunayResult {
    this.points = [...points];
    this.triangles = [];

    if (points.length < 3) {
      return { points: this.points, triangles: [], edges: [] };
    }

    const { minX, minY, maxX, maxY } = this.getBoundingBox();
    const dx = maxX - minX;
    const dy = maxY - minY;
    const deltaMax = Math.max(dx, dy);
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;

    const superTriangle: number[] = [
      this.points.length,
      this.points.length + 1,
      this.points.length + 2
    ];

    this.points.push(
      { x: midX - 20 * deltaMax, y: midY - deltaMax },
      { x: midX, y: midY + 20 * deltaMax },
      { x: midX + 20 * deltaMax, y: midY - deltaMax }
    );

    this.triangles.push(superTriangle);

    for (let i = 0; i < points.length; i++) {
      this.addPoint(i);
    }

    this.triangles = this.triangles.filter(tri =>
      !tri.some(idx => idx >= points.length)
    );

    const edges = this.extractEdges();

    return {
      points: this.points.slice(0, points.length),
      triangles: this.triangles,
      edges
    };
  }

  private getBoundingBox(): { minX: number; minY: number; maxX: number; maxY: number } {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const p of this.points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }

    return { minX, minY, maxX, maxY };
  }

  private addPoint(pointIndex: number): void {
    const edgeBuffer: number[][] = [];
    const newTriangles: number[][] = [];

    for (let i = this.triangles.length - 1; i >= 0; i--) {
      const tri = this.triangles[i];
      if (this.isPointInCircumcircle(pointIndex, tri)) {
        edgeBuffer.push([tri[0], tri[1]]);
        edgeBuffer.push([tri[1], tri[2]]);
        edgeBuffer.push([tri[2], tri[0]]);
        this.triangles.splice(i, 1);
      }
    }

    const uniqueEdges = this.removeDuplicateEdges(edgeBuffer);

    for (const edge of uniqueEdges) {
      newTriangles.push([edge[0], edge[1], pointIndex]);
    }

    this.triangles.push(...newTriangles);
  }

  private isPointInCircumcircle(pointIndex: number, triangle: number[]): boolean {
    const p = this.points[pointIndex];
    const a = this.points[triangle[0]];
    const b = this.points[triangle[1]];
    const c = this.points[triangle[2]];

    const ax = a.x - p.x;
    const ay = a.y - p.y;
    const bx = b.x - p.x;
    const by = b.y - p.y;
    const cx = c.x - p.x;
    const cy = c.y - p.y;

    const det = (
      (ax * ax + ay * ay) * (bx * cy - cx * by) -
      (bx * bx + by * by) * (ax * cy - cx * ay) +
      (cx * cx + cy * cy) * (ax * by - bx * ay)
    );

    return det > 0;
  }

  private removeDuplicateEdges(edges: number[][]): number[][] {
    const uniqueEdges: number[][] = [];
    const edgeSet = new Set<string>();

    for (const edge of edges) {
      const sorted = [...edge].sort((a, b) => a - b);
      const key = `${sorted[0]},${sorted[1]}`;
      
      if (edgeSet.has(key)) {
        edgeSet.delete(key);
      } else {
        edgeSet.add(key);
      }
    }

    for (const key of edgeSet) {
      const [a, b] = key.split(',').map(Number);
      uniqueEdges.push([a, b]);
    }

    return uniqueEdges;
  }

  private extractEdges(): number[][] {
    const edgeSet = new Set<string>();

    for (const tri of this.triangles) {
      for (let i = 0; i < 3; i++) {
        const a = tri[i];
        const b = tri[(i + 1) % 3];
        const sorted = [Math.min(a, b), Math.max(a, b)];
        edgeSet.add(`${sorted[0]},${sorted[1]}`);
      }
    }

    return Array.from(edgeSet).map(key => key.split(',').map(Number));
  }

  flipEdge(triangulation: DelaunayResult, edgeIndex: number): DelaunayResult {
    const { points, triangles, edges } = triangulation;
    const edge = edges[edgeIndex];
    
    const adjacentTriangles = triangles.filter(tri =>
      (tri.includes(edge[0]) && tri.includes(edge[1]))
    );

    if (adjacentTriangles.length !== 2) return triangulation;

    const otherVertices = adjacentTriangles.map(tri =>
      tri.find(v => v !== edge[0] && v !== edge[1])!
    );

    const newTriangles = [
      [edge[0], otherVertices[0], otherVertices[1]],
      [edge[1], otherVertices[1], otherVertices[0]]
    ];

    const remainingTriangles = triangles.filter(tri =>
      !(tri.includes(edge[0]) && tri.includes(edge[1]) &&
        tri.includes(otherVertices[0]) || tri.includes(otherVertices[1]))
    );

    return {
      points,
      triangles: [...remainingTriangles, ...newTriangles],
      edges: this.extractEdgesFromTriangles([...remainingTriangles, ...newTriangles])
    };
  }

  private extractEdgesFromTriangles(triangles: number[][]): number[][] {
    const edgeSet = new Set<string>();

    for (const tri of triangles) {
      for (let i = 0; i < 3; i++) {
        const a = tri[i];
        const b = tri[(i + 1) % 3];
        const sorted = [Math.min(a, b), Math.max(a, b)];
        edgeSet.add(`${sorted[0]},${sorted[1]}`);
      }
    }

    return Array.from(edgeSet).map(key => key.split(',').map(Number));
  }
}

export const delaunay = new DelaunayTriangulation();

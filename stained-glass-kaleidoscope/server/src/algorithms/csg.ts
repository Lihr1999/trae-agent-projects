import { Point, CSGNode, GlassFragment } from '../types';

export class CSGOperator {
  union(polygonA: Point[], polygonB: Point[]): Point[] {
    const centroidA = this.centroid(polygonA);
    const centroidB = this.centroid(polygonB);
    
    const allPoints = [...polygonA, ...polygonB];
    const center = {
      x: (centroidA.x + centroidB.x) / 2,
      y: (centroidA.y + centroidB.y) / 2
    };

    return this.convexHull(allPoints);
  }

  intersection(polygonA: Point[], polygonB: Point[]): Point[] {
    const result: Point[] = [];
    const tempPoints: Point[] = [];
    
    for (let i = 0; i < polygonA.length; i++) {
      const p1 = polygonA[i];
      const p2 = polygonA[(i + 1) % polygonA.length];
      
      const intersections = this.clipEdge(p1, p2, polygonB);
      tempPoints.push(...intersections);
    }

    for (const p of polygonA) {
      if (this.isPointInPolygon(p, polygonB)) {
        tempPoints.push(p);
      }
    }

    if (tempPoints.length >= 3) {
      return this.convexHull(tempPoints);
    }

    return tempPoints;
  }

  difference(polygonA: Point[], polygonB: Point[]): Point[] {
    const result: Point[] = [];
    
    for (const p of polygonA) {
      if (!this.isPointInPolygon(p, polygonB)) {
        result.push(p);
      }
    }

    if (result.length < 3) {
      return polygonA;
    }

    return this.convexHull(result);
  }

  private centroid(polygon: Point[]): Point {
    let x = 0, y = 0;
    for (const p of polygon) {
      x += p.x;
      y += p.y;
    }
    return { x: x / polygon.length, y: y / polygon.length };
  }

  private convexHull(points: Point[]): Point[] {
    if (points.length < 3) return points;

    const sorted = [...points].sort((a, b) =>
      a.x === b.x ? a.y - b.y : a.x - b.x
    );

    const lower: Point[] = [];
    for (const p of sorted) {
      while (lower.length >= 2 && this.cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
        lower.pop();
      }
      lower.push(p);
    }

    const upper: Point[] = [];
    for (let i = sorted.length - 1; i >= 0; i--) {
      const p = sorted[i];
      while (upper.length >= 2 && this.cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
        upper.pop();
      }
      upper.push(p);
    }

    lower.pop();
    upper.pop();
    return [...lower, ...upper];
  }

  private cross(o: Point, a: Point, b: Point): number {
    return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  }

  private isPointInPolygon(point: Point, polygon: Point[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;

      if (((yi > point.y) !== (yj > point.y)) &&
          (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }

  private clipEdge(p1: Point, p2: Point, polygon: Point[]): Point[] {
    const intersections: Point[] = [];
    
    for (let i = 0; i < polygon.length; i++) {
      const v1 = polygon[i];
      const v2 = polygon[(i + 1) % polygon.length];
      
      const intersection = this.lineIntersection(p1, p2, v1, v2);
      if (intersection) {
        intersections.push(intersection);
      }
    }

    return intersections;
  }

  private lineIntersection(p1: Point, p2: Point, p3: Point, p4: Point): Point | null {
    const denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
    if (Math.abs(denom) < 0.0001) return null;

    const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
    const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;

    if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
      return {
        x: p1.x + ua * (p2.x - p1.x),
        y: p1.y + ua * (p2.y - p1.y)
      };
    }

    return null;
  }

  evaluateCSGTree(root: CSGNode, fragments: Map<string, GlassFragment>): Point[] {
    if (root.type === 'primitive') {
      const fragment = fragments.get(root.fragmentId!);
      return fragment ? fragment.vertices : [];
    }

    if (!root.children || root.children.length === 0) return [];

    let result = this.evaluateCSGTree(root.children[0], fragments);

    for (let i = 1; i < root.children.length; i++) {
      const childPolygon = this.evaluateCSGTree(root.children[i], fragments);
      
      switch (root.operation) {
        case 'union':
          result = this.union(result, childPolygon);
          break;
        case 'intersection':
          result = this.intersection(result, childPolygon);
          break;
        case 'difference':
          result = this.difference(result, childPolygon);
          break;
      }
    }

    return result;
  }
}

export const csgOperator = new CSGOperator();

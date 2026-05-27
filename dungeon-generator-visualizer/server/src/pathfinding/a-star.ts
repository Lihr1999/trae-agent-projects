import { TileType } from '../types';
import type { Position, PathResult } from '../types';

interface Node {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: Node | null;
}

export class AStarPathfinder {
  private tiles: TileType[][];
  private width: number;
  private height: number;
  private allowDiagonal: boolean;

  constructor(tiles: TileType[][], allowDiagonal: boolean = false) {
    this.tiles = tiles;
    this.height = tiles.length;
    this.width = tiles[0]?.length || 0;
    this.allowDiagonal = allowDiagonal;
  }

  findPath(start: Position, end: Position): PathResult {
    const startTime = performance.now();
    const visited: Position[] = [];
    let nodesExpanded = 0;
    let maxOpenSetSize = 0;

    const openSet: Node[] = [];
    const closedSet = new Set<string>();

    const startNode: Node = {
      x: start.x,
      y: start.y,
      g: 0,
      h: this.heuristic(start, end),
      f: this.heuristic(start, end),
      parent: null
    };

    openSet.push(startNode);

    while (openSet.length > 0) {
      maxOpenSetSize = Math.max(maxOpenSetSize, openSet.length);
      
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!;
      const currentKey = `${current.x},${current.y}`;

      if (current.x === end.x && current.y === end.y) {
        const path = this.reconstructPath(current);
        const endTime = performance.now();
        return {
          algorithm: 'A*',
          path,
          visited,
          nodesExpanded,
          pathLength: path.length,
          timeMs: endTime - startTime,
          openSetSize: openSet.length,
          closedSetSize: closedSet.size,
          maxOpenSetSize,
          found: true
        };
      }

      if (closedSet.has(currentKey)) continue;
      closedSet.add(currentKey);
      nodesExpanded++;
      visited.push({ x: current.x, y: current.y });

      const neighbors = this.getNeighbors(current, end);
      
      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.x},${neighbor.y}`;
        if (closedSet.has(neighborKey)) continue;

        const existing = openSet.find(n => n.x === neighbor.x && n.y === neighbor.y);
        
        if (!existing) {
          openSet.push(neighbor);
        } else if (neighbor.g < existing.g) {
          existing.g = neighbor.g;
          existing.f = neighbor.f;
          existing.parent = neighbor.parent;
        }
      }
    }

    const endTime = performance.now();
    return {
      algorithm: 'A*',
      path: [],
      visited,
      nodesExpanded,
      pathLength: 0,
      timeMs: endTime - startTime,
      openSetSize: 0,
      closedSetSize: closedSet.size,
      maxOpenSetSize,
      found: false
    };
  }

  private getNeighbors(node: Node, end: Position): Node[] {
    const neighbors: Node[] = [];
    const directions = this.allowDiagonal
      ? [
          { dx: 0, dy: -1, cost: 1 },
          { dx: 0, dy: 1, cost: 1 },
          { dx: -1, dy: 0, cost: 1 },
          { dx: 1, dy: 0, cost: 1 },
          { dx: -1, dy: -1, cost: 1.414 },
          { dx: 1, dy: -1, cost: 1.414 },
          { dx: -1, dy: 1, cost: 1.414 },
          { dx: 1, dy: 1, cost: 1.414 }
        ]
      : [
          { dx: 0, dy: -1, cost: 1 },
          { dx: 0, dy: 1, cost: 1 },
          { dx: -1, dy: 0, cost: 1 },
          { dx: 1, dy: 0, cost: 1 }
        ];

    for (const dir of directions) {
      const nx = node.x + dir.dx;
      const ny = node.y + dir.dy;

      if (this.isWalkable(nx, ny)) {
        const g = node.g + dir.cost;
        const h = this.heuristic({ x: nx, y: ny }, end);
        neighbors.push({
          x: nx,
          y: ny,
          g,
          h,
          f: g + h,
          parent: node
        });
      }
    }

    return neighbors;
  }

  private heuristic(a: Position, b: Position): number {
    if (this.allowDiagonal) {
      const dx = Math.abs(a.x - b.x);
      const dy = Math.abs(a.y - b.y);
      return (dx + dy) + (1.414 - 2) * Math.min(dx, dy);
    }
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  private isWalkable(x: number, y: number): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
    const tile = this.tiles[y][x];
    return tile !== TileType.WALL;
  }

  private reconstructPath(endNode: Node): Position[] {
    const path: Position[] = [];
    let current: Node | null = endNode;
    while (current) {
      path.unshift({ x: current.x, y: current.y });
      current = current.parent;
    }
    return path;
  }
}

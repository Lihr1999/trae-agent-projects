import { TileType } from '../types';
import type { Position, PathResult } from '../types';

interface Node {
  x: number;
  y: number;
  distance: number;
  parent: Node | null;
}

export class DijkstraPathfinder {
  private tiles: TileType[][];
  private width: number;
  private height: number;

  constructor(tiles: TileType[][]) {
    this.tiles = tiles;
    this.height = tiles.length;
    this.width = tiles[0]?.length || 0;
  }

  findPath(start: Position, end: Position): PathResult {
    const startTime = performance.now();
    const visited: Position[] = [];
    let nodesExpanded = 0;
    let maxOpenSetSize = 0;

    const distances: number[][] = Array(this.height)
      .fill(null)
      .map(() => Array(this.width).fill(Infinity));
    
    const nodes: (Node | null)[][] = Array(this.height)
      .fill(null)
      .map(() => Array(this.width).fill(null));
    
    const openSet: Node[] = [];
    const closedSet = new Set<string>();

    const startNode: Node = {
      x: start.x,
      y: start.y,
      distance: 0,
      parent: null
    };

    distances[start.y][start.x] = 0;
    nodes[start.y][start.x] = startNode;
    openSet.push(startNode);

    while (openSet.length > 0) {
      maxOpenSetSize = Math.max(maxOpenSetSize, openSet.length);
      
      openSet.sort((a, b) => a.distance - b.distance);
      const current = openSet.shift()!;
      const currentKey = `${current.x},${current.y}`;

      if (current.x === end.x && current.y === end.y) {
        const path = this.reconstructPath(current);
        const endTime = performance.now();
        return {
          algorithm: 'Dijkstra',
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

      const directions = [
        { dx: 0, dy: -1, cost: 1 },
        { dx: 0, dy: 1, cost: 1 },
        { dx: -1, dy: 0, cost: 1 },
        { dx: 1, dy: 0, cost: 1 }
      ];

      for (const dir of directions) {
        const nx = current.x + dir.dx;
        const ny = current.y + dir.dy;

        if (this.isWalkable(nx, ny)) {
          const newDist = current.distance + dir.cost;
          const neighborKey = `${nx},${ny}`;
          
          if (closedSet.has(neighborKey)) continue;

          if (newDist < distances[ny][nx]) {
            distances[ny][nx] = newDist;
            
            let neighborNode = nodes[ny][nx];
            if (!neighborNode) {
              neighborNode = {
                x: nx,
                y: ny,
                distance: newDist,
                parent: current
              };
              nodes[ny][nx] = neighborNode;
              openSet.push(neighborNode);
            } else {
              neighborNode.distance = newDist;
              neighborNode.parent = current;
            }
          }
        }
      }
    }

    const endTime = performance.now();
    return {
      algorithm: 'Dijkstra',
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

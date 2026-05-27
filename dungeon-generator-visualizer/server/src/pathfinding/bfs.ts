import type { Position, TileType, PathResult } from '../types';

interface BFSNode {
  x: number;
  y: number;
  parent: BFSNode | null;
}

export class BFSPathfinder {
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

    const queue: BFSNode[] = [];
    const visitedSet = new Set<string>();

    const startNode: BFSNode = {
      x: start.x,
      y: start.y,
      parent: null
    };

    queue.push(startNode);
    visitedSet.add(`${start.x},${start.y}`);

    const directions = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 }
    ];

    while (queue.length > 0) {
      maxOpenSetSize = Math.max(maxOpenSetSize, queue.length);
      
      const current = queue.shift()!;
      nodesExpanded++;
      visited.push({ x: current.x, y: current.y });

      if (current.x === end.x && current.y === end.y) {
        const path = this.reconstructPath(current);
        const endTime = performance.now();
        return {
          algorithm: 'BFS',
          path,
          visited,
          nodesExpanded,
          pathLength: path.length,
          timeMs: endTime - startTime,
          openSetSize: queue.length,
          closedSetSize: visitedSet.size,
          maxOpenSetSize,
          found: true
        };
      }

      for (const dir of directions) {
        const nx = current.x + dir.dx;
        const ny = current.y + dir.dy;
        const key = `${nx},${ny}`;

        if (this.isWalkable(nx, ny) && !visitedSet.has(key)) {
          visitedSet.add(key);
          queue.push({
            x: nx,
            y: ny,
            parent: current
          });
        }
      }
    }

    const endTime = performance.now();
    return {
      algorithm: 'BFS',
      path: [],
      visited,
      nodesExpanded,
      pathLength: 0,
      timeMs: endTime - startTime,
      openSetSize: 0,
      closedSetSize: visitedSet.size,
      maxOpenSetSize,
      found: false
    };
  }

  private isWalkable(x: number, y: number): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
    const tile = this.tiles[y][x];
    return tile !== TileType.WALL;
  }

  private reconstructPath(endNode: BFSNode): Position[] {
    const path: Position[] = [];
    let current: BFSNode | null = endNode;
    while (current) {
      path.unshift({ x: current.x, y: current.y });
      current = current.parent;
    }
    return path;
  }
}

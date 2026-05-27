import type { Position, TileType, PathResult } from '../types';

interface JPSNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: JPSNode | null;
}

export class JPSPathfinder {
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

    const openSet: JPSNode[] = [];
    const closedSet = new Set<string>();
    const openSetMap = new Map<string, JPSNode>();

    const startNode: JPSNode = {
      x: start.x,
      y: start.y,
      g: 0,
      h: this.heuristic(start, end),
      f: this.heuristic(start, end),
      parent: null
    };

    openSet.push(startNode);
    openSetMap.set(`${start.x},${start.y}`, startNode);

    while (openSet.length > 0) {
      maxOpenSetSize = Math.max(maxOpenSetSize, openSet.length);
      
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!;
      const currentKey = `${current.x},${current.y}`;
      
      openSetMap.delete(currentKey);

      if (current.x === end.x && current.y === end.y) {
        const path = this.reconstructPath(current);
        const endTime = performance.now();
        return {
          algorithm: 'JPS',
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

      const successors = this.getSuccessors(current, end);
      
      for (const successor of successors) {
        const successorKey = `${successor.x},${successor.y}`;
        
        if (closedSet.has(successorKey)) continue;

        const existing = openSetMap.get(successorKey);
        
        if (!existing) {
          openSet.push(successor);
          openSetMap.set(successorKey, successor);
        } else if (successor.g < existing.g) {
          existing.g = successor.g;
          existing.f = successor.f;
          existing.parent = successor.parent;
        }
      }
    }

    const endTime = performance.now();
    return {
      algorithm: 'JPS',
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

  private getSuccessors(node: JPSNode, end: Position): JPSNode[] {
    const successors: JPSNode[] = [];
    const directions = this.getPrunedDirections(node);

    for (const dir of directions) {
      const jumpPoint = this.jump(node.x, node.y, dir.dx, dir.dy, end);
      
      if (jumpPoint) {
        const dx = Math.abs(jumpPoint.x - node.x);
        const dy = Math.abs(jumpPoint.y - node.y);
        const cost = Math.sqrt(dx * dx + dy * dy);
        const g = node.g + cost;
        const h = this.heuristic(jumpPoint, end);
        
        successors.push({
          x: jumpPoint.x,
          y: jumpPoint.y,
          g,
          h,
          f: g + h,
          parent: node
        });
      }
    }

    return successors;
  }

  private getPrunedDirections(node: JPSNode): { dx: number; dy: number }[] {
    if (!node.parent) {
      return [
        { dx: 0, dy: -1 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 },
        { dx: -1, dy: -1 },
        { dx: 1, dy: -1 },
        { dx: -1, dy: 1 },
        { dx: 1, dy: 1 }
      ];
    }

    const dx = Math.sign(node.x - node.parent.x);
    const dy = Math.sign(node.y - node.parent.y);
    
    const directions: { dx: number; dy: number }[] = [];

    if (dx !== 0 && dy !== 0) {
      directions.push({ dx, dy: 0 });
      directions.push({ dx: 0, dy });
      directions.push({ dx, dy });
      
      if (!this.isWalkable(node.x - dx, node.y)) {
        directions.push({ dx: -dx, dy });
      }
      if (!this.isWalkable(node.x, node.y - dy)) {
        directions.push({ dx, dy: -dy });
      }
    } else if (dx !== 0) {
      directions.push({ dx, dy: 0 });
      
      if (!this.isWalkable(node.x, node.y - 1)) {
        directions.push({ dx, dy: -1 });
      }
      if (!this.isWalkable(node.x, node.y + 1)) {
        directions.push({ dx, dy: 1 });
      }
    } else {
      directions.push({ dx: 0, dy });
      
      if (!this.isWalkable(node.x - 1, node.y)) {
        directions.push({ dx: -1, dy });
      }
      if (!this.isWalkable(node.x + 1, node.y)) {
        directions.push({ dx: 1, dy });
      }
    }

    return directions;
  }

  private jump(
    x: number,
    y: number,
    dx: number,
    dy: number,
    end: Position
  ): Position | null {
    let nx = x + dx;
    let ny = y + dy;

    while (this.isWalkable(nx, ny)) {
      if (nx === end.x && ny === end.y) {
        return { x: nx, y: ny };
      }

      if (dx !== 0 && dy !== 0) {
        if (
          (this.isWalkable(nx - dx, ny + dy) && !this.isWalkable(nx - dx, ny)) ||
          (this.isWalkable(nx + dx, ny - dy) && !this.isWalkable(nx + dx, ny))
        ) {
          return { x: nx, y: ny };
        }
        
        if (this.jump(nx, ny, dx, 0, end) || this.jump(nx, ny, 0, dy, end)) {
          return { x: nx, y: ny };
        }
      } else if (dx !== 0) {
        if (
          (this.isWalkable(nx + dx, ny + 1) && !this.isWalkable(nx, ny + 1)) ||
          (this.isWalkable(nx + dx, ny - 1) && !this.isWalkable(nx, ny - 1))
        ) {
          return { x: nx, y: ny };
        }
      } else {
        if (
          (this.isWalkable(nx + 1, ny + dy) && !this.isWalkable(nx + 1, ny)) ||
          (this.isWalkable(nx - 1, ny + dy) && !this.isWalkable(nx - 1, ny))
        ) {
          return { x: nx, y: ny };
        }
      }

      nx += dx;
      ny += dy;
    }

    return null;
  }

  private heuristic(a: Position, b: Position): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  private isWalkable(x: number, y: number): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
    const tile = this.tiles[y][x];
    return tile !== TileType.WALL;
  }

  private reconstructPath(endNode: JPSNode): Position[] {
    const path: Position[] = [];
    let current: JPSNode | null = endNode;
    while (current) {
      path.unshift({ x: current.x, y: current.y });
      current = current.parent;
    }
    
    const expandedPath: Position[] = [];
    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i];
      const to = path[i + 1];
      
      const dx = Math.sign(to.x - from.x);
      const dy = Math.sign(to.y - from.y);
      
      let x = from.x;
      let y = from.y;
      
      expandedPath.push({ x, y });
      
      while (x !== to.x || y !== to.y) {
        if (x !== to.x) x += dx;
        if (y !== to.y) y += dy;
        expandedPath.push({ x, y });
      }
    }
    
    if (path.length > 0) {
      expandedPath.push(path[path.length - 1]);
    }
    
    return expandedPath;
  }
}

import type { PathNode, Rack } from '../types';

interface GridCell {
  x: number;
  y: number;
  walkable: boolean;
}

export class AStarPathfinder {
  private grid: GridCell[][];
  private width: number;
  private height: number;

  constructor(width: number, height: number, racks: Rack[]) {
    this.width = width;
    this.height = height;
    this.grid = this.buildGrid(width, height, racks);
  }

  private buildGrid(width: number, height: number, racks: Rack[]): GridCell[][] {
    const grid: GridCell[][] = [];

    for (let y = 0; y < height; y++) {
      grid[y] = [];
      for (let x = 0; x < width; x++) {
        const isRack = racks.some(
          (r) => x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height
        );
        grid[y][x] = { x, y, walkable: !isRack };
      }
    }

    return grid;
  }

  public findPath(startX: number, startY: number, endX: number, endY: number): { x: number; y: number }[] {
    if (!this.isValid(startX, startY) || !this.isValid(endX, endY)) {
      return [];
    }

    if (!this.grid[startY][startX].walkable) {
      const nearestWalkable = this.findNearestWalkable(startX, startY);
      if (nearestWalkable) {
        startX = nearestWalkable.x;
        startY = nearestWalkable.y;
      }
    }

    if (!this.grid[endY][endX].walkable) {
      const nearestWalkable = this.findNearestWalkable(endX, endY);
      if (nearestWalkable) {
        endX = nearestWalkable.x;
        endY = nearestWalkable.y;
      }
    }

    const openSet: PathNode[] = [];
    const closedSet = new Set<string>();

    const startNode: PathNode = {
      x: startX,
      y: startY,
      g: 0,
      h: this.heuristic(startX, startY, endX, endY),
      f: 0,
    };
    startNode.f = startNode.g + startNode.h;
    openSet.push(startNode);

    while (openSet.length > 0) {
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!;

      if (current.x === endX && current.y === endY) {
        return this.reconstructPath(current);
      }

      closedSet.add(`${current.x},${current.y}`);

      const neighbors = this.getNeighbors(current);
      for (const neighbor of neighbors) {
        if (closedSet.has(`${neighbor.x},${neighbor.y}`)) {
          continue;
        }

        const tentativeG = current.g + 1;
        const existing = openSet.find((n) => n.x === neighbor.x && n.y === neighbor.y);

        if (!existing) {
          neighbor.g = tentativeG;
          neighbor.h = this.heuristic(neighbor.x, neighbor.y, endX, endY);
          neighbor.f = neighbor.g + neighbor.h;
          neighbor.parent = current;
          openSet.push(neighbor);
        } else if (tentativeG < existing.g) {
          existing.g = tentativeG;
          existing.f = existing.g + existing.h;
          existing.parent = current;
        }
      }
    }

    return [];
  }

  private isValid(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  private findNearestWalkable(x: number, y: number): { x: number; y: number } | null {
    const directions = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
    ];

    for (let distance = 1; distance < Math.max(this.width, this.height); distance++) {
      for (let i = -distance; i <= distance; i++) {
        for (let j = -distance; j <= distance; j++) {
          if (Math.abs(i) === distance || Math.abs(j) === distance) {
            const nx = x + i;
            const ny = y + j;
            if (this.isValid(nx, ny) && this.grid[ny][nx].walkable) {
              return { x: nx, y: ny };
            }
          }
        }
      }
    }
    return null;
  }

  private getNeighbors(node: PathNode): PathNode[] {
    const directions = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
    ];

    const neighbors: PathNode[] = [];
    for (const dir of directions) {
      const nx = node.x + dir.dx;
      const ny = node.y + dir.dy;
      if (this.isValid(nx, ny) && this.grid[ny][nx].walkable) {
        neighbors.push({ x: nx, y: ny, g: 0, h: 0, f: 0 });
      }
    }

    return neighbors;
  }

  private heuristic(x1: number, y1: number, x2: number, y2: number): number {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
  }

  private reconstructPath(node: PathNode): { x: number; y: number }[] {
    const path: { x: number; y: number }[] = [];
    let current: PathNode | undefined = node;

    while (current) {
      path.unshift({ x: current.x, y: current.y });
      current = current.parent;
    }

    return path;
  }

  public updateObstacles(racks: Rack[]): void {
    this.grid = this.buildGrid(this.width, this.height, racks);
  }
}

export class CollisionDetector {
  private robotPositions: Map<string, { x: number; y: number; path?: { x: number; y: number }[] }> =
    new Map();

  public updateRobotPosition(
    robotId: string,
    x: number,
    y: number,
    path?: { x: number; y: number }[]
  ): void {
    this.robotPositions.set(robotId, { x, y, path });
  }

  public removeRobot(robotId: string): void {
    this.robotPositions.delete(robotId);
  }

  public checkCollision(robotId: string, nextX: number, nextY: number): boolean {
    for (const [id, pos] of this.robotPositions) {
      if (id === robotId) continue;
      if (pos.x === nextX && pos.y === nextY) {
        return true;
      }
    }
    return false;
  }

  public predictConflicts(
    robotId: string,
    path: { x: number; y: number }[]
  ): { step: number; conflictingRobotId: string }[] {
    const conflicts: { step: number; conflictingRobotId: string }[] = [];

    for (let step = 0; step < path.length; step++) {
      const pos = path[step];
      for (const [id, robot] of this.robotPositions) {
        if (id === robotId) continue;
        if (robot.path && step < robot.path.length) {
          if (robot.path[step].x === pos.x && robot.path[step].y === pos.y) {
            conflicts.push({ step, conflictingRobotId: id });
          }
        }
      }
    }

    return conflicts;
  }

  public getCongestionPoints(floorId: string): { x: number; y: number; robotCount: number }[] {
    const pointCounts = new Map<string, number>();

    for (const robot of this.robotPositions.values()) {
      const key = `${robot.x},${robot.y}`;
      pointCounts.set(key, (pointCounts.get(key) || 0) + 1);
    }

    const congestionPoints: { x: number; y: number; robotCount: number }[] = [];
    for (const [key, count] of pointCounts) {
      if (count >= 2) {
        const [x, y] = key.split(',').map(Number);
        congestionPoints.push({ x, y, robotCount: count });
      }
    }

    return congestionPoints;
  }
}

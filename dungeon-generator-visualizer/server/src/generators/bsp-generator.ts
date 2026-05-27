import seedrandom from 'seedrandom';
import { TileType } from '../types';
import type {
  Position,
  Room,
  Corridor,
  Door,
  Chest,
  Monster,
  Trap,
  BSPNode,
  DungeonConfig,
  DungeonResult,
  GenerationStep
} from '../types';

export class BSPDungeonGenerator {
  private rng: seedrandom.PRNG;
  private config: DungeonConfig;
  private tiles: TileType[][];
  private rooms: Room[] = [];
  private corridors: Corridor[] = [];
  private doors: Door[] = [];
  private chests: Chest[] = [];
  private monsters: Monster[] = [];
  private traps: Trap[] = [];
  private bspTree?: BSPNode;
  private generationSteps: GenerationStep[] = [];
  private nodeIdCounter = 0;
  private roomIdCounter = 0;

  constructor(config: DungeonConfig) {
    this.config = config;
    this.rng = seedrandom(config.seed.toString());
    this.tiles = this.createEmptyTiles();
  }

  private createEmptyTiles(): TileType[][] {
    return Array(this.config.height)
      .fill(null)
      .map(() => Array(this.config.width).fill(TileType.WALL));
  }

  generate(): DungeonResult {
    this.generateBSPTree();
    this.generateRooms();
    this.generateCorridors();
    this.placeDoors();
    this.placeChests();
    this.placeMonsters();
    this.placeTraps();

    return {
      config: this.config,
      tiles: this.tiles,
      rooms: this.rooms,
      corridors: this.corridors,
      doors: this.doors,
      chests: this.chests,
      monsters: this.monsters,
      traps: this.traps,
      bspTree: this.bspTree,
      generationSteps: this.generationSteps
    };
  }

  private generateBSPTree(): void {
    const root: BSPNode = {
      id: this.nodeIdCounter++,
      x: 1,
      y: 1,
      width: this.config.width - 2,
      height: this.config.height - 2,
      isLeaf: false
    };

    this.splitNode(root, this.config.bspDepth);
    this.bspTree = root;

    this.generationSteps.push({
      type: 'bsp_split',
      description: 'BSP树分割完成',
      data: { tree: root, leafCount: this.countLeaves(root) }
    });
  }

  private splitNode(node: BSPNode, depth: number): void {
    if (depth <= 0) {
      node.isLeaf = true;
      return;
    }

    const minSplitSize = this.config.minRoomSize + 2;

    if (node.width < minSplitSize * 2 && node.height < minSplitSize * 2) {
      node.isLeaf = true;
      return;
    }

    const canSplitHorizontal = node.height >= minSplitSize * 2;
    const canSplitVertical = node.width >= minSplitSize * 2;

    let splitHorizontal: boolean;
    if (canSplitHorizontal && canSplitVertical) {
      splitHorizontal = this.rng() > 0.5;
    } else if (canSplitHorizontal) {
      splitHorizontal = true;
    } else if (canSplitVertical) {
      splitHorizontal = false;
    } else {
      node.isLeaf = true;
      return;
    }

    let splitPos: number;
    if (splitHorizontal) {
      splitPos = Math.floor(
        minSplitSize + this.rng() * (node.height - minSplitSize * 2)
      );
      node.left = {
        id: this.nodeIdCounter++,
        x: node.x,
        y: node.y,
        width: node.width,
        height: splitPos,
        isLeaf: false
      };
      node.right = {
        id: this.nodeIdCounter++,
        x: node.x,
        y: node.y + splitPos,
        width: node.width,
        height: node.height - splitPos,
        isLeaf: false
      };
    } else {
      splitPos = Math.floor(
        minSplitSize + this.rng() * (node.width - minSplitSize * 2)
      );
      node.left = {
        id: this.nodeIdCounter++,
        x: node.x,
        y: node.y,
        width: splitPos,
        height: node.height,
        isLeaf: false
      };
      node.right = {
        id: this.nodeIdCounter++,
        x: node.x + splitPos,
        y: node.y,
        width: node.width - splitPos,
        height: node.height,
        isLeaf: false
      };
    }

    this.splitNode(node.left, depth - 1);
    this.splitNode(node.right, depth - 1);
  }

  private countLeaves(node: BSPNode): number {
    if (node.isLeaf) return 1;
    return (
      (node.left ? this.countLeaves(node.left) : 0) +
      (node.right ? this.countLeaves(node.right) : 0)
    );
  }

  private getLeafNodes(node: BSPNode): BSPNode[] {
    if (node.isLeaf) return [node];
    const leaves: BSPNode[] = [];
    if (node.left) leaves.push(...this.getLeafNodes(node.left));
    if (node.right) leaves.push(...this.getLeafNodes(node.right));
    return leaves;
  }

  private generateRooms(): void {
    if (!this.bspTree) return;

    const leaves = this.getLeafNodes(this.bspTree);
    const targetRooms = Math.floor(
      this.config.minRooms +
        this.rng() * (this.config.maxRooms - this.config.minRooms)
    );

    const shuffledLeaves = [...leaves].sort(() => this.rng() - 0.5);
    const selectedLeaves = shuffledLeaves.slice(0, Math.min(targetRooms, leaves.length));

    for (const leaf of selectedLeaves) {
      const room = this.createRoomInNode(leaf);
      if (room) {
        leaf.room = room;
        this.rooms.push(room);
        this.carveRoom(room);

        this.generationSteps.push({
          type: 'room_grow',
          description: `生成房间 ${room.id}`,
          data: { room, leaf }
        });
      }
    }
  }

  private createRoomInNode(node: BSPNode): Room | null {
    const padding = 1;
    const maxWidth = Math.min(node.width - padding * 2, this.config.maxRoomSize);
    const maxHeight = Math.min(node.height - padding * 2, this.config.maxRoomSize);

    if (maxWidth < this.config.minRoomSize || maxHeight < this.config.minRoomSize) {
      return null;
    }

    const width = Math.floor(
      this.config.minRoomSize + this.rng() * (maxWidth - this.config.minRoomSize + 1)
    );
    const height = Math.floor(
      this.config.minRoomSize + this.rng() * (maxHeight - this.config.minRoomSize + 1)
    );

    const x = node.x + padding + Math.floor(this.rng() * (node.width - width - padding * 2));
    const y = node.y + padding + Math.floor(this.rng() * (node.height - height - padding * 2));

    return {
      id: this.roomIdCounter++,
      x,
      y,
      width,
      height,
      centerX: Math.floor(x + width / 2),
      centerY: Math.floor(y + height / 2),
      connected: false
    };
  }

  private carveRoom(room: Room): void {
    for (let y = room.y; y < room.y + room.height; y++) {
      for (let x = room.x; x < room.x + room.width; x++) {
        if (this.isValidTile(x, y)) {
          this.tiles[y][x] = TileType.FLOOR;
        }
      }
    }
  }

  private generateCorridors(): void {
    if (this.rooms.length < 2) return;

    const edges: { from: Room; to: Room; distance: number }[] = [];
    for (let i = 0; i < this.rooms.length; i++) {
      for (let j = i + 1; j < this.rooms.length; j++) {
        const dist = this.getDistance(
          { x: this.rooms[i].centerX, y: this.rooms[i].centerY },
          { x: this.rooms[j].centerX, y: this.rooms[j].centerY }
        );
        edges.push({ from: this.rooms[i], to: this.rooms[j], distance: dist });
      }
    }

    edges.sort((a, b) => a.distance - b.distance);

    const parent = new Map<number, number>();
    const find = (id: number): number => {
      if (parent.get(id) !== id) {
        parent.set(id, find(parent.get(id)!));
      }
      return parent.get(id)!;
    };
    const union = (a: number, b: number) => {
      parent.set(find(a), find(b));
    };

    for (const room of this.rooms) {
      parent.set(room.id, room.id);
    }

    const mstEdges: { from: Room; to: Room }[] = [];
    for (const edge of edges) {
      if (find(edge.from.id) !== find(edge.to.id)) {
        union(edge.from.id, edge.to.id);
        mstEdges.push({ from: edge.from, to: edge.to });
      }
    }

    for (const edge of mstEdges) {
      this.createCorridor(
        { x: edge.from.centerX, y: edge.from.centerY },
        { x: edge.to.centerX, y: edge.to.centerY }
      );
      edge.from.connected = true;
      edge.to.connected = true;
    }

    const extraEdges = Math.floor(this.rooms.length * 0.2);
    const shuffledEdges = edges.filter(
      e => !mstEdges.some(me => me.from.id === e.from.id && me.to.id === e.to.id)
    ).sort(() => this.rng() - 0.5);

    for (let i = 0; i < Math.min(extraEdges, shuffledEdges.length); i++) {
      this.createCorridor(
        { x: shuffledEdges[i].from.centerX, y: shuffledEdges[i].from.centerY },
        { x: shuffledEdges[i].to.centerX, y: shuffledEdges[i].to.centerY }
      );
    }
  }

  private createCorridor(start: Position, end: Position): void {
    const path: Position[] = [];
    let current = { ...start };

    const horizontalFirst = this.rng() > 0.5;

    if (horizontalFirst) {
      while (current.x !== end.x) {
        path.push({ ...current });
        this.tiles[current.y][current.x] = TileType.CORRIDOR;
        current.x += current.x < end.x ? 1 : -1;

        if (this.rng() < this.config.corridorBendiness) {
          const bendDir = this.rng() > 0.5 ? 1 : -1;
          const bendAmount = Math.floor(this.rng() * 3) + 1;
          for (let b = 0; b < bendAmount; b++) {
            const newY = current.y + bendDir;
            if (this.isValidTile(current.x, newY)) {
              current.y = newY;
              path.push({ ...current });
              this.tiles[current.y][current.x] = TileType.CORRIDOR;
            }
          }
        }
      }
      while (current.y !== end.y) {
        path.push({ ...current });
        this.tiles[current.y][current.x] = TileType.CORRIDOR;
        current.y += current.y < end.y ? 1 : -1;
      }
    } else {
      while (current.y !== end.y) {
        path.push({ ...current });
        this.tiles[current.y][current.x] = TileType.CORRIDOR;
        current.y += current.y < end.y ? 1 : -1;

        if (this.rng() < this.config.corridorBendiness) {
          const bendDir = this.rng() > 0.5 ? 1 : -1;
          const bendAmount = Math.floor(this.rng() * 3) + 1;
          for (let b = 0; b < bendAmount; b++) {
            const newX = current.x + bendDir;
            if (this.isValidTile(newX, current.y)) {
              current.x = newX;
              path.push({ ...current });
              this.tiles[current.y][current.x] = TileType.CORRIDOR;
            }
          }
        }
      }
      while (current.x !== end.x) {
        path.push({ ...current });
        this.tiles[current.y][current.x] = TileType.CORRIDOR;
        current.x += current.x < end.x ? 1 : -1;
      }
    }

    path.push({ ...end });
    this.tiles[end.y][end.x] = TileType.CORRIDOR;

    this.corridors.push({
      start: { ...start },
      end: { ...end },
      path
    });

    this.generationSteps.push({
      type: 'corridor',
      description: '生成走廊',
      data: { start, end, pathLength: path.length }
    });
  }

  private placeDoors(): void {
    const doorPositions: Position[] = [];

    for (let y = 1; y < this.config.height - 1; y++) {
      for (let x = 1; x < this.config.width - 1; x++) {
        if (this.tiles[y][x] === TileType.CORRIDOR) {
          const adjacentRooms = this.getAdjacentRoomIds(x, y);
          if (adjacentRooms.size >= 2 && this.rng() < this.config.doorDensity) {
            doorPositions.push({ x, y });
          }
        }
      }
    }

    for (const pos of doorPositions) {
      this.tiles[pos.y][pos.x] = TileType.DOOR;
      const roomIds = Array.from(this.getAdjacentRoomIds(pos.x, pos.y));
      if (roomIds.length >= 2) {
        this.doors.push({
          x: pos.x,
          y: pos.y,
          roomId1: roomIds[0],
          roomId2: roomIds[1]
        });
      }
    }

    this.generationSteps.push({
      type: 'door',
      description: `放置 ${this.doors.length} 个门`,
      data: { doors: this.doors }
    });
  }

  private getAdjacentRoomIds(x: number, y: number): Set<number> {
    const roomIds = new Set<number>();
    const directions = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 }
    ];

    for (const dir of directions) {
      const nx = x + dir.dx;
      const ny = y + dir.dy;
      if (this.isValidTile(nx, ny) && this.tiles[ny][nx] === TileType.FLOOR) {
        for (const room of this.rooms) {
          if (
            nx >= room.x &&
            nx < room.x + room.width &&
            ny >= room.y &&
            ny < room.y + room.height
          ) {
            roomIds.add(room.id);
            break;
          }
        }
      }
    }

    return roomIds;
  }

  private placeChests(): void {
    for (const room of this.rooms) {
      if (this.rng() < this.config.chestDensity) {
        const pos = this.getRandomPositionInRoom(room);
        if (pos) {
          this.tiles[pos.y][pos.x] = TileType.CHEST;
          this.chests.push({ x: pos.x, y: pos.y, roomId: room.id });
        }
      }
    }
  }

  private placeMonsters(): void {
    for (const room of this.rooms) {
      const monsterCount = Math.floor(this.rng() * 3) * this.config.monsterDensity;
      for (let i = 0; i < monsterCount; i++) {
        const pos = this.getRandomPositionInRoom(room);
        if (pos) {
          this.tiles[pos.y][pos.x] = TileType.MONSTER;
          this.monsters.push({ x: pos.x, y: pos.y, roomId: room.id });
        }
      }
    }
  }

  private placeTraps(): void {
    for (const corridor of this.corridors) {
      for (const pos of corridor.path) {
        if (this.rng() < this.config.trapDensity) {
          this.tiles[pos.y][pos.x] = TileType.TRAP;
          this.traps.push({ x: pos.x, y: pos.y });
        }
      }
    }
  }

  private getRandomPositionInRoom(room: Room): Position | null {
    const maxAttempts = 10;
    for (let i = 0; i < maxAttempts; i++) {
      const x = room.x + 1 + Math.floor(this.rng() * (room.width - 2));
      const y = room.y + 1 + Math.floor(this.rng() * (room.height - 2));
      if (this.isValidTile(x, y) && this.tiles[y][x] === TileType.FLOOR) {
        return { x, y };
      }
    }
    return null;
  }

  private getDistance(a: Position, b: Position): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  private isValidTile(x: number, y: number): boolean {
    return x >= 0 && x < this.config.width && y >= 0 && y < this.config.height;
  }
}

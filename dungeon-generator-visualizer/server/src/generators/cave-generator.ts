import seedrandom from 'seedrandom';
import type {
  Position,
  TileType,
  DungeonConfig,
  DungeonResult,
  GenerationStep
} from '../types';

export class CaveGenerator {
  private rng: seedrandom.PRNG;
  private config: DungeonConfig;
  private tiles: TileType[][];
  private generationSteps: GenerationStep[] = [];

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
    this.randomFill();
    this.smoothCave();
    this.removeSmallRegions();
    this.ensureConnectivity();

    return {
      config: this.config,
      tiles: this.tiles,
      rooms: [],
      corridors: [],
      doors: [],
      chests: [],
      monsters: [],
      traps: [],
      generationSteps: this.generationSteps
    };
  }

  private randomFill(): void {
    const fillProb = this.config.caveFillProbability ?? 0.45;

    for (let y = 0; y < this.config.height; y++) {
      for (let x = 0; x < this.config.width; x++) {
        if (this.isOnBorder(x, y)) {
          this.tiles[y][x] = TileType.WALL;
        } else {
          this.tiles[y][x] = this.rng() < fillProb ? TileType.WALL : TileType.CAVE_FLOOR;
        }
      }
    }

    this.generationSteps.push({
      type: 'cave',
      description: '随机填充洞穴',
      data: { fillProbability: fillProb }
    });
  }

  private smoothCave(): void {
    const iterations = this.config.caveSmoothingIterations ?? 5;

    for (let i = 0; i < iterations; i++) {
      const newTiles = this.createEmptyTiles();

      for (let y = 0; y < this.config.height; y++) {
        for (let x = 0; x < this.config.width; x++) {
          const wallCount = this.countAdjacentWalls(x, y);
          
          if (wallCount > 4) {
            newTiles[y][x] = TileType.WALL;
          } else if (wallCount < 4) {
            newTiles[y][x] = TileType.CAVE_FLOOR;
          } else {
            newTiles[y][x] = this.tiles[y][x];
          }
        }
      }

      this.tiles = newTiles;
    }

    this.generationSteps.push({
      type: 'cave',
      description: `平滑洞穴 ${iterations} 次`,
      data: { iterations }
    });
  }

  private countAdjacentWalls(x: number, y: number): number {
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (!this.isValidTile(nx, ny) || this.tiles[ny][nx] === TileType.WALL) {
          count++;
        }
      }
    }
    return count;
  }

  private removeSmallRegions(): void {
    const visited = Array(this.config.height)
      .fill(null)
      .map(() => Array(this.config.width).fill(false));
    const regions: Position[][] = [];

    for (let y = 0; y < this.config.height; y++) {
      for (let x = 0; x < this.config.width; x++) {
        if (this.tiles[y][x] === TileType.CAVE_FLOOR && !visited[y][x]) {
          const region = this.floodFill(x, y, visited);
          regions.push(region);
        }
      }
    }

    const minRegionSize = Math.floor((this.config.width * this.config.height) * 0.01);
    
    for (const region of regions) {
      if (region.length < minRegionSize) {
        for (const pos of region) {
          this.tiles[pos.y][pos.x] = TileType.WALL;
        }
      }
    }

    this.generationSteps.push({
      type: 'cave',
      description: `移除小区域（小于 ${minRegionSize} 格）`,
      data: { regions: regions.length, removed: regions.filter(r => r.length < minRegionSize).length }
    });
  }

  private ensureConnectivity(): void {
    const visited = Array(this.config.height)
      .fill(null)
      .map(() => Array(this.config.width).fill(false));
    const regions: Position[][] = [];

    for (let y = 0; y < this.config.height; y++) {
      for (let x = 0; x < this.config.width; x++) {
        if (this.tiles[y][x] === TileType.CAVE_FLOOR && !visited[y][x]) {
          const region = this.floodFill(x, y, visited);
          regions.push(region);
        }
      }
    }

    if (regions.length <= 1) return;

    regions.sort((a, b) => b.length - a.length);
    const mainRegion = regions[0];

    for (let i = 1; i < regions.length; i++) {
      const region = regions[i];
      const startPos = region[Math.floor(this.rng() * region.length)];
      const endPos = mainRegion[Math.floor(this.rng() * mainRegion.length)];
      
      this.carveTunnel(startPos, endPos);
    }

    this.generationSteps.push({
      type: 'cave',
      description: `连接 ${regions.length - 1} 个孤立区域`,
      data: { regions: regions.length }
    });
  }

  private carveTunnel(start: Position, end: Position): void {
    let current = { ...start };

    while (current.x !== end.x || current.y !== end.y) {
      if (this.rng() > 0.5 && current.x !== end.x) {
        current.x += current.x < end.x ? 1 : -1;
      } else if (current.y !== end.y) {
        current.y += current.y < end.y ? 1 : -1;
      }

      if (this.isValidTile(current.x, current.y)) {
        this.tiles[current.y][current.x] = TileType.CAVE_FLOOR;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = current.x + dx;
            const ny = current.y + dy;
            if (this.isValidTile(nx, ny) && this.rng() < 0.3) {
              this.tiles[ny][nx] = TileType.CAVE_FLOOR;
            }
          }
        }
      }
    }
  }

  private floodFill(x: number, y: number, visited: boolean[][]): Position[] {
    const region: Position[] = [];
    const stack: Position[] = [{ x, y }];

    while (stack.length > 0) {
      const pos = stack.pop()!;
      if (
        !this.isValidTile(pos.x, pos.y) ||
        visited[pos.y][pos.x] ||
        this.tiles[pos.y][pos.x] !== TileType.CAVE_FLOOR
      ) {
        continue;
      }

      visited[pos.y][pos.x] = true;
      region.push(pos);

      stack.push({ x: pos.x + 1, y: pos.y });
      stack.push({ x: pos.x - 1, y: pos.y });
      stack.push({ x: pos.x, y: pos.y + 1 });
      stack.push({ x: pos.x, y: pos.y - 1 });
    }

    return region;
  }

  private isOnBorder(x: number, y: number): boolean {
    return x === 0 || x === this.config.width - 1 || y === 0 || y === this.config.height - 1;
  }

  private isValidTile(x: number, y: number): boolean {
    return x >= 0 && x < this.config.width && y >= 0 && y < this.config.height;
  }
}

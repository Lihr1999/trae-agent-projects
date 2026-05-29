import { Point, Vector, Agent, LBMParams, LBMGrid, MapElement } from '../types';
import { LBM_WEIGHTS, LBM_DIRECTIONS } from '../types';

export class LBMFluid {
  private params: LBMParams;
  private width: number;
  private height: number;
  private gridSize: number;
  private nx: number;
  private ny: number;
  private populations: number[][][];
  private tempPopulations: number[][][];
  private density: number[][];
  private velocity: Vector[][];
  private obstacleMask: boolean[][];
  private turbulenceThreshold: number = 0.1;

  constructor(
    params: LBMParams,
    mapWidth: number,
    mapHeight: number,
    obstacles: MapElement[]
  ) {
    this.params = params;
    this.width = mapWidth;
    this.height = mapHeight;
    this.gridSize = params.gridSize;
    this.nx = Math.ceil(mapWidth / this.gridSize);
    this.ny = Math.ceil(mapHeight / this.gridSize);

    this.populations = this.create3DArray(this.nx, this.ny, 9);
    this.tempPopulations = this.create3DArray(this.nx, this.ny, 9);
    this.density = this.create2DArray(this.nx, this.ny);
    this.velocity = this.create2DVectorArray(this.nx, this.ny);
    this.obstacleMask = this.create2DBoolArray(this.nx, this.ny);

    this.initialize(params.initialDensity);
    this.initializeObstacleMask(obstacles);
  }

  public step(): void {
    this.computeMacros();
    this.collision();
    this.streaming();
    this.applyBoundaryConditions();
  }

  public applyAgentForces(agents: Agent[]): void {
    for (const agent of agents) {
      const gridX = Math.floor(agent.position.x / this.gridSize);
      const gridY = Math.floor(agent.position.y / this.gridSize);

      if (gridX >= 0 && gridX < this.nx && gridY >= 0 && gridY < this.ny) {
        const forceMagnitude = agent.size * 0.01;
        const forceDirection = this.normalizeVector(agent.velocity);

        this.addBodyForce(gridX, gridY, {
          x: forceDirection.x * forceMagnitude,
          y: forceDirection.y * forceMagnitude,
        });
      }
    }
  }

  public getGrid(): LBMGrid {
    return {
      density: this.density.map(row => [...row]),
      velocity: this.velocity.map(row => row.map(v => ({ ...v }))),
      populations: this.populations.map(slice => slice.map(row => [...row])),
    };
  }

  public getVelocityAt(point: Point): Vector {
    const gridX = Math.floor(point.x / this.gridSize);
    const gridY = Math.floor(point.y / this.gridSize);

    if (gridX < 0 || gridX >= this.nx || gridY < 0 || gridY >= this.ny) {
      return { x: 0, y: 0 };
    }

    return { ...this.velocity[gridX][gridY] };
  }

  public computeReynoldsNumber(): number {
    let avgSpeed = 0;
    let count = 0;

    for (let i = 0; i < this.nx; i++) {
      for (let j = 0; j < this.ny; j++) {
        if (!this.obstacleMask[i][j]) {
          const speed = this.vectorMagnitude(this.velocity[i][j]);
          avgSpeed += speed;
          count++;
        }
      }
    }

    avgSpeed = count > 0 ? avgSpeed / count : 0;
    const characteristicLength = this.gridSize;

    return (avgSpeed * characteristicLength) / this.params.viscosity;
  }

  public detectTurbulence(): { x: number; y: number; intensity: number }[] {
    const turbulencePoints: { x: number; y: number; intensity: number }[] = [];

    for (let i = 1; i < this.nx - 1; i++) {
      for (let j = 1; j < this.ny - 1; j++) {
        if (!this.obstacleMask[i][j]) {
          const vorticity = this.computeVorticity(i, j);
          if (Math.abs(vorticity) > this.turbulenceThreshold) {
            turbulencePoints.push({
              x: i * this.gridSize + this.gridSize / 2,
              y: j * this.gridSize + this.gridSize / 2,
              intensity: Math.abs(vorticity),
            });
          }
        }
      }
    }

    return turbulencePoints;
  }

  private initialize(initialDensity: number): void {
    for (let i = 0; i < this.nx; i++) {
      for (let j = 0; j < this.ny; j++) {
        this.density[i][j] = initialDensity;
        this.velocity[i][j] = { x: 0, y: 0 };

        for (let k = 0; k < 9; k++) {
          const equilibrium = this.computeEquilibrium(
            initialDensity,
            { x: 0, y: 0 },
            k
          );
          this.populations[i][j][k] = equilibrium;
        }
      }
    }
  }

  private initializeObstacleMask(obstacles: MapElement[]): void {
    for (let i = 0; i < this.nx; i++) {
      for (let j = 0; j < this.ny; j++) {
        const worldX = i * this.gridSize + this.gridSize / 2;
        const worldY = j * this.gridSize + this.gridSize / 2;
        this.obstacleMask[i][j] = this.isPointInObstacles(
          { x: worldX, y: worldY },
          obstacles
        );
      }
    }
  }

  private isPointInObstacles(point: Point, obstacles: MapElement[]): boolean {
    for (const obstacle of obstacles) {
      if (obstacle.type === 'obstacle' || obstacle.type === 'bar' || obstacle.type === 'seat') {
        if (this.isPointInPolygon(point, obstacle.polygon)) {
          return true;
        }
      }
    }
    return false;
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

  private computeMacros(): void {
    for (let i = 0; i < this.nx; i++) {
      for (let j = 0; j < this.ny; j++) {
        if (this.obstacleMask[i][j]) {
          this.density[i][j] = this.params.initialDensity;
          this.velocity[i][j] = { x: 0, y: 0 };
          continue;
        }

        let rho = 0;
        let ux = 0;
        let uy = 0;

        for (let k = 0; k < 9; k++) {
          const f = this.populations[i][j][k];
          rho += f;
          ux += f * LBM_DIRECTIONS[k].x;
          uy += f * LBM_DIRECTIONS[k].y;
        }

        this.density[i][j] = rho;
        this.velocity[i][j] = {
          x: rho > 0 ? ux / rho : 0,
          y: rho > 0 ? uy / rho : 0,
        };
      }
    }
  }

  private collision(): void {
    const omega = 1 / this.params.relaxationTime;

    for (let i = 0; i < this.nx; i++) {
      for (let j = 0; j < this.ny; j++) {
        if (this.obstacleMask[i][j]) continue;

        const rho = this.density[i][j];
        const u = this.velocity[i][j];

        for (let k = 0; k < 9; k++) {
          const feq = this.computeEquilibrium(rho, u, k);
          this.populations[i][j][k] =
            this.populations[i][j][k] * (1 - omega) + feq * omega;
        }
      }
    }
  }

  private streaming(): void {
    for (let i = 0; i < this.nx; i++) {
      for (let j = 0; j < this.ny; j++) {
        for (let k = 0; k < 9; k++) {
          this.tempPopulations[i][j][k] = this.populations[i][j][k];
        }
      }
    }

    for (let i = 0; i < this.nx; i++) {
      for (let j = 0; j < this.ny; j++) {
        if (this.obstacleMask[i][j]) continue;

        for (let k = 0; k < 9; k++) {
          const dir = LBM_DIRECTIONS[k];
          const ni = i - dir.x;
          const nj = j - dir.y;

          if (ni >= 0 && ni < this.nx && nj >= 0 && nj < this.ny) {
            if (!this.obstacleMask[ni][nj]) {
              this.populations[i][j][k] = this.tempPopulations[ni][nj][k];
            }
          }
        }
      }
    }
  }

  private applyBoundaryConditions(): void {
    for (let i = 0; i < this.nx; i++) {
      for (let j = 0; j < this.ny; j++) {
        if (this.obstacleMask[i][j]) {
          this.applyBounceBack(i, j);
        }
      }
    }

    for (let i = 0; i < this.nx; i++) {
      this.applyBounceBack(i, 0);
      this.applyBounceBack(i, this.ny - 1);
    }

    for (let j = 0; j < this.ny; j++) {
      this.applyBounceBack(0, j);
      this.applyBounceBack(this.nx - 1, j);
    }
  }

  private applyBounceBack(i: number, j: number): void {
    const oppositeDirections = [0, 3, 4, 1, 2, 7, 8, 5, 6];

    for (let k = 0; k < 9; k++) {
      const opposite = oppositeDirections[k];
      this.populations[i][j][k] = this.tempPopulations[i][j][opposite];
    }
  }

  private computeEquilibrium(
    rho: number,
    u: Vector,
    k: number
  ): number {
    const w = LBM_WEIGHTS[k];
    const dir = LBM_DIRECTIONS[k];

    const udotc = u.x * dir.x + u.y * dir.y;
    const udotu = u.x * u.x + u.y * u.y;
    const c2 = 1 / 3;

    return w * rho * (1 + udotc / c2 + (udotc * udotc) / (2 * c2 * c2) - udotu / (2 * c2));
  }

  private addBodyForce(i: number, j: number, force: Vector): void {
    const omega = 1 / this.params.relaxationTime;

    for (let k = 0; k < 9; k++) {
      const dir = LBM_DIRECTIONS[k];
      const w = LBM_WEIGHTS[k];

      const term1 = (dir.x - this.velocity[i][j].x) / (1 / 3);
      const term2 = (dir.y - this.velocity[i][j].y) / (1 / 3);
      const term3 = dir.x * this.velocity[i][j].x + dir.y * this.velocity[i][j].y;

      const forceTerm = w * (1 - omega / 2) * (term1 * force.x + term2 * force.y + term3 * (force.x * dir.x + force.y * dir.y) / (1 / 3));

      this.populations[i][j][k] += forceTerm;
    }
  }

  private computeVorticity(i: number, j: number): number {
    const dudy = (this.velocity[i][j + 1].x - this.velocity[i][j - 1].x) / (2 * this.gridSize);
    const dvdx = (this.velocity[i + 1][j].y - this.velocity[i - 1][j].y) / (2 * this.gridSize);

    return dvdx - dudy;
  }

  private create3DArray(nx: number, ny: number, nz: number): number[][][] {
    const arr: number[][][] = [];
    for (let i = 0; i < nx; i++) {
      arr[i] = [];
      for (let j = 0; j < ny; j++) {
        arr[i][j] = new Array(nz).fill(0);
      }
    }
    return arr;
  }

  private create2DArray(nx: number, ny: number): number[][] {
    const arr: number[][] = [];
    for (let i = 0; i < nx; i++) {
      arr[i] = new Array(ny).fill(0);
    }
    return arr;
  }

  private create2DVectorArray(nx: number, ny: number): Vector[][] {
    const arr: Vector[][] = [];
    for (let i = 0; i < nx; i++) {
      arr[i] = [];
      for (let j = 0; j < ny; j++) {
        arr[i][j] = { x: 0, y: 0 };
      }
    }
    return arr;
  }

  private create2DBoolArray(nx: number, ny: number): boolean[][] {
    const arr: boolean[][] = [];
    for (let i = 0; i < nx; i++) {
      arr[i] = new Array(ny).fill(false);
    }
    return arr;
  }

  private normalizeVector(v: Vector): Vector {
    const mag = Math.sqrt(v.x ** 2 + v.y ** 2);
    if (mag === 0) return { x: 0, y: 0 };
    return { x: v.x / mag, y: v.y / mag };
  }

  private vectorMagnitude(v: Vector): number {
    return Math.sqrt(v.x ** 2 + v.y ** 2);
  }
}

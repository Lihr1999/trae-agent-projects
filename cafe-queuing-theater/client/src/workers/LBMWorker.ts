/// <reference lib="webworker" />
import * as Comlink from 'comlink';
import { LBM_DIRECTIONS, LBM_WEIGHTS } from '@/types';
import type { Vector, LBMGrid, LBMParams, Point, LBMWorkerConfig, LBMWorkerInterface } from '@/types';

class LBMWorker {
  private width: number = 0;
  private height: number = 0;
  private gridSize: number = 20;
  private cols: number = 0;
  private rows: number = 0;
  private params: LBMParams | null = null;
  private f0: Float32Array | null = null;
  private f1: Float32Array | null = null;
  private density: Float32Array | null = null;
  private velocityX: Float32Array | null = null;
  private velocityY: Float32Array | null = null;
  private obstacles: Uint8Array | null = null;
  private isRunning: boolean = false;
  private stepCount: number = 0;

  init(config: LBMWorkerConfig): void {
    this.width = config.width;
    this.height = config.height;
    this.gridSize = config.gridSize;
    this.params = config.params;
    this.cols = Math.ceil(this.width / this.gridSize);
    this.rows = Math.ceil(this.height / this.gridSize);

    const size = this.cols * this.rows;
    this.f0 = new Float32Array(size * 9);
    this.f1 = new Float32Array(size * 9);
    this.density = new Float32Array(size);
    this.velocityX = new Float32Array(size);
    this.velocityY = new Float32Array(size);
    this.obstacles = new Uint8Array(size);

    for (let i = 0; i < size; i++) {
      this.density[i] = this.params.initialDensity;
      for (let k = 0; k < 9; k++) {
        this.f0[i * 9 + k] = this.params.initialDensity * LBM_WEIGHTS[k];
      }
    }

    this.stepCount = 0;
    this.isRunning = true;
  }

  setObstacles(obstaclePolygons: Point[][]): void {
    if (!this.obstacles) return;

    this.obstacles.fill(0);

    for (let j = 0; j < this.rows; j++) {
      for (let i = 0; i < this.cols; i++) {
        const x = i * this.gridSize + this.gridSize / 2;
        const y = j * this.gridSize + this.gridSize / 2;
        const idx = j * this.cols + i;

        for (const polygon of obstaclePolygons) {
          if (this.pointInPolygon({ x, y }, polygon)) {
            this.obstacles[idx] = 1;
            break;
          }
        }
      }
    }
  }

  private pointInPolygon(point: Point, polygon: Point[]): boolean {
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

  applyAgentForces(agents: { position: Point; velocity: Vector }[]): void {
    if (!this.density || !this.velocityX || !this.velocityY || !this.params) return;

    const forceStrength = 0.01;
    const influenceRadius = this.gridSize * 2;

    for (const agent of agents) {
      const centerI = Math.floor(agent.position.x / this.gridSize);
      const centerJ = Math.floor(agent.position.y / this.gridSize);
      const radius = Math.ceil(influenceRadius / this.gridSize);

      for (let dj = -radius; dj <= radius; dj++) {
        for (let di = -radius; di <= radius; di++) {
          const i = centerI + di;
          const j = centerJ + dj;

          if (i < 0 || i >= this.cols || j < 0 || j >= this.rows) continue;

          const idx = j * this.cols + i;
          if (this.obstacles![idx]) continue;

          const dx = (i + 0.5) * this.gridSize - agent.position.x;
          const dy = (j + 0.5) * this.gridSize - agent.position.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < influenceRadius) {
            const falloff = 1 - dist / influenceRadius;
            const force = forceStrength * falloff * falloff;

            this.velocityX[idx] += agent.velocity.x * force;
            this.velocityY[idx] += agent.velocity.y * force;
          }
        }
      }
    }
  }

  step(): void {
    if (!this.isRunning || !this.f0 || !this.f1 || !this.density || !this.velocityX || !this.velocityY || !this.obstacles || !this.params) return;

    const tau = this.params.relaxationTime;
    const omega = 1 / tau;

    for (let j = 0; j < this.rows; j++) {
      for (let i = 0; i < this.cols; i++) {
        const idx = j * this.cols + i;

        if (this.obstacles[idx]) continue;

        let rho = 0;
        let ux = 0;
        let uy = 0;

        for (let k = 0; k < 9; k++) {
          const f = this.f0[idx * 9 + k];
          rho += f;
          ux += f * LBM_DIRECTIONS[k].x;
          uy += f * LBM_DIRECTIONS[k].y;
        }

        if (rho > 0) {
          ux /= rho;
          uy /= rho;
        }

        this.density[idx] = rho;
        this.velocityX[idx] = ux;
        this.velocityY[idx] = uy;

        const uSq = ux * ux + uy * uy;

        for (let k = 0; k < 9; k++) {
          const ex = LBM_DIRECTIONS[k].x;
          const ey = LBM_DIRECTIONS[k].y;
          const eDotU = ex * ux + ey * uy;
          const feq = LBM_WEIGHTS[k] * rho * (1 + 3 * eDotU + 4.5 * eDotU * eDotU - 1.5 * uSq);
          this.f0[idx * 9 + k] = this.f0[idx * 9 + k] * (1 - omega) + feq * omega;
        }
      }
    }

    for (let j = 0; j < this.rows; j++) {
      for (let i = 0; i < this.cols; i++) {
        const idx = j * this.cols + i;

        if (this.obstacles[idx]) continue;

        for (let k = 0; k < 9; k++) {
          const ex = LBM_DIRECTIONS[k].x;
          const ey = LBM_DIRECTIONS[k].y;

          let ni = i + ex;
          let nj = j + ey;

          if (ni < 0 || ni >= this.cols || nj < 0 || nj >= this.rows) {
            const bounceK = this.getBounceDirection(k);
            this.f1[idx * 9 + bounceK] = this.f0[idx * 9 + k];
            continue;
          }

          const nidx = nj * this.cols + ni;

          if (this.obstacles[nidx]) {
            const bounceK = this.getBounceDirection(k);
            this.f1[idx * 9 + bounceK] = this.f0[idx * 9 + k];
          } else {
            this.f1[nidx * 9 + k] = this.f0[idx * 9 + k];
          }
        }
      }
    }

    const temp = this.f0;
    this.f0 = this.f1;
    this.f1 = temp;

    this.stepCount++;
  }

  private getBounceDirection(k: number): number {
    const bounceMap = [0, 3, 4, 1, 2, 7, 8, 5, 6];
    return bounceMap[k];
  }

  getGridData(): LBMGrid | null {
    if (!this.density || !this.velocityX || !this.velocityY) return null;

    const density: number[][] = [];
    const velocity: Vector[][] = [];

    for (let j = 0; j < this.rows; j++) {
      const densityRow: number[] = [];
      const velocityRow: Vector[] = [];

      for (let i = 0; i < this.cols; i++) {
        const idx = j * this.cols + i;
        densityRow.push(this.density[idx]);
        velocityRow.push({
          x: this.velocityX[idx],
          y: this.velocityY[idx],
        });
      }

      density.push(densityRow);
      velocity.push(velocityRow);
    }

    return {
      density,
      velocity,
      populations: [],
    };
  }

  getStepCount(): number {
    return this.stepCount;
  }

  computeReynoldsNumber(): number {
    if (!this.velocityX || !this.velocityY || !this.params) return 0;

    let maxSpeed = 0;
    for (let i = 0; i < this.velocityX.length; i++) {
      const speed = Math.sqrt(this.velocityX[i] ** 2 + this.velocityY[i] ** 2);
      if (speed > maxSpeed) maxSpeed = speed;
    }

    const characteristicLength = this.gridSize;
    return (maxSpeed * characteristicLength) / this.params.viscosity;
  }

  reset(): void {
    this.stepCount = 0;
    this.isRunning = false;
    if (this.params) {
      this.init({
        width: this.width,
        height: this.height,
        gridSize: this.gridSize,
        params: this.params,
      });
    }
  }

  stop(): void {
    this.isRunning = false;
  }
}

Comlink.expose(LBMWorker);

export type LBMWorkerType = LBMWorkerInterface;

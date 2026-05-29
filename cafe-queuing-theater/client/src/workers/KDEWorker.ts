/// <reference lib="webworker" />
import * as Comlink from 'comlink';
import type { Point, HeatMap, KDEConfig, KDEWorkerInterface } from '@/types';

class KDEWorker {
  private width: number = 0;
  private height: number = 0;
  private resolution: number = 10;
  private bandwidth: number = 30;
  private cols: number = 0;
  private rows: number = 0;
  private values: Float32Array | null = null;
  private isProcessing: boolean = false;

  init(config: KDEConfig): void {
    this.width = config.width;
    this.height = config.height;
    this.resolution = config.resolution;
    this.bandwidth = config.bandwidth;
    this.cols = Math.ceil(this.width / this.resolution);
    this.rows = Math.ceil(this.height / this.resolution);

    const size = this.cols * this.rows;
    this.values = new Float32Array(size);
  }

  async computeHeatmap(points: { position: Point; intensity: number }[]): Promise<HeatMap | null> {
    if (!this.values || this.isProcessing) return null;

    this.isProcessing = true;

    await new Promise<void>((resolve) => {
      setTimeout(() => {
        this.computeKernelDensityEstimation(points);
        resolve();
      }, 0);
    });

    const result: number[][] = [];
    let maxVal = 0;

    for (let j = 0; j < this.rows; j++) {
      const row: number[] = [];
      for (let i = 0; i < this.cols; i++) {
        const idx = j * this.cols + i;
        const val = this.values[idx];
        row.push(val);
        if (val > maxVal) maxVal = val;
      }
      result.push(row);
    }

    if (maxVal > 0) {
      for (let j = 0; j < this.rows; j++) {
        for (let i = 0; i < this.cols; i++) {
          result[j][i] /= maxVal;
        }
      }
    }

    this.isProcessing = false;

    return {
      resolution: this.resolution,
      values: result,
      timestamp: Date.now(),
    };
  }

  private computeKernelDensityEstimation(points: { position: Point; intensity: number }[]): void {
    if (!this.values) return;

    this.values.fill(0);

    const h = this.bandwidth;
    const h2 = h * h;
    const normalization = 1 / (Math.PI * h2);

    for (const point of points) {
      const px = point.position.x;
      const py = point.position.y;
      const intensity = point.intensity;

      const centerI = Math.floor(px / this.resolution);
      const centerJ = Math.floor(py / this.resolution);
      const radius = Math.ceil((h * 3) / this.resolution);

      for (let dj = -radius; dj <= radius; dj++) {
        for (let di = -radius; di <= radius; di++) {
          const i = centerI + di;
          const j = centerJ + dj;

          if (i < 0 || i >= this.cols || j < 0 || j >= this.rows) continue;

          const dx = (i + 0.5) * this.resolution - px;
          const dy = (j + 0.5) * this.resolution - py;
          const d2 = dx * dx + dy * dy;

          if (d2 < 9 * h2) {
            const kernel = normalization * Math.exp(-d2 / (2 * h2));
            const idx = j * this.cols + i;
            this.values[idx] += intensity * kernel;
          }
        }
      }
    }
  }

  streamingUpdate(
    newPoints: { position: Point; intensity: number }[],
    oldPoints: { position: Point; intensity: number }[],
    decay: number = 0.95
  ): HeatMap | null {
    if (!this.values || this.isProcessing) return null;

    for (let i = 0; i < this.values.length; i++) {
      this.values[i] *= decay;
    }

    for (const point of oldPoints) {
      this.removePoint(point);
    }

    for (const point of newPoints) {
      this.addPoint(point);
    }

    return this.getCurrentHeatmap();
  }

  private addPoint(point: { position: Point; intensity: number }): void {
    if (!this.values) return;

    const h = this.bandwidth;
    const h2 = h * h;
    const normalization = 1 / (Math.PI * h2);

    const px = point.position.x;
    const py = point.position.y;
    const intensity = point.intensity;

    const centerI = Math.floor(px / this.resolution);
    const centerJ = Math.floor(py / this.resolution);
    const radius = Math.ceil((h * 3) / this.resolution);

    for (let dj = -radius; dj <= radius; dj++) {
      for (let di = -radius; di <= radius; di++) {
        const i = centerI + di;
        const j = centerJ + dj;

        if (i < 0 || i >= this.cols || j < 0 || j >= this.rows) continue;

        const dx = (i + 0.5) * this.resolution - px;
        const dy = (j + 0.5) * this.resolution - py;
        const d2 = dx * dx + dy * dy;

        if (d2 < 9 * h2) {
          const kernel = normalization * Math.exp(-d2 / (2 * h2));
          const idx = j * this.cols + i;
          this.values[idx] += intensity * kernel;
        }
      }
    }
  }

  private removePoint(point: { position: Point; intensity: number }): void {
    if (!this.values) return;

    const h = this.bandwidth;
    const h2 = h * h;
    const normalization = 1 / (Math.PI * h2);

    const px = point.position.x;
    const py = point.position.y;
    const intensity = point.intensity;

    const centerI = Math.floor(px / this.resolution);
    const centerJ = Math.floor(py / this.resolution);
    const radius = Math.ceil((h * 3) / this.resolution);

    for (let dj = -radius; dj <= radius; dj++) {
      for (let di = -radius; di <= radius; di++) {
        const i = centerI + di;
        const j = centerJ + dj;

        if (i < 0 || i >= this.cols || j < 0 || j >= this.rows) continue;

        const dx = (i + 0.5) * this.resolution - px;
        const dy = (j + 0.5) * this.resolution - py;
        const d2 = dx * dx + dy * dy;

        if (d2 < 9 * h2) {
          const kernel = normalization * Math.exp(-d2 / (2 * h2));
          const idx = j * this.cols + i;
          this.values[idx] = Math.max(0, this.values[idx] - intensity * kernel);
        }
      }
    }
  }

  private getCurrentHeatmap(): HeatMap | null {
    if (!this.values) return null;

    const result: number[][] = [];
    let maxVal = 0;

    for (let j = 0; j < this.rows; j++) {
      const row: number[] = [];
      for (let i = 0; i < this.cols; i++) {
        const idx = j * this.cols + i;
        const val = this.values[idx];
        row.push(val);
        if (val > maxVal) maxVal = val;
      }
      result.push(row);
    }

    if (maxVal > 0) {
      for (let j = 0; j < this.rows; j++) {
        for (let i = 0; i < this.cols; i++) {
          result[j][i] /= maxVal;
        }
      }
    }

    return {
      resolution: this.resolution,
      values: result,
      timestamp: Date.now(),
    };
  }

  reset(): void {
    if (this.values) {
      this.values.fill(0);
    }
  }

  setBandwidth(bandwidth: number): void {
    this.bandwidth = bandwidth;
  }
}

Comlink.expose(KDEWorker);

export type KDEWorkerType = KDEWorkerInterface;

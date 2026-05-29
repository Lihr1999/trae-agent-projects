import { Point, SpaceGroup } from '../types';

export class SpaceGroupGenerator {
  generate2DGroup(p: number, q: number): SpaceGroup {
    const generators = this.generate2DGenerators(p, q);
    return {
      type: '2d',
      schlafliSymbol: `{${p},${q}}`,
      p,
      q,
      generators,
      mirrorAngle: Math.PI / p,
      mirrorCount: p
    };
  }

  generateSphericalGroup(p: number, q: number): SpaceGroup {
    const generators = this.generateSphericalGenerators(p, q);
    return {
      type: 'spherical',
      schlafliSymbol: `{${p},${q}}`,
      p,
      q,
      generators,
      mirrorAngle: Math.PI / p,
      mirrorCount: p
    };
  }

  generateHyperbolicGroup(p: number, q: number): SpaceGroup {
    const generators = this.generateHyperbolicGenerators(p, q);
    return {
      type: 'hyperbolic',
      schlafliSymbol: `{${p},${q}}`,
      p,
      q,
      generators,
      mirrorAngle: Math.PI / p,
      mirrorCount: p
    };
  }

  private generate2DGenerators(p: number, q: number): number[][] {
    const generators: number[][] = [];
    const angle = 2 * Math.PI / p;

    for (let i = 0; i < p; i++) {
      const rotation = this.rotationMatrix(i * angle);
      generators.push(rotation);
    }

    const reflection = this.reflectionMatrix(0);
    generators.push(reflection);

    return generators;
  }

  private generateSphericalGenerators(p: number, q: number): number[][] {
    const generators: number[][] = [];
    const angle = 2 * Math.PI / p;

    for (let i = 0; i < p; i++) {
      const rotation = this.rotationMatrix3D('z', i * angle);
      generators.push(rotation);
    }

    generators.push(this.rotationMatrix3D('x', Math.PI / q));

    return generators;
  }

  private generateHyperbolicGenerators(p: number, q: number): number[][] {
    const generators: number[][] = [];
    const angle = 2 * Math.PI / p;

    for (let i = 0; i < p; i++) {
      const rotation = this.hyperbolicRotation(i * angle);
      generators.push(rotation);
    }

    generators.push(this.hyperbolicReflection());

    return generators;
  }

  private rotationMatrix(angle: number): number[] {
    return [
      Math.cos(angle), -Math.sin(angle), 0,
      Math.sin(angle), Math.cos(angle), 0,
      0, 0, 1
    ];
  }

  private reflectionMatrix(angle: number): number[] {
    return [
      Math.cos(2 * angle), Math.sin(2 * angle), 0,
      Math.sin(2 * angle), -Math.cos(2 * angle), 0,
      0, 0, 1
    ];
  }

  private rotationMatrix3D(axis: 'x' | 'y' | 'z', angle: number): number[] {
    const c = Math.cos(angle);
    const s = Math.sin(angle);

    switch (axis) {
      case 'x':
        return [
          1, 0, 0, 0,
          0, c, -s, 0,
          0, s, c, 0,
          0, 0, 0, 1
        ];
      case 'y':
        return [
          c, 0, s, 0,
          0, 1, 0, 0,
          -s, 0, c, 0,
          0, 0, 0, 1
        ];
      case 'z':
        return [
          c, -s, 0, 0,
          s, c, 0, 0,
          0, 0, 1, 0,
          0, 0, 0, 1
        ];
    }
  }

  private hyperbolicRotation(angle: number): number[] {
    const c = Math.cosh(angle);
    const s = Math.sinh(angle);
    return [
      c, s, 0,
      s, c, 0,
      0, 0, 1
    ];
  }

  private hyperbolicReflection(): number[] {
    return [
      1, 0, 0,
      0, -1, 0,
      0, 0, 1
    ];
  }

  applyTransformation(point: Point, matrix: number[]): Point {
    if (matrix.length === 9) {
      const x = matrix[0] * point.x + matrix[1] * point.y + matrix[2] * (point.z || 1);
      const y = matrix[3] * point.x + matrix[4] * point.y + matrix[5] * (point.z || 1);
      const z = matrix[6] * point.x + matrix[7] * point.y + matrix[8] * (point.z || 1);
      return { x, y, z };
    } else if (matrix.length === 16) {
      const x = matrix[0] * point.x + matrix[1] * point.y + matrix[2] * (point.z || 0) + matrix[3];
      const y = matrix[4] * point.x + matrix[5] * point.y + matrix[6] * (point.z || 0) + matrix[7];
      const z = matrix[8] * point.x + matrix[9] * point.y + matrix[10] * (point.z || 0) + matrix[11];
      return { x, y, z };
    }
    return point;
  }

  generateTessellation(
    basePoints: Point[],
    spaceGroup: SpaceGroup,
    iterations: number = 5
  ): Point[][] {
    const cells: Point[][] = [basePoints];
    let currentCells = [basePoints];

    for (let i = 0; i < iterations; i++) {
      const newCells: Point[][] = [];
      
      for (const cell of currentCells) {
        for (const generator of spaceGroup.generators) {
          const transformed = cell.map(p => this.applyTransformation(p, generator));
          
          if (!this.isDuplicateCell(transformed, cells)) {
            newCells.push(transformed);
            cells.push(transformed);
          }
        }
      }

      currentCells = newCells;
      if (currentCells.length === 0) break;
    }

    return cells;
  }

  private isDuplicateCell(cell: Point[], allCells: Point[][]): boolean {
    const centroid = this.centroid(cell);
    
    for (const existing of allCells) {
      const existingCentroid = this.centroid(existing);
      const distance = Math.sqrt(
        Math.pow(centroid.x - existingCentroid.x, 2) +
        Math.pow(centroid.y - existingCentroid.y, 2) +
        Math.pow((centroid.z || 0) - (existingCentroid.z || 0), 2)
      );
      
      if (distance < 0.1) return true;
    }

    return false;
  }

  private centroid(cell: Point[]): Point {
    let x = 0, y = 0, z = 0;
    for (const p of cell) {
      x += p.x;
      y += p.y;
      z += p.z || 0;
    }
    return { x: x / cell.length, y: y / cell.length, z: z / cell.length };
  }

  slerp(matrix1: number[], matrix2: number[], t: number): number[] {
    const q1 = this.matrixToQuaternion(matrix1);
    const q2 = this.matrixToQuaternion(matrix2);
    const q = this.quaternionSlerp(q1, q2, t);
    return this.quaternionToMatrix(q);
  }

  private matrixToQuaternion(matrix: number[]): number[] {
    const trace = matrix[0] + matrix[4] + matrix[10];
    let w, x, y, z;

    if (trace > 0) {
      const s = 0.5 / Math.sqrt(trace + 1);
      w = 0.25 / s;
      x = (matrix[9] - matrix[6]) * s;
      y = (matrix[2] - matrix[8]) * s;
      z = (matrix[4] - matrix[1]) * s;
    } else {
      if (matrix[0] > matrix[4] && matrix[0] > matrix[10]) {
        const s = 2 * Math.sqrt(1 + matrix[0] - matrix[4] - matrix[10]);
        w = (matrix[9] - matrix[6]) / s;
        x = 0.25 * s;
        y = (matrix[1] + matrix[4]) / s;
        z = (matrix[2] + matrix[8]) / s;
      } else if (matrix[4] > matrix[10]) {
        const s = 2 * Math.sqrt(1 + matrix[4] - matrix[0] - matrix[10]);
        w = (matrix[2] - matrix[8]) / s;
        x = (matrix[1] + matrix[4]) / s;
        y = 0.25 * s;
        z = (matrix[6] + matrix[9]) / s;
      } else {
        const s = 2 * Math.sqrt(1 + matrix[10] - matrix[0] - matrix[4]);
        w = (matrix[4] - matrix[1]) / s;
        x = (matrix[2] + matrix[8]) / s;
        y = (matrix[6] + matrix[9]) / s;
        z = 0.25 * s;
      }
    }

    return [x, y, z, w];
  }

  private quaternionSlerp(q1: number[], q2: number[], t: number): number[] {
    let dot = q1[0] * q2[0] + q1[1] * q2[1] + q1[2] * q2[2] + q1[3] * q2[3];
    
    if (dot < 0) {
      q2 = [-q2[0], -q2[1], -q2[2], -q2[3]];
      dot = -dot;
    }

    if (dot > 0.9995) {
      const result = [
        q1[0] + t * (q2[0] - q1[0]),
        q1[1] + t * (q2[1] - q1[1]),
        q1[2] + t * (q2[2] - q1[2]),
        q1[3] + t * (q2[3] - q1[3])
      ];
      return this.normalizeQuaternion(result);
    }

    const theta = Math.acos(dot);
    const sinTheta = Math.sin(theta);

    return [
      (Math.sin((1 - t) * theta) * q1[0] + Math.sin(t * theta) * q2[0]) / sinTheta,
      (Math.sin((1 - t) * theta) * q1[1] + Math.sin(t * theta) * q2[1]) / sinTheta,
      (Math.sin((1 - t) * theta) * q1[2] + Math.sin(t * theta) * q2[2]) / sinTheta,
      (Math.sin((1 - t) * theta) * q1[3] + Math.sin(t * theta) * q2[3]) / sinTheta
    ];
  }

  private normalizeQuaternion(q: number[]): number[] {
    const len = Math.sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]);
    return [q[0] / len, q[1] / len, q[2] / len, q[3] / len];
  }

  private quaternionToMatrix(q: number[]): number[] {
    const x = q[0], y = q[1], z = q[2], w = q[3];
    
    return [
      1 - 2 * y * y - 2 * z * z, 2 * x * y - 2 * z * w, 2 * x * z + 2 * y * w, 0,
      2 * x * y + 2 * z * w, 1 - 2 * x * x - 2 * z * z, 2 * y * z - 2 * x * w, 0,
      2 * x * z - 2 * y * w, 2 * y * z + 2 * x * w, 1 - 2 * x * x - 2 * y * y, 0,
      0, 0, 0, 1
    ];
  }
}

export const spaceGroupGenerator = new SpaceGroupGenerator();

export type SymmetryType = 'dihedral' | 'cyclic' | 'spherical' | 'hyperbolic';

export interface SymmetryConfig {
  type: SymmetryType;
  order: number;
  mirrorAngle: number;
  schlafli?: string;
}

export interface SymmetryResult {
  matrices: number[][][];
  generators: number[][][];
  fundamentalDomain: { x: number; y: number }[];
  warnings: string[];
}

export function computeSymmetryGroup(config: SymmetryConfig): SymmetryResult {
  const warnings: string[] = [];

  if (config.type === 'dihedral' || config.type === 'cyclic') {
    return computePlanarSymmetry(config, warnings);
  } else if (config.type === 'spherical') {
    return computeSphericalSymmetry(config, warnings);
  } else {
    return computeHyperbolicSymmetry(config, warnings);
  }
}

function computePlanarSymmetry(
  config: SymmetryConfig,
  warnings: string[]
): SymmetryResult {
  const matrices: number[][][] = [];
  const generators: number[][][] = [];

  const { order, mirrorAngle, type } = config;

  if (360 % mirrorAngle !== 0) {
    warnings.push(
      `镜面夹角 ${mirrorAngle}° 不是360°的约数，图案将产生接缝撕裂效果`
    );
  }

  const rotationAngle = mirrorAngle;

  const rotationGenerator = createRotationMatrix(rotationAngle);
  generators.push(rotationGenerator);

  for (let i = 0; i < order; i++) {
    const angle = (i * rotationAngle * Math.PI) / 180;
    matrices.push(createRotationMatrixFromAngle(angle));
  }

  if (type === 'dihedral') {
    const reflectionGenerator = createReflectionMatrix(mirrorAngle / 2);
    generators.push(reflectionGenerator);

    for (let i = 0; i < order; i++) {
      const angle = (i * rotationAngle * Math.PI) / 180;
      const rotation = createRotationMatrixFromAngle(angle);
      const reflection = multiplyMatrices(rotation, reflectionGenerator);
      matrices.push(reflection);
    }
  }

  const fundamentalDomain = computeFundamentalDomain(
    order,
    type === 'dihedral'
  );

  return { matrices, generators, fundamentalDomain, warnings };
}

function computeSphericalSymmetry(
  config: SymmetryConfig,
  warnings: string[]
): SymmetryResult {
  const { schlafli = '{3,5}' } = config;
  const match = schlafli.match(/\{(\d+),(\d+)\}/);

  if (!match) {
    warnings.push('无效的 Schläfli 符号，使用默认 {3,5}');
  }

  const p = match ? parseInt(match[1]) : 3;
  const q = match ? parseInt(match[2]) : 5;

  const matrices: number[][][] = [];
  const generators: number[][][] = [];

  const rotation1 = create3DRotationZ(2 * Math.PI / p);
  const rotation2 = create3DRotationY(2 * Math.PI / q);

  generators.push(rotation1, rotation2);

  const stack = [identityMatrix3D()];
  const visited = new Set<string>();
  let iterations = 0;
  const maxIterations = 1000;

  while (stack.length > 0 && iterations < maxIterations) {
    const current = stack.pop()!;
    const key = matrixToString(current);

    if (visited.has(key)) continue;
    visited.add(key);
    matrices.push(current);

    stack.push(multiplyMatrices3D(current, rotation1));
    stack.push(multiplyMatrices3D(current, rotation2));

    iterations++;
  }

  if (iterations >= maxIterations) {
    warnings.push('对称群计算达到迭代上限，结果可能不完整');
  }

  const fundamentalDomain: { x: number; y: number }[] = [];
  for (let i = 0; i < p; i++) {
    const angle = (i * 2 * Math.PI) / p;
    fundamentalDomain.push({
      x: 0.5 * Math.cos(angle),
      y: 0.5 * Math.sin(angle),
    });
  }

  return { matrices, generators, fundamentalDomain, warnings };
}

function computeHyperbolicSymmetry(
  config: SymmetryConfig,
  warnings: string[]
): SymmetryResult {
  const { order, schlafli = '{4,5}' } = config;
  const match = schlafli.match(/\{(\d+),(\d+)\}/);

  if (!match) {
    warnings.push('无效的 Schläfli 符号，使用默认 {4,5}');
  }

  const p = match ? parseInt(match[1]) : 4;
  const q = match ? parseInt(match[2]) : 5;

  if (1 / p + 1 / q >= 0.5) {
    warnings.push(
      '双曲镶嵌需要 1/p + 1/q < 0.5，建议使用 {4,5} 或 {3,7}'
    );
  }

  const matrices: number[][][] = [];
  const generators: number[][][] = [];

  const edgeMidpoint = poincareToPoincare(
    Math.cos(Math.PI / p),
    Math.sin(Math.PI / p),
    0.4
  );

  const reflection1 = createHyperbolicReflection(edgeMidpoint);
  const rotation = createHyperbolicRotation(2 * Math.PI / p);

  generators.push(reflection1, rotation);

  const stack = [identityMatrix3D()];
  const visited = new Set<string>();
  let iterations = 0;
  const maxIterations = order;

  while (stack.length > 0 && iterations < maxIterations) {
    const current = stack.pop()!;
    const key = matrixToString(current);

    if (visited.has(key)) continue;
    visited.add(key);
    matrices.push(current);

    stack.push(multiplyMatrices3D(current, reflection1));
    stack.push(multiplyMatrices3D(current, rotation));

    iterations++;
  }

  if (iterations >= maxIterations) {
    warnings.push(
      '双曲镶嵌生成达到上限，边界处将使用 LOD 降级以保持性能'
    );
  }

  const fundamentalDomain: { x: number; y: number }[] = [];
  for (let i = 0; i < p; i++) {
    const angle = (i * 2 * Math.PI) / p;
    const r = Math.tanh(0.5);
    fundamentalDomain.push({
      x: r * Math.cos(angle),
      y: r * Math.sin(angle),
    });
  }

  return { matrices, generators, fundamentalDomain, warnings };
}

function createRotationMatrix(degrees: number): number[][] {
  const radians = (degrees * Math.PI) / 180;
  return createRotationMatrixFromAngle(radians);
}

function createRotationMatrixFromAngle(angle: number): number[][] {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [
    [cos, -sin, 0],
    [sin, cos, 0],
    [0, 0, 1],
  ];
}

function createReflectionMatrix(degrees: number): number[][] {
  const angle = (degrees * Math.PI) / 180;
  const cos = Math.cos(2 * angle);
  const sin = Math.sin(2 * angle);
  return [
    [cos, sin, 0],
    [sin, -cos, 0],
    [0, 0, 1],
  ];
}

function computeFundamentalDomain(
  order: number,
  hasReflection: boolean
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const angleStep = (2 * Math.PI) / order;
  const radius = 0.95;

  for (let i = 0; i <= (hasReflection ? 1 : order); i++) {
    const angle = i * angleStep;
    points.push({
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle),
    });
  }

  points.push({ x: 0, y: 0 });
  return points;
}

function multiplyMatrices(a: number[][], b: number[][]): number[][] {
  const result: number[][] = [];
  for (let i = 0; i < 3; i++) {
    result[i] = [];
    for (let j = 0; j < 3; j++) {
      let sum = 0;
      for (let k = 0; k < 3; k++) {
        sum += a[i][k] * b[k][j];
      }
      result[i][j] = sum;
    }
  }
  return result;
}

function identityMatrix3D(): number[][] {
  return [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ];
}

function create3DRotationZ(angle: number): number[][] {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [
    [cos, -sin, 0, 0],
    [sin, cos, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ];
}

function create3DRotationY(angle: number): number[][] {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [
    [cos, 0, sin, 0],
    [0, 1, 0, 0],
    [-sin, 0, cos, 0],
    [0, 0, 0, 1],
  ];
}

function multiplyMatrices3D(a: number[][], b: number[][]): number[][] {
  const result: number[][] = [];
  for (let i = 0; i < 4; i++) {
    result[i] = [];
    for (let j = 0; j < 4; j++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        sum += a[i][k] * b[k][j];
      }
      result[i][j] = sum;
    }
  }
  return result;
}

function matrixToString(matrix: number[][]): string {
  return matrix
    .flat()
    .map((v) => v.toFixed(6))
    .join(',');
}

function poincareToPoincare(x: number, y: number, scale: number): {
  x: number;
  y: number;
} {
  const r = Math.sqrt(x * x + y * y);
  if (r === 0) return { x: 0, y: 0 };
  const newR = Math.tanh(scale * Math.atanh(r));
  return {
    x: (x / r) * newR,
    y: (y / r) * newR,
  };
}

function createHyperbolicReflection(point: {
  x: number;
  y: number;
}): number[][] {
  const { x, y } = point;
  const norm2 = x * x + y * y;
  return [
    [1 - 2 * x * x, -2 * x * y, 0, 2 * x],
    [-2 * x * y, 1 - 2 * y * y, 0, 2 * y],
    [0, 0, 1, 0],
    [-2 * x, -2 * y, 0, 1 + 2 * norm2],
  ];
}

function createHyperbolicRotation(angle: number): number[][] {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [
    [cos, -sin, 0, 0],
    [sin, cos, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ];
}

export function applyTransformation(
  point: { x: number; y: number },
  matrix: number[][]
): { x: number; y: number } {
  if (matrix.length === 3) {
    const x = matrix[0][0] * point.x + matrix[0][1] * point.y + matrix[0][2];
    const y = matrix[1][0] * point.x + matrix[1][1] * point.y + matrix[1][2];
    const w = matrix[2][0] * point.x + matrix[2][1] * point.y + matrix[2][2];
    return { x: x / w, y: y / w };
  } else {
    const x =
      matrix[0][0] * point.x +
      matrix[0][1] * point.y +
      matrix[0][3];
    const y =
      matrix[1][0] * point.x +
      matrix[1][1] * point.y +
      matrix[1][3];
    const w =
      matrix[3][0] * point.x +
      matrix[3][1] * point.y +
      matrix[3][3];
    return { x: x / w, y: y / w };
  }
}

export function checkSeamClosure(
  angle: number
): { hasSeam: boolean; gapAngle: number } {
  const normalizedAngle = angle % 360;
  const remainder = 360 % normalizedAngle;
  const hasSeam = Math.abs(remainder) > 0.01 && Math.abs(remainder - normalizedAngle) > 0.01;
  return {
    hasSeam,
    gapAngle: hasSeam ? (remainder < 0.01 ? normalizedAngle - remainder : remainder) : 0,
  };
}

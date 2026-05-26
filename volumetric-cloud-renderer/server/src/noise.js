const PERM = [
  151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225,
  140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148,
  247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32,
  57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175,
  74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122,
  60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54,
  65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169,
  200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64,
  52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212,
  207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213,
  119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9,
  129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104,
  218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241,
  81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157,
  184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93,
  222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180
];

const P = new Array(512);
for (let i = 0; i < 256; i++) {
  P[256 + i] = P[i] = PERM[i];
}

function fade(t) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a, b, t) {
  return a + t * (b - a);
}

function grad(hash, x, y, z) {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

export function perlinNoise3D(x, y, z) {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const Z = Math.floor(z) & 255;

  x -= Math.floor(x);
  y -= Math.floor(y);
  z -= Math.floor(z);

  const u = fade(x);
  const v = fade(y);
  const w = fade(z);

  const A = P[X] + Y;
  const AA = P[A] + Z;
  const AB = P[A + 1] + Z;
  const B = P[X + 1] + Y;
  const BA = P[B] + Z;
  const BB = P[B + 1] + Z;

  return lerp(
    lerp(
      lerp(grad(P[AA], x, y, z), grad(P[BA], x - 1, y, z), u),
      lerp(grad(P[AB], x, y - 1, z), grad(P[BB], x - 1, y - 1, z), u),
      v
    ),
    lerp(
      lerp(grad(P[AA + 1], x, y, z - 1), grad(P[BA + 1], x - 1, y, z - 1), u),
      lerp(grad(P[AB + 1], x, y - 1, z - 1), grad(P[BB + 1], x - 1, y - 1, z - 1), u),
      v
    ),
    w
  );
}

export function fbm(x, y, z, octaves = 6, frequency = 1.0, lacunarity = 2.0, gain = 0.5) {
  let value = 0;
  let amplitude = 1.0;
  let total = 0;

  for (let i = 0; i < octaves; i++) {
    value += amplitude * perlinNoise3D(x * frequency, y * frequency, z * frequency);
    total += amplitude;
    frequency *= lacunarity;
    amplitude *= gain;
  }

  return value / total;
}

export function noiseDerivatives(x, y, z, epsilon = 0.001) {
  const dx = (perlinNoise3D(x + epsilon, y, z) - perlinNoise3D(x - epsilon, y, z)) / (2 * epsilon);
  const dy = (perlinNoise3D(x, y + epsilon, z) - perlinNoise3D(x, y - epsilon, z)) / (2 * epsilon);
  const dz = (perlinNoise3D(x, y, z + epsilon) - perlinNoise3D(x, y, z - epsilon)) / (2 * epsilon);
  return [dx, dy, dz];
}

export function calculateCloudDensity(position, params, time = 0) {
  const { cloudDensity, cloudThickness, cloudCoverage, windSpeed = 0, windDirection = 0 } = params;

  const windRad = (windDirection * Math.PI) / 180;
  const windOffsetX = Math.cos(windRad) * windSpeed * 0.001 * time;
  const windOffsetZ = Math.sin(windRad) * windSpeed * 0.001 * time;

  const samplePos = [
    position[0] * 0.001 + windOffsetX,
    position[1] * 0.001,
    position[2] * 0.001 + windOffsetZ
  ];

  const baseNoise = fbm(samplePos[0], samplePos[1], samplePos[2], 6, 1.0, 2.0, 0.5);
  const detailNoise = fbm(samplePos[0] * 3.0, samplePos[1] * 3.0, samplePos[2] * 3.0, 4, 1.0, 2.0, 0.5);

  let density = baseNoise * 0.7 + detailNoise * 0.3;
  density = (density + 1.0) * 0.5;

  const heightFactor = 1.0 - Math.abs(position[1] - params.cloudHeight) / (cloudThickness * 500);
  density *= Math.max(0, heightFactor);

  density = Math.max(0, density - (1.0 - cloudCoverage));
  density *= cloudDensity;

  return Math.min(1.0, density);
}

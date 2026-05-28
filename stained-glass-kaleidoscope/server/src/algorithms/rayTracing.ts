export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Ray {
  origin: Vector3;
  direction: Vector3;
}

export interface GlassMaterial {
  color: { r: number; g: number; b: number };
  transparency: number;
  refractiveIndex: number;
}

export interface GlassFragment {
  vertices: Vector3[];
  material: GlassMaterial;
}

export interface RayHit {
  point: Vector3;
  normal: Vector3;
  material: GlassMaterial;
  distance: number;
}

export interface TraceResult {
  color: { r: number; g: number; b: number };
  bounceCount: number;
  escaped: boolean;
  warnings: string[];
}

const MAX_REFLECTIONS = 50;
const EPSILON = 1e-6;
const AIR_REFRACTIVE_INDEX = 1.0;

export function traceRay(
  ray: Ray,
  fragments: GlassFragment[],
  lightSource: Vector3,
  maxReflections: number = MAX_REFLECTIONS
): TraceResult {
  const warnings: string[] = [];
  let currentRay = { ...ray };
  let currentColor = { r: 0, g: 0, b: 0 };
  let currentRefractiveIndex = AIR_REFRACTIVE_INDEX;
  let bounceCount = 0;
  let escaped = false;

  while (bounceCount < maxReflections) {
    const hit = findClosestHit(currentRay, fragments);

    if (!hit) {
      escaped = true;
      const lightContribution = computeLightContribution(
        currentRay.direction,
        lightSource
      );
      currentColor = addColors(currentColor, lightContribution);
      break;
    }

    const { normal, material, point } = hit;

    const facingRatio = dot(currentRay.direction, normal);
    const correctedNormal =
      facingRatio < 0 ? normal : multiplyVector(normal, -1);

    const reflected = reflect(currentRay.direction, correctedNormal);
    const [refracted, totalInternalReflection] = refract(
      currentRay.direction,
      correctedNormal,
      currentRefractiveIndex,
      material.refractiveIndex
    );

    const fresnel = computeFresnel(
      currentRay.direction,
      correctedNormal,
      currentRefractiveIndex,
      material.refractiveIndex
    );

    const lightRay: Ray = {
      origin: addVector(point, multiplyVector(correctedNormal, EPSILON)),
      direction: normalize(subtractVector(lightSource, point)),
    };
    const inShadow = isInShadow(lightRay, fragments, hit);

    if (!inShadow) {
      const diffuse = computeDiffuse(
        correctedNormal,
        lightRay.direction,
        material
      );
      const specular = computeSpecular(
        currentRay.direction,
        correctedNormal,
        lightRay.direction,
        material
      );
      const directLight = multiplyColor(
        addColors(diffuse, specular),
        1 - fresnel
      );
      currentColor = addColors(currentColor, directLight);
    }

    const transmissionColor = {
      r: material.color.r * (1 - material.transparency),
      g: material.color.g * (1 - material.transparency),
      b: material.color.b * (1 - material.transparency),
    };
    currentColor = addColors(
      currentColor,
      multiplyColor(transmissionColor, material.transparency)
    );

    if (totalInternalReflection) {
      if (bounceCount >= maxReflections - 1) {
        warnings.push(
          `光线在第 ${bounceCount + 1} 次反射时达到最大反射次数，可能存在精度丢失`
        );
      }
      currentRay = {
        origin: addVector(point, multiplyVector(correctedNormal, EPSILON)),
        direction: reflected,
      };
    } else {
      currentRay = {
        origin: addVector(point, multiplyVector(correctedNormal, -EPSILON)),
        direction: refracted,
      };
      currentRefractiveIndex = material.refractiveIndex;
    }

    bounceCount++;

    if (bounceCount >= 50) {
      warnings.push(
        '光线反射次数超过50次，已自动终止以防止性能问题'
      );
      break;
    }
  }

  return {
    color: clampColor(currentColor),
    bounceCount,
    escaped,
    warnings,
  };
}

function findClosestHit(
  ray: Ray,
  fragments: GlassFragment[]
): RayHit | null {
  let closestHit: RayHit | null = null;
  let closestDistance = Infinity;

  for (const fragment of fragments) {
    const hit = intersectTriangle(ray, fragment);
    if (hit && hit.distance < closestDistance && hit.distance > EPSILON) {
      closestDistance = hit.distance;
      closestHit = hit;
    }
  }

  return closestHit;
}

function intersectTriangle(
  ray: Ray,
  fragment: GlassFragment
): RayHit | null {
  if (fragment.vertices.length < 3) return null;

  const v0 = fragment.vertices[0];
  const v1 = fragment.vertices[1];
  const v2 = fragment.vertices[2];

  const edge1 = subtractVector(v1, v0);
  const edge2 = subtractVector(v2, v0);
  const h = cross(ray.direction, edge2);
  const a = dot(edge1, h);

  if (Math.abs(a) < EPSILON) return null;

  const f = 1 / a;
  const s = subtractVector(ray.origin, v0);
  const u = f * dot(s, h);

  if (u < 0 || u > 1) return null;

  const q = cross(s, edge1);
  const v = f * dot(ray.direction, q);

  if (v < 0 || u + v > 1) return null;

  const t = f * dot(edge2, q);

  if (t < EPSILON) return null;

  const point = addVector(ray.origin, multiplyVector(ray.direction, t));
  const normal = normalize(cross(edge1, edge2));

  return {
    point,
    normal,
    material: fragment.material,
    distance: t,
  };
}

function reflect(v: Vector3, n: Vector3): Vector3 {
  const d = 2 * dot(v, n);
  return normalize(subtractVector(v, multiplyVector(n, d)));
}

function refract(
  v: Vector3,
  n: Vector3,
  n1: number,
  n2: number
): [Vector3, boolean] {
  const ratio = n1 / n2;
  const cosI = -dot(v, n);
  const sinT2 = ratio * ratio * (1 - cosI * cosI);

  if (sinT2 > 1) {
    return [reflect(v, n), true];
  }

  const cosT = Math.sqrt(1 - sinT2);
  const refracted = addVector(
    multiplyVector(v, ratio),
    multiplyVector(n, ratio * cosI - cosT)
  );
  return [normalize(refracted), false];
}

function computeFresnel(
  v: Vector3,
  n: Vector3,
  n1: number,
  n2: number
): number {
  const cosI = Math.abs(dot(v, n));
  const sinT2 = (n1 / n2) * (n1 / n2) * (1 - cosI * cosI);

  if (sinT2 > 1) return 1;

  const cosT = Math.sqrt(1 - sinT2);
  const rs = (n1 * cosI - n2 * cosT) / (n1 * cosI + n2 * cosT);
  const rp = (n1 * cosT - n2 * cosI) / (n1 * cosT + n2 * cosI);

  return (rs * rs + rp * rp) / 2;
}

function computeLightContribution(
  direction: Vector3,
  lightSource: Vector3
): { r: number; g: number; b: number } {
  const lightDir = normalize(lightSource);
  const intensity = Math.max(0, dot(direction, lightDir));
  return {
    r: 0.1 + 0.9 * intensity,
    g: 0.1 + 0.85 * intensity,
    b: 0.1 + 0.8 * intensity,
  };
}

function computeDiffuse(
  normal: Vector3,
  lightDir: Vector3,
  material: GlassMaterial
): { r: number; g: number; b: number } {
  const intensity = Math.max(0, dot(normal, lightDir));
  return multiplyColor(material.color, intensity * material.transparency);
}

function computeSpecular(
  viewDir: Vector3,
  normal: Vector3,
  lightDir: Vector3,
  material: GlassMaterial
): { r: number; g: number; b: number } {
  const halfDir = normalize(addVector(viewDir, lightDir));
  const spec = Math.pow(Math.max(0, dot(normal, halfDir)), 32);
  return { r: spec, g: spec, b: spec };
}

function isInShadow(
  lightRay: Ray,
  fragments: GlassFragment[],
  excludeHit: RayHit
): boolean {
  for (const fragment of fragments) {
    const hit = intersectTriangle(lightRay, fragment);
    if (
      hit &&
      hit.distance > EPSILON &&
      hit.distance < 1000 &&
      hit.material !== excludeHit.material
    ) {
      return true;
    }
  }
  return false;
}

function dot(a: Vector3, b: Vector3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross(a: Vector3, b: Vector3): Vector3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function addVector(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function subtractVector(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function multiplyVector(v: Vector3, s: number): Vector3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

function normalize(v: Vector3): Vector3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len < EPSILON) return { x: 0, y: 0, z: 0 };
  return multiplyVector(v, 1 / len);
}

function addColors(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number }
): { r: number; g: number; b: number } {
  return { r: a.r + b.r, g: a.g + b.g, b: a.b + b.b };
}

function multiplyColor(
  c: { r: number; g: number; b: number },
  s: number
): { r: number; g: number; b: number } {
  return { r: c.r * s, g: c.g * s, b: c.b * s };
}

function clampColor(c: {
  r: number;
  g: number;
  b: number;
}): { r: number; g: number; b: number } {
  return {
    r: Math.min(1, Math.max(0, c.r)),
    g: Math.min(1, Math.max(0, c.g)),
    b: Math.min(1, Math.max(0, c.b)),
  };
}

export function kelvinToRGB(kelvin: number): { r: number; g: number; b: number } {
  const temp = kelvin / 100;
  let r, g, b;

  if (temp <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(temp) - 161.1195681661;
    if (temp <= 19) {
      b = 0;
    } else {
      b = 138.5177312231 * Math.log(temp - 10) - 305.0447927307;
    }
  } else {
    r = 329.698727446 * Math.pow(temp - 60, -0.1332047592);
    g = 288.1221695283 * Math.pow(temp - 60, -0.0755148492);
    b = 255;
  }

  return {
    r: Math.min(1, Math.max(0, r / 255)),
    g: Math.min(1, Math.max(0, g / 255)),
    b: Math.min(1, Math.max(0, b / 255)),
  };
}

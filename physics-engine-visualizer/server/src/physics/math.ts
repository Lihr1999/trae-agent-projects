import { Vector2, Matrix2x2 } from './types';

export const vec2 = {
  create: (x: number = 0, y: number = 0): Vector2 => ({ x, y }),

  clone: (v: Vector2): Vector2 => ({ x: v.x, y: v.y }),

  add: (a: Vector2, b: Vector2): Vector2 => ({
    x: a.x + b.x,
    y: a.y + b.y
  }),

  sub: (a: Vector2, b: Vector2): Vector2 => ({
    x: a.x - b.x,
    y: a.y - b.y
  }),

  mul: (v: Vector2, s: number): Vector2 => ({
    x: v.x * s,
    y: v.y * s
  }),

  div: (v: Vector2, s: number): Vector2 => ({
    x: v.x / s,
    y: v.y / s
  }),

  dot: (a: Vector2, b: Vector2): number => a.x * b.x + a.y * b.y,

  cross: (a: Vector2, b: Vector2): number => a.x * b.y - a.y * b.x,

  crossScalar: (v: Vector2, s: number): Vector2 => ({
    x: v.y * s,
    y: -v.x * s
  }),

  length: (v: Vector2): number => Math.sqrt(v.x * v.x + v.y * v.y),

  lengthSq: (v: Vector2): number => v.x * v.x + v.y * v.y,

  normalize: (v: Vector2): Vector2 => {
    const len = vec2.length(v);
    return len > 0 ? vec2.div(v, len) : { x: 0, y: 0 };
  },

  distance: (a: Vector2, b: Vector2): number =>
    vec2.length(vec2.sub(a, b)),

  distanceSq: (a: Vector2, b: Vector2): number =>
    vec2.lengthSq(vec2.sub(a, b)),

  negate: (v: Vector2): Vector2 => ({ x: -v.x, y: -v.y }),

  lerp: (a: Vector2, b: Vector2, t: number): Vector2 => ({
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t
  }),

  rotate: (v: Vector2, angle: number): Vector2 => {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return {
      x: v.x * c - v.y * s,
      y: v.x * s + v.y * c
    };
  },

  min: (a: Vector2, b: Vector2): Vector2 => ({
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y)
  }),

  max: (a: Vector2, b: Vector2): Vector2 => ({
    x: Math.max(a.x, b.x),
    y: Math.max(a.y, b.y)
  }),

  zero: (): Vector2 => ({ x: 0, y: 0 }),

  one: (): Vector2 => ({ x: 1, y: 1 })
};

export const mat2 = {
  create: (m00: number = 1, m01: number = 0, m10: number = 0, m11: number = 1): Matrix2x2 => ({
    m00, m01, m10, m11
  }),

  fromAngle: (angle: number): Matrix2x2 => {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return { m00: c, m01: -s, m10: s, m11: c };
  },

  mulVector: (m: Matrix2x2, v: Vector2): Vector2 => ({
    x: m.m00 * v.x + m.m01 * v.y,
    y: m.m10 * v.x + m.m11 * v.y
  }),

  transpose: (m: Matrix2x2): Matrix2x2 => ({
    m00: m.m00,
    m01: m.m10,
    m10: m.m01,
    m11: m.m11
  }),

  inverse: (m: Matrix2x2): Matrix2x2 | null => {
    const det = m.m00 * m.m11 - m.m01 * m.m10;
    if (Math.abs(det) < 1e-10) return null;
    const invDet = 1 / det;
    return {
      m00: m.m11 * invDet,
      m01: -m.m01 * invDet,
      m10: -m.m10 * invDet,
      m11: m.m00 * invDet
    };
  }
};

export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const lerp = (a: number, b: number, t: number): number =>
  a + (b - a) * t;

export const randomRange = (min: number, max: number): number =>
  min + Math.random() * (max - min);

export const randomColor = (): string => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
    '#BB8FCE', '#85C1E9', '#F8B500', '#00CED1'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

export const generateId = (): string =>
  Math.random().toString(36).substring(2, 11);

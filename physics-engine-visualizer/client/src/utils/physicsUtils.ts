import { RigidBody, Vector2 } from '../types';

export function getWorldPoint(body: RigidBody, localPoint: Vector2): Vector2 {
  const cos = Math.cos(body.rotation);
  const sin = Math.sin(body.rotation);
  return {
    x: body.position.x + localPoint.x * cos - localPoint.y * sin,
    y: body.position.y + localPoint.x * sin + localPoint.y * cos
  };
}

export function getLocalPoint(body: RigidBody, worldPoint: Vector2): Vector2 {
  const cos = Math.cos(-body.rotation);
  const sin = Math.sin(-body.rotation);
  const relative = {
    x: worldPoint.x - body.position.x,
    y: worldPoint.y - body.position.y
  };
  return {
    x: relative.x * cos - relative.y * sin,
    y: relative.x * sin + relative.y * cos
  };
}

export function vecAdd(a: Vector2, b: Vector2): Vector2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function vecSub(a: Vector2, b: Vector2): Vector2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function vecMul(v: Vector2, s: number): Vector2 {
  return { x: v.x * s, y: v.y * s };
}

export function vecDot(a: Vector2, b: Vector2): number {
  return a.x * b.x + a.y * b.y;
}

export function vecLength(v: Vector2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function vecNormalize(v: Vector2): Vector2 {
  const len = vecLength(v);
  return len > 0 ? vecMul(v, 1 / len) : { x: 0, y: 0 };
}

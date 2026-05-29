import { Vector3 } from './types'

export const vec3 = {
  add(a: Vector3, b: Vector3): Vector3 {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }
  },

  sub(a: Vector3, b: Vector3): Vector3 {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
  },

  mul(v: Vector3, s: number): Vector3 {
    return { x: v.x * s, y: v.y * s, z: v.z * s }
  },

  div(v: Vector3, s: number): Vector3 {
    return { x: v.x / s, y: v.y / s, z: v.z / s }
  },

  dot(a: Vector3, b: Vector3): number {
    return a.x * b.x + a.y * b.y + a.z * b.z
  },

  cross(a: Vector3, b: Vector3): Vector3 {
    return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x
    }
  },

  length(v: Vector3): number {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
  },

  lengthSquared(v: Vector3): number {
    return v.x * v.x + v.y * v.y + v.z * v.z
  },

  normalize(v: Vector3): Vector3 {
    const len = vec3.length(v)
    return len > 0 ? vec3.div(v, len) : { x: 0, y: 0, z: 0 }
  },

  distance(a: Vector3, b: Vector3): number {
    return vec3.length(vec3.sub(a, b))
  },

  distanceSquared(a: Vector3, b: Vector3): number {
    return vec3.lengthSquared(vec3.sub(a, b))
  },

  lerp(a: Vector3, b: Vector3, t: number): Vector3 {
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      z: a.z + (b.z - a.z) * t
    }
  },

  clone(v: Vector3): Vector3 {
    return { x: v.x, y: v.y, z: v.z }
  },

  zero(): Vector3 {
    return { x: 0, y: 0, z: 0 }
  }
}

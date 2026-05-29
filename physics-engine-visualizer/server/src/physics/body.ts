import { RigidBody, Vector2, Shape, Material } from './types';
import { vec2, mat2, generateId, randomColor } from './math';

export function createRigidBody(
  shape: Shape,
  position: Vector2,
  material: Material = { friction: 0.3, restitution: 0.2, density: 1 },
  isStatic: boolean = false
): RigidBody {
  const mass = calculateMass(shape, material.density);
  const inertia = calculateInertia(shape, mass);

  return {
    id: generateId(),
    position: vec2.clone(position),
    rotation: 0,
    linearVelocity: vec2.zero(),
    angularVelocity: 0,
    force: vec2.zero(),
    torque: 0,
    mass: isStatic ? Infinity : mass,
    invMass: isStatic ? 0 : 1 / mass,
    inertia: isStatic ? Infinity : inertia,
    invInertia: isStatic ? 0 : 1 / inertia,
    shape,
    material,
    isSleeping: false,
    sleepTimer: 0,
    isStatic,
    trail: [],
    color: randomColor()
  };
}

function calculateMass(shape: Shape, density: number): number {
  if (shape.type === 'circle') {
    const radius = shape.radius!;
    return Math.PI * radius * radius * density;
  } else {
    const vertices = shape.vertices!;
    let area = 0;
    for (let i = 0; i < vertices.length; i++) {
      const j = (i + 1) % vertices.length;
      area += vec2.cross(vertices[i], vertices[j]);
    }
    area = Math.abs(area) * 0.5;
    return area * density;
  }
}

function calculateInertia(shape: Shape, mass: number): number {
  if (shape.type === 'circle') {
    const radius = shape.radius!;
    return 0.5 * mass * radius * radius;
  } else {
    const vertices = shape.vertices!;
    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < vertices.length; i++) {
      const j = (i + 1) % vertices.length;
      const cross = Math.abs(vec2.cross(vertices[i], vertices[j]));
      numerator += cross * (
        vec2.dot(vertices[i], vertices[i]) +
        vec2.dot(vertices[i], vertices[j]) +
        vec2.dot(vertices[j], vertices[j])
      );
      denominator += cross;
    }
    return (mass / 6) * (numerator / denominator);
  }
}

export function integrateBody(body: RigidBody, dt: number, gravity: Vector2): void {
  if (body.isStatic || body.isSleeping) return;

  body.linearVelocity = vec2.add(
    body.linearVelocity,
    vec2.mul(vec2.add(gravity, vec2.mul(body.force, body.invMass)), dt)
  );
  body.angularVelocity += body.torque * body.invInertia * dt;

  const damping = 0.998;
  body.linearVelocity = vec2.mul(body.linearVelocity, damping);
  body.angularVelocity *= damping;

  body.position = vec2.add(
    body.position,
    vec2.mul(body.linearVelocity, dt)
  );
  body.rotation += body.angularVelocity * dt;

  body.force = vec2.zero();
  body.torque = 0;

  if (body.trail.length === 0 || 
      vec2.distance(body.trail[body.trail.length - 1], body.position) > 5) {
    body.trail.push(vec2.clone(body.position));
    if (body.trail.length > 50) {
      body.trail.shift();
    }
  }
}

export function applyForce(body: RigidBody, force: Vector2): void {
  if (body.isStatic) return;
  body.force = vec2.add(body.force, force);
  wakeUp(body);
}

export function applyForceAtPoint(body: RigidBody, force: Vector2, point: Vector2): void {
  if (body.isStatic) return;
  body.force = vec2.add(body.force, force);
  const r = vec2.sub(point, body.position);
  body.torque += vec2.cross(r, force);
  wakeUp(body);
}

export function applyImpulse(body: RigidBody, impulse: Vector2): void {
  if (body.isStatic) return;
  body.linearVelocity = vec2.add(
    body.linearVelocity,
    vec2.mul(impulse, body.invMass)
  );
  wakeUp(body);
}

export function applyImpulseAtPoint(body: RigidBody, impulse: Vector2, point: Vector2): void {
  if (body.isStatic) return;
  body.linearVelocity = vec2.add(
    body.linearVelocity,
    vec2.mul(impulse, body.invMass)
  );
  const r = vec2.sub(point, body.position);
  body.angularVelocity += vec2.cross(r, impulse) * body.invInertia;
  wakeUp(body);
}

export function getWorldPoint(body: RigidBody, localPoint: Vector2): Vector2 {
  const rotated = mat2.mulVector(
    mat2.fromAngle(body.rotation),
    localPoint
  );
  return vec2.add(body.position, rotated);
}

export function getLocalPoint(body: RigidBody, worldPoint: Vector2): Vector2 {
  const relative = vec2.sub(worldPoint, body.position);
  return mat2.mulVector(
    mat2.fromAngle(-body.rotation),
    relative
  );
}

export function getVelocityAtPoint(body: RigidBody, point: Vector2): Vector2 {
  const r = vec2.sub(point, body.position);
  return vec2.add(
    body.linearVelocity,
    vec2.crossScalar(r, body.angularVelocity)
  );
}

export function wakeUp(body: RigidBody): void {
  body.isSleeping = false;
  body.sleepTimer = 0;
}

export function updateSleepState(body: RigidBody, dt: number, threshold: number): void {
  if (body.isStatic) return;

  const speedSq = vec2.lengthSq(body.linearVelocity);
  const angularSpeedSq = body.angularVelocity * body.angularVelocity;

  if (speedSq < threshold * threshold && angularSpeedSq < threshold * threshold) {
    body.sleepTimer += dt;
    if (body.sleepTimer > 0.5) {
      body.isSleeping = true;
    }
  } else {
    body.sleepTimer = 0;
    body.isSleeping = false;
  }
}

export function getTransformedVertices(body: RigidBody): Vector2[] {
  if (body.shape.type !== 'polygon') return [];
  const rotMat = mat2.fromAngle(body.rotation);
  return body.shape.vertices!.map(v =>
    vec2.add(body.position, mat2.mulVector(rotMat, v))
  );
}

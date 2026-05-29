export interface Vector2 {
  x: number;
  y: number;
}

export interface Matrix2x2 {
  m00: number;
  m01: number;
  m10: number;
  m11: number;
}

export interface Shape {
  type: 'circle' | 'polygon';
  radius?: number;
  vertices?: Vector2[];
}

export interface Material {
  friction: number;
  restitution: number;
  density: number;
}

export interface RigidBody {
  id: string;
  position: Vector2;
  rotation: number;
  linearVelocity: Vector2;
  angularVelocity: number;
  force: Vector2;
  torque: number;
  mass: number;
  invMass: number;
  inertia: number;
  invInertia: number;
  shape: Shape;
  material: Material;
  isSleeping: boolean;
  sleepTimer: number;
  isStatic: boolean;
  trail: Vector2[];
  color: string;
}

export type JointType = 'distance' | 'hinge' | 'slider' | 'spring';

export interface Joint {
  id: string;
  type: JointType;
  bodyA: string;
  bodyB: string;
  localAnchorA: Vector2;
  localAnchorB: Vector2;
  distance?: number;
  stiffness?: number;
  damping?: number;
  lowerLimit?: number;
  upperLimit?: number;
  motorSpeed?: number;
  maxMotorForce?: number;
  breakingThreshold?: number;
  isBroken: boolean;
  force: Vector2;
}

export interface ContactPoint {
  point: Vector2;
  normal: Vector2;
  penetration: number;
  tangent: Vector2;
  normalImpulse: number;
  tangentImpulse: number;
}

export interface Manifold {
  bodyA: string;
  bodyB: string;
  contacts: ContactPoint[];
  normal: Vector2;
}

export interface Particle {
  id: string;
  position: Vector2;
  velocity: Vector2;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

export interface PhysicsWorld {
  bodies: Map<string, RigidBody>;
  joints: Map<string, Joint>;
  manifolds: Manifold[];
  particles: Particle[];
  gravity: Vector2;
  iterations: number;
  timeStep: number;
  sleepingThreshold: number;
}

export interface Project {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  bodies: RigidBody[];
  joints: Joint[];
  gravity: Vector2;
}

export interface Vector2 {
  x: number;
  y: number;
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
  mass: number;
  invMass: number;
  inertia: number;
  invInertia: number;
  shape: Shape;
  material: Material;
  isSleeping: boolean;
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

export interface SimulationState {
  bodies: RigidBody[];
  joints: Joint[];
  manifolds: Manifold[];
  particles: Particle[];
  gravity: Vector2;
  iterations: number;
  timeStep: number;
}

export interface Preset {
  id: string;
  name: string;
}

export type ToolMode = 'select' | 'create-circle' | 'create-box' | 'create-polygon' | 'create-joint' | 'apply-impulse';

export interface ProjectInfo {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

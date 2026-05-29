import { PhysicsWorld, RigidBody, Joint, Manifold, Particle, Vector2 } from './types';
import { vec2 } from './math';
import { createRigidBody, integrateBody, updateSleepState, wakeUp, getVelocityAtPoint, applyImpulseAtPoint } from './body';
import { detectCollision } from './collision';
import { solveJoint, positionCorrection } from './constraints';

export function createWorld(gravity: Vector2 = vec2.create(0, 9.8)): PhysicsWorld {
  return {
    bodies: new Map(),
    joints: new Map(),
    manifolds: [],
    particles: [],
    gravity,
    iterations: 10,
    timeStep: 1 / 60,
    sleepingThreshold: 0.1
  };
}

export function addBody(world: PhysicsWorld, body: RigidBody): void {
  world.bodies.set(body.id, body);
}

export function removeBody(world: PhysicsWorld, bodyId: string): void {
  world.bodies.delete(bodyId);
  for (const [jointId, joint] of world.joints) {
    if (joint.bodyA === bodyId || joint.bodyB === bodyId) {
      world.joints.delete(jointId);
    }
  }
}

export function addJoint(world: PhysicsWorld, joint: Joint): void {
  world.joints.set(joint.id, joint);
}

export function removeJoint(world: PhysicsWorld, jointId: string): void {
  world.joints.delete(jointId);
}

export function step(world: PhysicsWorld, dt: number): void {
  const subSteps = Math.max(1, Math.ceil(dt / world.timeStep));
  const subDt = dt / subSteps;

  for (let s = 0; s < subSteps; s++) {
    for (const body of world.bodies.values()) {
      integrateBody(body, subDt, world.gravity);
    }

    broadPhase(world);

    for (const manifold of world.manifolds) {
      const bodyA = world.bodies.get(manifold.bodyA);
      const bodyB = world.bodies.get(manifold.bodyB);
      if (!bodyA || !bodyB) continue;

      preSolve(manifold, bodyA, bodyB, subDt);
    }

    for (let i = 0; i < world.iterations; i++) {
      for (const manifold of world.manifolds) {
        const bodyA = world.bodies.get(manifold.bodyA);
        const bodyB = world.bodies.get(manifold.bodyB);
        if (!bodyA || !bodyB) continue;

        solveCollision(manifold, bodyA, bodyB);
      }

      for (const joint of world.joints.values()) {
        const bodyA = world.bodies.get(joint.bodyA);
        const bodyB = world.bodies.get(joint.bodyB);
        if (!bodyA || !bodyB) continue;

        const newParticles = solveJoint(joint, bodyA, bodyB, subDt);
        world.particles.push(...newParticles);
      }
    }

    for (const manifold of world.manifolds) {
      const bodyA = world.bodies.get(manifold.bodyA);
      const bodyB = world.bodies.get(manifold.bodyB);
      if (!bodyA || !bodyB) continue;

      positionCorrection(bodyA, bodyB, manifold.normal, manifold.contacts[0]?.penetration || 0);
    }

    for (const body of world.bodies.values()) {
      updateSleepState(body, subDt, world.sleepingThreshold);
    }

    updateParticles(world, subDt);
  }
}

function broadPhase(world: PhysicsWorld): void {
  world.manifolds = [];
  const bodies = Array.from(world.bodies.values());

  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const bodyA = bodies[i];
      const bodyB = bodies[j];

      if (bodyA.isStatic && bodyB.isStatic) continue;
      if (bodyA.isSleeping && bodyB.isSleeping) continue;

      const manifold = detectCollision(bodyA, bodyB);
      if (manifold && manifold.contacts.length > 0) {
        world.manifolds.push(manifold);
        wakeUp(bodyA);
        wakeUp(bodyB);
      }
    }
  }
}

function preSolve(manifold: Manifold, bodyA: RigidBody, bodyB: RigidBody, dt: number): void {
  for (const contact of manifold.contacts) {
    const rA = vec2.sub(contact.point, bodyA.position);
    const rB = vec2.sub(contact.point, bodyB.position);

    const velA = getVelocityAtPoint(bodyA, contact.point);
    const velB = getVelocityAtPoint(bodyB, contact.point);
    const relVel = vec2.sub(velB, velA);
    const relVelNormal = vec2.dot(relVel, contact.normal);

    const restitution = Math.min(bodyA.material.restitution, bodyB.material.restitution);
    contact.normalImpulse = 0;
    contact.tangentImpulse = 0;

    const rANormal = vec2.cross(rA, contact.normal);
    const rBNormal = vec2.cross(rB, contact.normal);
    const normalMass = bodyA.invMass + bodyB.invMass +
      rANormal * rANormal * bodyA.invInertia +
      rBNormal * rBNormal * bodyB.invInertia;

    const rATangent = vec2.cross(rA, contact.tangent);
    const rBTangent = vec2.cross(rB, contact.tangent);
    const tangentMass = bodyA.invMass + bodyB.invMass +
      rATangent * rATangent * bodyA.invInertia +
      rBTangent * rBTangent * bodyB.invInertia;

    const bias = -0.2 / dt * Math.max(0, contact.penetration - 0.01);
  }
}

function solveCollision(manifold: Manifold, bodyA: RigidBody, bodyB: RigidBody): void {
  for (const contact of manifold.contacts) {
    const rA = vec2.sub(contact.point, bodyA.position);
    const rB = vec2.sub(contact.point, bodyB.position);

    const velA = getVelocityAtPoint(bodyA, contact.point);
    const velB = getVelocityAtPoint(bodyB, contact.point);
    const relVel = vec2.sub(velB, velA);
    const relVelNormal = vec2.dot(relVel, contact.normal);

    const rANormal = vec2.cross(rA, contact.normal);
    const rBNormal = vec2.cross(rB, contact.normal);
    const normalMass = bodyA.invMass + bodyB.invMass +
      rANormal * rANormal * bodyA.invInertia +
      rBNormal * rBNormal * bodyB.invInertia;

    if (normalMass === 0) continue;

    const restitution = Math.min(bodyA.material.restitution, bodyB.material.restitution);
    const bias = relVelNormal < -1 ? restitution * relVelNormal : 0;
    const lambda = -(relVelNormal + bias) / normalMass;

    const oldImpulse = contact.normalImpulse;
    contact.normalImpulse = Math.max(oldImpulse + lambda, 0);
    const deltaImpulse = contact.normalImpulse - oldImpulse;

    const impulseVec = vec2.mul(contact.normal, deltaImpulse);
    applyImpulseAtPoint(bodyA, vec2.negate(impulseVec), contact.point);
    applyImpulseAtPoint(bodyB, impulseVec, contact.point);

    const velA2 = getVelocityAtPoint(bodyA, contact.point);
    const velB2 = getVelocityAtPoint(bodyB, contact.point);
    const relVel2 = vec2.sub(velB2, velA2);
    const relVelTangent = vec2.dot(relVel2, contact.tangent);

    const rATangent = vec2.cross(rA, contact.tangent);
    const rBTangent = vec2.cross(rB, contact.tangent);
    const tangentMass = bodyA.invMass + bodyB.invMass +
      rATangent * rATangent * bodyA.invInertia +
      rBTangent * rBTangent * bodyB.invInertia;

    if (tangentMass === 0) continue;

    const friction = Math.sqrt(bodyA.material.friction * bodyB.material.friction);
    const maxFriction = friction * contact.normalImpulse;

    const lambdaTangent = -relVelTangent / tangentMass;
    const oldTangentImpulse = contact.tangentImpulse;
    contact.tangentImpulse = Math.max(-maxFriction, Math.min(maxFriction, oldTangentImpulse + lambdaTangent));
    const deltaTangentImpulse = contact.tangentImpulse - oldTangentImpulse;

    const tangentImpulseVec = vec2.mul(contact.tangent, deltaTangentImpulse);
    applyImpulseAtPoint(bodyA, vec2.negate(tangentImpulseVec), contact.point);
    applyImpulseAtPoint(bodyB, tangentImpulseVec, contact.point);
  }
}

function updateParticles(world: PhysicsWorld, dt: number): void {
  for (let i = world.particles.length - 1; i >= 0; i--) {
    const particle = world.particles[i];
    particle.position = vec2.add(particle.position, vec2.mul(particle.velocity, dt));
    particle.velocity = vec2.add(particle.velocity, vec2.mul(world.gravity, dt * 0.5));
    particle.life -= dt;

    if (particle.life <= 0) {
      world.particles.splice(i, 1);
    }
  }
}

export function applyImpulseToBody(world: PhysicsWorld, bodyId: string, impulse: Vector2): void {
  const body = world.bodies.get(bodyId);
  if (body) {
    applyImpulseAtPoint(body, impulse, body.position);
  }
}

export function clearWorld(world: PhysicsWorld): void {
  world.bodies.clear();
  world.joints.clear();
  world.manifolds = [];
  world.particles = [];
}

import { RigidBody, Joint, Vector2, Particle } from './types';
import { vec2, generateId, randomRange } from './math';
import { getWorldPoint, getVelocityAtPoint, applyImpulseAtPoint, wakeUp } from './body';

export function createJoint(
  type: Joint['type'],
  bodyA: RigidBody,
  bodyB: RigidBody,
  localAnchorA: Vector2 = vec2.zero(),
  localAnchorB: Vector2 = vec2.zero(),
  options: Partial<Joint> = {}
): Joint {
  const worldA = getWorldPoint(bodyA, localAnchorA);
  const worldB = getWorldPoint(bodyB, localAnchorB);
  const distance = vec2.distance(worldA, worldB);

  return {
    id: generateId(),
    type,
    bodyA: bodyA.id,
    bodyB: bodyB.id,
    localAnchorA,
    localAnchorB,
    distance,
    stiffness: type === 'spring' ? 100 : undefined,
    damping: type === 'spring' ? 5 : undefined,
    breakingThreshold: 1000,
    isBroken: false,
    force: vec2.zero(),
    ...options
  };
}

export function solveJoint(
  joint: Joint,
  bodyA: RigidBody,
  bodyB: RigidBody,
  dt: number
): Particle[] {
  if (joint.isBroken) return [];

  const particles: Particle[] = [];

  switch (joint.type) {
    case 'distance':
      solveDistanceJoint(joint, bodyA, bodyB);
      break;
    case 'hinge':
      solveHingeJoint(joint, bodyA, bodyB);
      break;
    case 'slider':
      solveSliderJoint(joint, bodyA, bodyB);
      break;
    case 'spring':
      solveSpringJoint(joint, bodyA, bodyB, dt);
      break;
  }

  const forceMagnitude = vec2.length(joint.force);
  if (joint.breakingThreshold && forceMagnitude > joint.breakingThreshold) {
    joint.isBroken = true;
    for (let i = 0; i < 15; i++) {
      particles.push(createBreakParticle(
        vec2.lerp(getWorldPoint(bodyA, joint.localAnchorA), getWorldPoint(bodyB, joint.localAnchorB), 0.5)
      ));
    }
  }

  return particles;
}

function solveDistanceJoint(joint: Joint, bodyA: RigidBody, bodyB: RigidBody): void {
  const worldA = getWorldPoint(bodyA, joint.localAnchorA);
  const worldB = getWorldPoint(bodyB, joint.localAnchorB);

  const delta = vec2.sub(worldB, worldA);
  const currentDistance = vec2.length(delta);
  const normal = currentDistance > 0 ? vec2.div(delta, currentDistance) : vec2.create(0, 1);

  const error = currentDistance - (joint.distance || 0);

  const rA = vec2.sub(worldA, bodyA.position);
  const rB = vec2.sub(worldB, bodyB.position);

  const velA = getVelocityAtPoint(bodyA, worldA);
  const velB = getVelocityAtPoint(bodyB, worldB);
  const relVel = vec2.sub(velB, velA);
  const relVelNormal = vec2.dot(relVel, normal);

  const rANormal = vec2.cross(rA, normal);
  const rBNormal = vec2.cross(rB, normal);

  const effectiveMass = bodyA.invMass + bodyB.invMass +
    rANormal * rANormal * bodyA.invInertia +
    rBNormal * rBNormal * bodyB.invInertia;

  const beta = 0.2;
  const bias = beta * error;
  const lambda = -(relVelNormal + bias) / effectiveMass;

  const impulse = vec2.mul(normal, lambda);
  joint.force = vec2.mul(normal, lambda * 60);

  applyImpulseAtPoint(bodyA, vec2.negate(impulse), worldA);
  applyImpulseAtPoint(bodyB, impulse, worldB);
}

function solveHingeJoint(joint: Joint, bodyA: RigidBody, bodyB: RigidBody): void {
  const worldA = getWorldPoint(bodyA, joint.localAnchorA);
  const worldB = getWorldPoint(bodyB, joint.localAnchorB);

  for (let i = 0; i < 2; i++) {
    const axis = i === 0 ? vec2.create(1, 0) : vec2.create(0, 1);

    const delta = vec2.sub(worldB, worldA);
    const error = vec2.dot(delta, axis);

    const rA = vec2.sub(worldA, bodyA.position);
    const rB = vec2.sub(worldB, bodyB.position);

    const velA = getVelocityAtPoint(bodyA, worldA);
    const velB = getVelocityAtPoint(bodyB, worldB);
    const relVel = vec2.sub(velB, velA);
    const relVelAxis = vec2.dot(relVel, axis);

    const rAAxis = vec2.cross(rA, axis);
    const rBAxis = vec2.cross(rB, axis);

    const effectiveMass = bodyA.invMass + bodyB.invMass +
      rAAxis * rAAxis * bodyA.invInertia +
      rBAxis * rBAxis * bodyB.invInertia;

    const beta = 0.3;
    const bias = beta * error;
    const lambda = -(relVelAxis + bias) / effectiveMass;

    const impulse = vec2.mul(axis, lambda);

    applyImpulseAtPoint(bodyA, vec2.negate(impulse), worldA);
    applyImpulseAtPoint(bodyB, impulse, worldB);
  }

  const delta = vec2.sub(worldB, worldA);
  joint.force = vec2.mul(vec2.normalize(delta), vec2.length(delta) * 100);
}

function solveSliderJoint(joint: Joint, bodyA: RigidBody, bodyB: RigidBody): void {
  const worldA = getWorldPoint(bodyA, joint.localAnchorA);
  const worldB = getWorldPoint(bodyB, joint.localAnchorB);

  const sliderAxis = vec2.normalize(vec2.create(1, 0));
  const perpAxis = vec2.create(-sliderAxis.y, sliderAxis.x);

  const delta = vec2.sub(worldB, worldA);
  const perpError = vec2.dot(delta, perpAxis);

  const rA = vec2.sub(worldA, bodyA.position);
  const rB = vec2.sub(worldB, bodyB.position);

  const velA = getVelocityAtPoint(bodyA, worldA);
  const velB = getVelocityAtPoint(bodyB, worldB);
  const relVel = vec2.sub(velB, velA);
  const relVelPerp = vec2.dot(relVel, perpAxis);

  const rAPerp = vec2.cross(rA, perpAxis);
  const rBPerp = vec2.cross(rB, perpAxis);

  const effectiveMass = bodyA.invMass + bodyB.invMass +
    rAPerp * rAPerp * bodyA.invInertia +
    rBPerp * rBPerp * bodyB.invInertia;

  const beta = 0.2;
  const bias = beta * perpError;
  const lambda = -(relVelPerp + bias) / effectiveMass;

  const impulse = vec2.mul(perpAxis, lambda);
  joint.force = vec2.mul(perpAxis, lambda * 60);

  applyImpulseAtPoint(bodyA, vec2.negate(impulse), worldA);
  applyImpulseAtPoint(bodyB, impulse, worldB);

  const slidePos = vec2.dot(delta, sliderAxis);
  if (joint.lowerLimit !== undefined && slidePos < joint.lowerLimit) {
    const limitError = slidePos - joint.lowerLimit;
    const relVelSlide = vec2.dot(relVel, sliderAxis);
    const rASlide = vec2.cross(rA, sliderAxis);
    const rBSlide = vec2.cross(rB, sliderAxis);
    const effectiveMassSlide = bodyA.invMass + bodyB.invMass +
      rASlide * rASlide * bodyA.invInertia +
      rBSlide * rBSlide * bodyB.invInertia;

    const lambdaLimit = -(relVelSlide + 0.3 * limitError) / effectiveMassSlide;
    const impulseLimit = vec2.mul(sliderAxis, lambdaLimit);
    applyImpulseAtPoint(bodyA, vec2.negate(impulseLimit), worldA);
    applyImpulseAtPoint(bodyB, impulseLimit, worldB);
  }
  if (joint.upperLimit !== undefined && slidePos > joint.upperLimit) {
    const limitError = slidePos - joint.upperLimit;
    const relVelSlide = vec2.dot(relVel, sliderAxis);
    const rASlide = vec2.cross(rA, sliderAxis);
    const rBSlide = vec2.cross(rB, sliderAxis);
    const effectiveMassSlide = bodyA.invMass + bodyB.invMass +
      rASlide * rASlide * bodyA.invInertia +
      rBSlide * rBSlide * bodyB.invInertia;

    const lambdaLimit = -(relVelSlide + 0.3 * limitError) / effectiveMassSlide;
    const impulseLimit = vec2.mul(sliderAxis, lambdaLimit);
    applyImpulseAtPoint(bodyA, vec2.negate(impulseLimit), worldA);
    applyImpulseAtPoint(bodyB, impulseLimit, worldB);
  }
}

function solveSpringJoint(joint: Joint, bodyA: RigidBody, bodyB: RigidBody, dt: number): void {
  const worldA = getWorldPoint(bodyA, joint.localAnchorA);
  const worldB = getWorldPoint(bodyB, joint.localAnchorB);

  const delta = vec2.sub(worldB, worldA);
  const currentDistance = vec2.length(delta);
  const normal = currentDistance > 0 ? vec2.div(delta, currentDistance) : vec2.create(0, 1);

  const displacement = currentDistance - (joint.distance || 0);
  const springForce = (joint.stiffness || 100) * displacement;

  const velA = getVelocityAtPoint(bodyA, worldA);
  const velB = getVelocityAtPoint(bodyB, worldB);
  const relVel = vec2.sub(velB, velA);
  const relVelNormal = vec2.dot(relVel, normal);
  const dampingForce = (joint.damping || 5) * relVelNormal;

  const totalForce = springForce + dampingForce;
  const forceVector = vec2.mul(normal, totalForce);

  joint.force = forceVector;

  bodyA.force = vec2.add(bodyA.force, forceVector);
  bodyB.force = vec2.sub(bodyB.force, forceVector);

  wakeUp(bodyA);
  wakeUp(bodyB);
}

function createBreakParticle(position: Vector2): Particle {
  const angle = randomRange(0, Math.PI * 2);
  const speed = randomRange(50, 200);
  const colors = ['#FF6B6B', '#FFE66D', '#FF8E53', '#FF4757'];

  return {
    id: generateId(),
    position: vec2.clone(position),
    velocity: vec2.create(
      Math.cos(angle) * speed,
      Math.sin(angle) * speed
    ),
    color: colors[Math.floor(Math.random() * colors.length)],
    life: 1,
    maxLife: 1,
    size: randomRange(3, 8)
  };
}

export function positionCorrection(
  bodyA: RigidBody,
  bodyB: RigidBody,
  normal: Vector2,
  penetration: number
): void {
  const correctionRate = 0.8;
  const slop = 0.01;
  const correction = Math.max(penetration - slop, 0) * correctionRate;

  const totalInvMass = bodyA.invMass + bodyB.invMass;
  if (totalInvMass === 0) return;

  const correctionA = correction * (bodyA.invMass / totalInvMass);
  const correctionB = correction * (bodyB.invMass / totalInvMass);

  bodyA.position = vec2.sub(bodyA.position, vec2.mul(normal, correctionA));
  bodyB.position = vec2.add(bodyB.position, vec2.mul(normal, correctionB));
}

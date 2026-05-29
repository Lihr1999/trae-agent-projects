import { Vector3, Body, SimulationConfig } from './types'
import { vec3 } from './vectorMath'

const SPEED_OF_LIGHT = 299792458

export function calculateGravitationalForce(
  bodyA: Body,
  bodyB: Body,
  config: SimulationConfig
): Vector3 {
  const r = vec3.sub(bodyB.position, bodyA.position)
  const distanceSq = vec3.lengthSquared(r)
  const distance = Math.sqrt(distanceSq)

  if (distance < bodyA.radius + bodyB.radius) {
    return vec3.zero()
  }

  const softening = 1e-6
  const softenedDistanceSq = distanceSq + softening * softening
  const softenedDistance = Math.sqrt(softenedDistanceSq)

  let forceMagnitude = (config.gravitationalConstant * bodyA.mass * bodyB.mass) / softenedDistanceSq

  if (config.useRelativisticCorrection) {
    forceMagnitude = applyRelativisticCorrection(bodyA, bodyB, forceMagnitude, distance, config)
  }

  const direction = vec3.div(r, softenedDistance)
  return vec3.mul(direction, forceMagnitude)
}

function applyRelativisticCorrection(
  bodyA: Body,
  bodyB: Body,
  newtonianForce: number,
  distance: number,
  config: SimulationConfig
): number {
  const vRel = vec3.length(vec3.sub(bodyA.velocity, bodyB.velocity))
  const beta = vRel / SPEED_OF_LIGHT

  if (beta < 0.01) {
    return newtonianForce
  }

  const gamma = 1 / Math.sqrt(1 - beta * beta)
  const relativisticFactor = Math.pow(gamma, 1.5)

  const reducedMass = (bodyA.mass * bodyB.mass) / (bodyA.mass + bodyB.mass)
  const schwarzschildRadius = (2 * config.gravitationalConstant * (bodyA.mass + bodyB.mass)) / (SPEED_OF_LIGHT * SPEED_OF_LIGHT)
  const postNewtonianCorrection = 1 + (3 * schwarzschildRadius) / (2 * distance)

  return newtonianForce * relativisticFactor * postNewtonianCorrection
}

export function calculateTotalAcceleration(
  body: Body,
  allBodies: Body[],
  config: SimulationConfig
): Vector3 {
  let totalForce = vec3.zero()

  for (const other of allBodies) {
    if (body.id === other.id) continue
    const force = calculateGravitationalForce(body, other, config)
    totalForce = vec3.add(totalForce, force)
  }

  return vec3.div(totalForce, body.mass)
}

export function calculateGravitationalPotential(
  position: Vector3,
  bodies: Body[],
  config: SimulationConfig
): number {
  let potential = 0

  for (const body of bodies) {
    const distance = vec3.distance(position, body.position)
    if (distance > 0) {
      potential -= (config.gravitationalConstant * body.mass) / distance
    }
  }

  return potential
}

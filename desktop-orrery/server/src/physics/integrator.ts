import { Body, SimulationConfig, CollisionEvent } from './types'
import { vec3 } from './vectorMath'
import { calculateTotalAcceleration } from './gravity'
import { buildOctree, calculateForceWithOctree, calculateBounds } from './barnesHut'

export interface Derivatives {
  velocity: { x: number; y: number; z: number }
  acceleration: { x: number; y: number; z: number }
}

export function evaluate(
  body: Body,
  allBodies: Body[],
  config: SimulationConfig,
  dt: number,
  derivatives: Derivatives
): Derivatives {
  const state: Body = {
    ...body,
    position: {
      x: body.position.x + derivatives.velocity.x * dt,
      y: body.position.y + derivatives.velocity.y * dt,
      z: body.position.z + derivatives.velocity.z * dt
    },
    velocity: {
      x: body.velocity.x + derivatives.acceleration.x * dt,
      y: body.velocity.y + derivatives.acceleration.y * dt,
      z: body.velocity.z + derivatives.acceleration.z * dt
    }
  }

  let acceleration: { x: number; y: number; z: number }

  if (config.useBarnesHut && allBodies.length > 10) {
    const bounds = calculateBounds(allBodies)
    const octree = buildOctree(allBodies, bounds.center, bounds.size)
    const force = calculateForceWithOctree(state, octree, config)
    acceleration = vec3.div(force, state.mass)
  } else {
    acceleration = calculateTotalAcceleration(state, allBodies, config)
  }

  return {
    velocity: vec3.clone(state.velocity),
    acceleration
  }
}

export function rk4Step(
  bodies: Body[],
  config: SimulationConfig,
  dt: number
): { bodies: Body[]; events: CollisionEvent[] } {
  const newBodies: Body[] = []
  const events: CollisionEvent[] = []

  for (const body of bodies) {
    const k1 = evaluate(body, bodies, config, 0, { velocity: vec3.zero(), acceleration: vec3.zero() })
    const k2 = evaluate(body, bodies, config, dt * 0.5, k1)
    const k3 = evaluate(body, bodies, config, dt * 0.5, k2)
    const k4 = evaluate(body, bodies, config, dt, k3)

    const newVelocity = {
      x: body.velocity.x + (dt / 6) * (k1.acceleration.x + 2 * k2.acceleration.x + 2 * k3.acceleration.x + k4.acceleration.x),
      y: body.velocity.y + (dt / 6) * (k1.acceleration.y + 2 * k2.acceleration.y + 2 * k3.acceleration.y + k4.acceleration.y),
      z: body.velocity.z + (dt / 6) * (k1.acceleration.z + 2 * k2.acceleration.z + 2 * k3.acceleration.z + k4.acceleration.z)
    }

    const newPosition = {
      x: body.position.x + (dt / 6) * (k1.velocity.x + 2 * k2.velocity.x + 2 * k3.velocity.x + k4.velocity.x),
      y: body.position.y + (dt / 6) * (k1.velocity.y + 2 * k2.velocity.y + 2 * k3.velocity.y + k4.velocity.y),
      z: body.position.z + (dt / 6) * (k1.velocity.z + 2 * k2.velocity.z + 2 * k3.velocity.z + k4.velocity.z)
    }

    newBodies.push({
      ...body,
      position: newPosition,
      velocity: newVelocity
    })
  }

  if (config.collisionDetection) {
    const collisionResults = detectCollisionsAndCloseEncounters(newBodies, config)
    events.push(...collisionResults.events)
    return { bodies: collisionResults.bodies, events }
  }

  return { bodies: newBodies, events }
}

export function detectCollisionsAndCloseEncounters(
  bodies: Body[],
  config: SimulationConfig
): { bodies: Body[]; events: CollisionEvent[] } {
  const events: CollisionEvent[] = []
  const mergedBodies = new Set<string>()
  const finalBodies: Body[] = []

  for (let i = 0; i < bodies.length; i++) {
    if (mergedBodies.has(bodies[i].id)) continue

    let bodyI = { ...bodies[i] }

    for (let j = i + 1; j < bodies.length; j++) {
      if (mergedBodies.has(bodies[j].id)) continue

      const bodyJ = bodies[j]
      const distance = vec3.distance(bodyI.position, bodyJ.position)
      const minDistance = bodyI.radius + bodyJ.radius

      if (distance < minDistance * 5 && distance >= minDistance) {
        events.push({
          type: 'close-encounter',
          bodies: [bodyI.id, bodyJ.id],
          position: vec3.lerp(bodyI.position, bodyJ.position, 0.5),
          time: Date.now(),
          severity: 1 - distance / (minDistance * 5)
        })
      }

      if (distance < minDistance) {
        const totalMass = bodyI.mass + bodyJ.mass
        const newPosition = vec3.div(
          vec3.add(
            vec3.mul(bodyI.position, bodyI.mass),
            vec3.mul(bodyJ.position, bodyJ.mass)
          ),
          totalMass
        )
        const newVelocity = vec3.div(
          vec3.add(
            vec3.mul(bodyI.velocity, bodyI.mass),
            vec3.mul(bodyJ.velocity, bodyJ.mass)
          ),
          totalMass
        )

        bodyI = {
          ...bodyI,
          mass: totalMass,
          position: newPosition,
          velocity: newVelocity,
          radius: Math.cbrt(Math.pow(bodyI.radius, 3) + Math.pow(bodyJ.radius, 3))
        }

        mergedBodies.add(bodyJ.id)

        events.push({
          type: 'collision',
          bodies: [bodies[i].id, bodyJ.id],
          position: newPosition,
          time: Date.now(),
          severity: 1
        })
      }
    }

    finalBodies.push(bodyI)
  }

  return { bodies: finalBodies, events }
}

export function calculateAdaptiveTimeStep(
  bodies: Body[],
  config: SimulationConfig
): number {
  if (!config.adaptiveTimeStep) {
    return config.timeStep * config.timeMultiplier
  }

  let minTimestep = config.maxTimeStep

  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const distance = vec3.distance(bodies[i].position, bodies[j].position)
      const relativeVelocity = vec3.distance(bodies[i].velocity, bodies[j].velocity)

      if (relativeVelocity > 0) {
        const timeToCollision = distance / relativeVelocity
        const safeTimestep = timeToCollision * 0.1

        if (safeTimestep < minTimestep) {
          minTimestep = safeTimestep
        }
      }
    }
  }

  minTimestep = Math.max(minTimestep, config.minTimeStep)
  minTimestep = Math.min(minTimestep, config.maxTimeStep)

  return minTimestep * config.timeMultiplier
}

export function simulateStep(
  bodies: Body[],
  config: SimulationConfig,
  simulationTime: number
): { bodies: Body[]; events: CollisionEvent[]; dt: number; newTime: number } {
  const dt = calculateAdaptiveTimeStep(bodies, config)
  const result = rk4Step(bodies, config, dt)

  if (config.referenceFrame) {
    const referenceBody = result.bodies.find(b => b.id === config.referenceFrame)
    if (referenceBody) {
      const offsetPos = vec3.clone(referenceBody.position)
      const offsetVel = vec3.clone(referenceBody.velocity)

      result.bodies = result.bodies.map(b => ({
        ...b,
        position: vec3.sub(b.position, offsetPos),
        velocity: vec3.sub(b.velocity, offsetVel)
      }))
    }
  }

  return {
    bodies: result.bodies,
    events: result.events,
    dt,
    newTime: simulationTime + dt
  }
}

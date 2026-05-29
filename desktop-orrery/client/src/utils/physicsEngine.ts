import type { Body, SimulationConfig, Vector3, CollisionEvent, OctreeNode } from '../types'

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

const SPEED_OF_LIGHT = 299792458

function calculateGravitationalForce(
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

  const schwarzschildRadius = (2 * config.gravitationalConstant * (bodyA.mass + bodyB.mass)) / (SPEED_OF_LIGHT * SPEED_OF_LIGHT)
  const postNewtonianCorrection = 1 + (3 * schwarzschildRadius) / (2 * distance)

  return newtonianForce * relativisticFactor * postNewtonianCorrection
}

function calculateTotalAcceleration(
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

function buildOctree(bodies: Body[], center: Vector3, size: number): OctreeNode {
  const node: OctreeNode = {
    center,
    size,
    mass: 0,
    centerOfMass: vec3.zero(),
    body: null,
    children: null
  }

  const bodiesInNode = bodies.filter(b => isBodyInNode(b, node))

  if (bodiesInNode.length === 0) {
    return node
  }

  if (bodiesInNode.length === 1) {
    node.body = bodiesInNode[0]
    node.mass = bodiesInNode[0].mass
    node.centerOfMass = vec3.clone(bodiesInNode[0].position)
    return node
  }

  node.children = []
  const halfSize = size / 2
  const quarterSize = halfSize / 2

  for (let i = 0; i < 8; i++) {
    const childCenter = {
      x: center.x + (i & 1 ? quarterSize : -quarterSize),
      y: center.y + (i & 2 ? quarterSize : -quarterSize),
      z: center.z + (i & 4 ? quarterSize : -quarterSize)
    }
    node.children.push(buildOctree(bodiesInNode, childCenter, halfSize))
  }

  let totalMass = 0
  let weightedCenter = vec3.zero()

  for (const child of node.children) {
    if (child.mass > 0) {
      totalMass += child.mass
      weightedCenter = vec3.add(weightedCenter, vec3.mul(child.centerOfMass, child.mass))
    }
  }

  if (totalMass > 0) {
    node.mass = totalMass
    node.centerOfMass = vec3.div(weightedCenter, totalMass)
  }

  return node
}

function isBodyInNode(body: Body, node: OctreeNode): boolean {
  const halfSize = node.size / 2
  return (
    body.position.x >= node.center.x - halfSize &&
    body.position.x < node.center.x + halfSize &&
    body.position.y >= node.center.y - halfSize &&
    body.position.y < node.center.y + halfSize &&
    body.position.z >= node.center.z - halfSize &&
    body.position.z < node.center.z + halfSize
  )
}

function calculateForceWithOctree(
  body: Body,
  node: OctreeNode,
  config: SimulationConfig
): Vector3 {
  if (node.mass === 0 || !node.body && !node.children) {
    return vec3.zero()
  }

  if (node.body) {
    if (node.body.id === body.id) {
      return vec3.zero()
    }
    return calculateGravitationalForce(body, node.body, config)
  }

  const distance = vec3.distance(body.position, node.centerOfMass)
  const ratio = node.size / distance

  if (ratio < config.barnesHutTheta && node.children) {
    const pseudoBody: Body = {
      id: 'pseudo',
      name: 'pseudo',
      mass: node.mass,
      position: node.centerOfMass,
      velocity: vec3.zero(),
      radius: 0,
      color: '#000',
      trail: []
    }
    return calculateGravitationalForce(body, pseudoBody, config)
  }

  let totalForce = vec3.zero()
  if (node.children) {
    for (const child of node.children) {
      totalForce = vec3.add(totalForce, calculateForceWithOctree(body, child, config))
    }
  }

  return totalForce
}

function calculateBounds(bodies: Body[]): { center: Vector3; size: number } {
  if (bodies.length === 0) {
    return { center: vec3.zero(), size: 1000 }
  }

  let minX = Infinity, minY = Infinity, minZ = Infinity
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity

  for (const body of bodies) {
    minX = Math.min(minX, body.position.x)
    minY = Math.min(minY, body.position.y)
    minZ = Math.min(minZ, body.position.z)
    maxX = Math.max(maxX, body.position.x)
    maxY = Math.max(maxY, body.position.y)
    maxZ = Math.max(maxZ, body.position.z)
  }

  const size = Math.max(maxX - minX, maxY - minY, maxZ - minZ) * 2
  const center = {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
    z: (minZ + maxZ) / 2
  }

  return { center, size: Math.max(size, 1000) }
}

interface Derivatives {
  velocity: Vector3
  acceleration: Vector3
}

function evaluate(
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

  let acceleration: Vector3

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

function detectCollisionsAndCloseEncounters(
  bodies: Body[],
  config: SimulationConfig
): { bodies: Body[]; events: CollisionEvent[] } {
  const events: CollisionEvent[] = []
  const mergedBodies = new Set<string>()
  const finalBodies: Body[] = []

  for (let i = 0; i < bodies.length; i++) {
    if (mergedBodies.has(bodies[i].id)) continue

    let bodyI = { ...bodies[i], trail: [...bodies[i].trail] }

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
  currentSimulationTime: number
): { bodies: Body[]; events: CollisionEvent[]; dt: number; newTime: number } {
  const dt = calculateAdaptiveTimeStep(bodies, config)
  const newBodies: Body[] = []
  const events: CollisionEvent[] = []

  const subSteps = Math.max(1, Math.ceil(dt / config.timeStep))
  const subDt = dt / subSteps

  let workingBodies = bodies.map(b => ({ ...b, position: { ...b.position }, velocity: { ...b.velocity } }))

  for (let step = 0; step < subSteps; step++) {
    const stepBodies: Body[] = []

    for (const body of workingBodies) {
      const k1 = evaluate(body, workingBodies, config, 0, { velocity: vec3.zero(), acceleration: vec3.zero() })
      const k2 = evaluate(body, workingBodies, config, subDt * 0.5, k1)
      const k3 = evaluate(body, workingBodies, config, subDt * 0.5, k2)
      const k4 = evaluate(body, workingBodies, config, subDt, k3)

      const newVelocity = {
        x: body.velocity.x + (subDt / 6) * (k1.acceleration.x + 2 * k2.acceleration.x + 2 * k3.acceleration.x + k4.acceleration.x),
        y: body.velocity.y + (subDt / 6) * (k1.acceleration.y + 2 * k2.acceleration.y + 2 * k3.acceleration.y + k4.acceleration.y),
        z: body.velocity.z + (subDt / 6) * (k1.acceleration.z + 2 * k2.acceleration.z + 2 * k3.acceleration.z + k4.acceleration.z)
      }

      const newPosition = {
        x: body.position.x + (subDt / 6) * (k1.velocity.x + 2 * k2.velocity.x + 2 * k3.velocity.x + k4.velocity.x),
        y: body.position.y + (subDt / 6) * (k1.velocity.y + 2 * k2.velocity.y + 2 * k3.velocity.y + k4.velocity.y),
        z: body.position.z + (subDt / 6) * (k1.velocity.z + 2 * k2.velocity.z + 2 * k3.velocity.z + k4.velocity.z)
      }

      stepBodies.push({
        ...body,
        position: newPosition,
        velocity: newVelocity
      })
    }

    workingBodies = stepBodies

    if (config.collisionDetection) {
      const collisionResults = detectCollisionsAndCloseEncounters(workingBodies, config)
      events.push(...collisionResults.events)
      workingBodies = collisionResults.bodies
    }
  }

  for (const body of workingBodies) {
    newBodies.push({
      ...body,
      trail: [...bodies.find(b => b.id === body.id)?.trail || []]
    })
  }

  if (config.referenceFrame) {
    const referenceBody = newBodies.find(b => b.id === config.referenceFrame)
    if (referenceBody) {
      const offsetPos = vec3.clone(referenceBody.position)
      const offsetVel = vec3.clone(referenceBody.velocity)

      for (const body of newBodies) {
        body.position = vec3.sub(body.position, offsetPos)
        body.velocity = vec3.sub(body.velocity, offsetVel)
      }
    }
  }

  return {
    bodies: newBodies,
    events,
    dt,
    newTime: currentSimulationTime + dt
  }
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

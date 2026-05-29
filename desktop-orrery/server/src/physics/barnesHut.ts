import { Vector3, Body, OctreeNode, SimulationConfig } from './types'
import { vec3 } from './vectorMath'
import { calculateGravitationalForce } from './gravity'

export function buildOctree(bodies: Body[], center: Vector3, size: number): OctreeNode {
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

export function calculateForceWithOctree(
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
      radius: 0
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

export function calculateBounds(bodies: Body[]): { center: Vector3; size: number } {
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

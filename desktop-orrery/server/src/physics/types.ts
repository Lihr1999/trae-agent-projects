export interface Vector3 {
  x: number
  y: number
  z: number
}

export interface Body {
  id: string
  name: string
  mass: number
  position: Vector3
  velocity: Vector3
  radius: number
}

export interface SimulationConfig {
  gravitationalConstant: number
  timeStep: number
  timeMultiplier: number
  useBarnesHut: boolean
  barnesHutTheta: number
  useRelativisticCorrection: boolean
  adaptiveTimeStep: boolean
  minTimeStep: number
  maxTimeStep: number
  collisionDetection: boolean
  referenceFrame: string | null
}

export interface OctreeNode {
  center: Vector3
  size: number
  mass: number
  centerOfMass: Vector3
  body: Body | null
  children: OctreeNode[] | null
}

export interface CollisionEvent {
  type: 'collision' | 'close-encounter'
  bodies: string[]
  position: Vector3
  time: number
  severity: number
}

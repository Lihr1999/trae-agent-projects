import { Hono } from 'hono'
import { simulateStep } from '../physics/integrator'
import { calculateGravitationalPotential } from '../physics/gravity'
import type { Body, SimulationConfig } from '../physics/types'
import { vec3 } from '../physics/vectorMath'

const physics = new Hono()

interface StepRequest {
  bodies: Body[]
  config: SimulationConfig
  simulationTime: number
}

physics.post('/step', async (c) => {
  try {
    const body = await c.req.json() as StepRequest
    const result = simulateStep(body.bodies, body.config, body.simulationTime)
    return c.json(result)
  } catch (error) {
    return c.json({ error: 'Invalid request body' }, 400)
  }
})

interface PotentialRequest {
  x: number
  y: number
  z: number
  bodies: Body[]
  config: SimulationConfig
}

physics.post('/potential', async (c) => {
  try {
    const body = await c.req.json() as PotentialRequest
    const potential = calculateGravitationalPotential(
      { x: body.x, y: body.y, z: body.z },
      body.bodies,
      body.config
    )
    return c.json({ potential })
  } catch (error) {
    return c.json({ error: 'Invalid request body' }, 400)
  }
})

interface PotentialGridRequest {
  bounds: { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } }
  resolution: number
  bodies: Body[]
  config: SimulationConfig
}

physics.post('/potential-grid', async (c) => {
  try {
    const body = await c.req.json() as PotentialGridRequest
    const { bounds, resolution, bodies, config } = body

    const grid: { x: number; y: number; z: number; potential: number }[] = []
    const stepX = (bounds.max.x - bounds.min.x) / resolution
    const stepZ = (bounds.max.z - bounds.min.z) / resolution

    for (let i = 0; i <= resolution; i++) {
      for (let j = 0; j <= resolution; j++) {
        const x = bounds.min.x + i * stepX
        const z = bounds.min.z + j * stepZ
        const potential = calculateGravitationalPotential({ x, y: 0, z }, bodies, config)
        grid.push({ x, y: 0, z, potential })
      }
    }

    return c.json({ grid })
  } catch (error) {
    return c.json({ error: 'Invalid request body' }, 400)
  }
})

export default physics

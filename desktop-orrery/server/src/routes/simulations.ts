import { Hono } from 'hono'
import { saveSimulation, getSimulation, getAllSimulations, updateSimulation, deleteSimulation } from '../db/database'
import type { Body, SimulationConfig } from '../physics/types'

const simulations = new Hono()

interface SimulationRequest {
  name: string
  bodies: Body[]
  config: SimulationConfig
}

simulations.get('/', async (c) => {
  const all = await getAllSimulations()
  return c.json(all.map(s => ({
    id: s.id,
    name: s.name,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt
  })))
})

simulations.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const simulation = await getSimulation(id)

  if (!simulation) {
    return c.json({ error: 'Simulation not found' }, 404)
  }

  return c.json(simulation)
})

simulations.post('/', async (c) => {
  try {
    const body = await c.req.json() as SimulationRequest
    const id = await saveSimulation(body.name, body.bodies, body.config)
    return c.json({ id, name: body.name }, 201)
  } catch (error) {
    return c.json({ error: 'Invalid request body' }, 400)
  }
})

simulations.put('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))

  try {
    const body = await c.req.json() as SimulationRequest
    const success = await updateSimulation(id, body.name, body.bodies, body.config)

    if (!success) {
      return c.json({ error: 'Simulation not found' }, 404)
    }

    return c.json({ id, name: body.name })
  } catch (error) {
    return c.json({ error: 'Invalid request body' }, 400)
  }
})

simulations.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const success = await deleteSimulation(id)

  if (!success) {
    return c.json({ error: 'Simulation not found' }, 404)
  }

  return c.json({ success: true })
})

export default simulations

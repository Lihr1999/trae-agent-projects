import { Hono } from 'hono'
import { presetScenes, getPresetScene } from '../physics/presets'

const presets = new Hono()

presets.get('/', (c) => {
  return c.json(presetScenes.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description
  })))
})

presets.get('/:id', (c) => {
  const id = c.req.param('id')
  const scene = getPresetScene(id)

  if (!scene) {
    return c.json({ error: 'Preset not found' }, 404)
  }

  return c.json(scene)
})

export default presets

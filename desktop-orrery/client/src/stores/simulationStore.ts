import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Body, SimulationConfig, CollisionEvent, Vector3 } from '../types'

export const useSimulationStore = defineStore('simulation', () => {
  const bodies = ref<Body[]>([])
  const config = ref<SimulationConfig>({
    gravitationalConstant: 6.67430e-11,
    timeStep: 3600,
    timeMultiplier: 1000,
    useBarnesHut: false,
    barnesHutTheta: 0.7,
    useRelativisticCorrection: false,
    adaptiveTimeStep: true,
    minTimeStep: 1,
    maxTimeStep: 86400,
    collisionDetection: true,
    referenceFrame: null
  })

  const isRunning = ref(false)
  const simulationTime = ref(0)
  const events = ref<CollisionEvent[]>([])
  const trailLength = ref(500)
  const showTrails = ref(true)
  const showPotentialField = ref(false)
  const showLabels = ref(true)

  const bodyColors: Record<string, string> = {
    sun: '#ffdd44',
    mercury: '#b5b5b5',
    venus: '#e6c87a',
    earth: '#6b93d6',
    mars: '#c1440e',
    jupiter: '#d8ca9d',
    saturn: '#f4d59e',
    uranus: '#d1e7e7',
    neptune: '#5b5ddf',
    moon: '#cccccc',
    'star-a': '#ffaa44',
    'star-b': '#44aaff',
    probe: '#44ff88',
    planet: '#8844ff',
    central: '#ff44aa',
    l4: '#88ff44',
    l5: '#ff8844'
  }

  const defaultColor = '#ffffff'

  function getBodyColor(id: string, name: string): string {
    if (bodyColors[id]) return bodyColors[id]
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const hue = hash % 360
    return `hsl(${hue}, 70%, 60%)`
  }

  function addBody(body: Omit<Body, 'id' | 'trail'>) {
    const newBody: Body = {
      ...body,
      id: `body-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      color: body.color || getBodyColor('', body.name),
      trail: []
    }
    bodies.value.push(newBody)
  }

  function removeBody(id: string) {
    const index = bodies.value.findIndex(b => b.id === id)
    if (index !== -1) {
      bodies.value.splice(index, 1)
    }
  }

  function updateBody(id: string, updates: Partial<Body>) {
    const body = bodies.value.find(b => b.id === id)
    if (body) {
      Object.assign(body, updates)
    }
  }

  function setBodies(newBodies: (Omit<Body, 'trail'> & { color?: string })[]) {
    bodies.value = newBodies.map(b => ({
      ...b,
      color: b.color || getBodyColor(b.id, b.name),
      trail: []
    }))
  }

  function updateConfig(updates: Partial<SimulationConfig>) {
    Object.assign(config.value, updates)
  }

  function addTrailPoint(id: string, position: Vector3) {
    const body = bodies.value.find(b => b.id === id)
    if (body && showTrails.value) {
      body.trail.push({ ...position })
      if (body.trail.length > trailLength.value) {
        body.trail.shift()
      }
    }
  }

  function clearTrails() {
    bodies.value.forEach(b => {
      b.trail = []
    })
  }

  function addEvent(event: CollisionEvent) {
    events.value.push(event)
    if (events.value.length > 100) {
      events.value.shift()
    }
  }

  function clearEvents() {
    events.value = []
  }

  function reset() {
    bodies.value = []
    simulationTime.value = 0
    events.value = []
    isRunning.value = false
  }

  const bodyCount = computed(() => bodies.value.length)
  const totalMass = computed(() => bodies.value.reduce((sum, b) => sum + b.mass, 0))

  return {
    bodies,
    config,
    isRunning,
    simulationTime,
    events,
    trailLength,
    showTrails,
    showPotentialField,
    showLabels,
    addBody,
    removeBody,
    updateBody,
    setBodies,
    updateConfig,
    addTrailPoint,
    clearTrails,
    addEvent,
    clearEvents,
    reset,
    bodyCount,
    totalMass,
    getBodyColor
  }
})

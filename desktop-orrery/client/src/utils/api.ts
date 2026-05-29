import type { PresetScene, SavedSimulation, Body, SimulationConfig, CollisionEvent } from '../types'

const API_BASE = '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    },
    ...options
  })

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`)
  }

  return response.json()
}

export const presetsApi = {
  list: () => request<{ id: string; name: string; description: string }[]>('/presets'),
  get: (id: string) => request<PresetScene>(`/presets/${id}`)
}

export const simulationsApi = {
  list: () => request<{ id: number; name: string; createdAt: string; updatedAt: string }[]>('/simulations'),
  get: (id: number) => request<SavedSimulation>(`/simulations/${id}`),
  save: (name: string, bodies: Body[], config: SimulationConfig) =>
    request<{ id: number; name: string }>('/simulations', {
      method: 'POST',
      body: JSON.stringify({ name, bodies, config })
    }),
  update: (id: number, name: string, bodies: Body[], config: SimulationConfig) =>
    request<{ id: number; name: string }>(`/simulations/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, bodies, config })
    }),
  delete: (id: number) => request<{ success: boolean }>(`/simulations/${id}`, { method: 'DELETE' })
}

export const physicsApi = {
  step: (bodies: Body[], config: SimulationConfig, simulationTime: number) =>
    request<{ bodies: Body[]; events: CollisionEvent[]; dt: number; newTime: number }>('/physics/step', {
      method: 'POST',
      body: JSON.stringify({ bodies, config, simulationTime })
    }),
  potential: (x: number, y: number, z: number, bodies: Body[], config: SimulationConfig) =>
    request<{ potential: number }>('/physics/potential', {
      method: 'POST',
      body: JSON.stringify({ x, y, z, bodies, config })
    }),
  potentialGrid: (bounds: any, resolution: number, bodies: Body[], config: SimulationConfig) =>
    request<{ grid: { x: number; y: number; z: number; potential: number }[] }>('/physics/potential-grid', {
      method: 'POST',
      body: JSON.stringify({ bounds, resolution, bodies, config })
    })
}

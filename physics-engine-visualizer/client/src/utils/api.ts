import { SimulationState, RigidBody, Joint, Vector2, Preset, ProjectInfo } from '../types';

const API_BASE = '/api';

const DEFAULT_STATE: SimulationState = {
  bodies: [],
  joints: [],
  manifolds: [],
  particles: [],
  gravity: { x: 0, y: 500 },
  iterations: 10,
  timeStep: 1 / 60
};

function mergeWithDefaults(data: Partial<SimulationState> | null | undefined): SimulationState {
  if (!data) return { ...DEFAULT_STATE };
  return {
    bodies: Array.isArray(data.bodies) ? data.bodies : DEFAULT_STATE.bodies,
    joints: Array.isArray(data.joints) ? data.joints : DEFAULT_STATE.joints,
    manifolds: Array.isArray(data.manifolds) ? data.manifolds : DEFAULT_STATE.manifolds,
    particles: Array.isArray(data.particles) ? data.particles : DEFAULT_STATE.particles,
    gravity: data.gravity && typeof data.gravity.x === 'number' && typeof data.gravity.y === 'number'
      ? data.gravity
      : DEFAULT_STATE.gravity,
    iterations: typeof data.iterations === 'number' ? data.iterations : DEFAULT_STATE.iterations,
    timeStep: typeof data.timeStep === 'number' ? data.timeStep : DEFAULT_STATE.timeStep
  };
}

async function safeFetch<T>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(url, options);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export async function stepSimulation(dt: number = 1 / 60): Promise<SimulationState> {
  const data = await safeFetch<Partial<SimulationState>>(`${API_BASE}/simulation/step`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dt })
  });
  return mergeWithDefaults(data);
}

export async function getSimulationState(): Promise<SimulationState> {
  const data = await safeFetch<Partial<SimulationState>>(`${API_BASE}/simulation/state`);
  return mergeWithDefaults(data);
}

export async function createBody(
  shape: RigidBody['shape'],
  position: Vector2,
  material: RigidBody['material'] = { friction: 0.3, restitution: 0.2, density: 1 },
  isStatic: boolean = false
): Promise<RigidBody | null> {
  return await safeFetch<RigidBody>(`${API_BASE}/simulation/body`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shape, position, material, isStatic })
  });
}

export async function deleteBody(id: string): Promise<boolean> {
  try {
    await fetch(`${API_BASE}/simulation/body/${id}`, { method: 'DELETE' });
    return true;
  } catch {
    return false;
  }
}

export async function createJoint(
  type: Joint['type'],
  bodyA: string,
  bodyB: string,
  localAnchorA: Vector2,
  localAnchorB: Vector2,
  options: Partial<Joint> = {}
): Promise<Joint | null> {
  return await safeFetch<Joint>(`${API_BASE}/simulation/joint`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, bodyA, bodyB, localAnchorA, localAnchorB, options })
  });
}

export async function deleteJoint(id: string): Promise<boolean> {
  try {
    await fetch(`${API_BASE}/simulation/joint/${id}`, { method: 'DELETE' });
    return true;
  } catch {
    return false;
  }
}

export async function applyImpulse(bodyId: string, impulse: Vector2): Promise<boolean> {
  try {
    await fetch(`${API_BASE}/simulation/impulse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bodyId, impulse })
    });
    return true;
  } catch {
    return false;
  }
}

export async function setGravity(gravity: Vector2): Promise<boolean> {
  try {
    await fetch(`${API_BASE}/simulation/gravity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gravity)
    });
    return true;
  } catch {
    return false;
  }
}

export async function loadPreset(id: string): Promise<SimulationState> {
  const data = await safeFetch<Partial<SimulationState>>(`${API_BASE}/simulation/preset/${id}`, {
    method: 'POST'
  });
  return mergeWithDefaults(data);
}

export async function getPresets(): Promise<Preset[]> {
  const data = await safeFetch<Preset[]>(`${API_BASE}/simulation/presets`);
  return Array.isArray(data) ? data : [];
}

export async function clearSimulation(): Promise<boolean> {
  try {
    await fetch(`${API_BASE}/simulation/clear`, { method: 'POST' });
    return true;
  } catch {
    return false;
  }
}

export async function setSimulationSettings(settings: {
  iterations?: number;
  timeStep?: number;
  sleepingThreshold?: number;
}): Promise<boolean> {
  try {
    await fetch(`${API_BASE}/simulation/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    return true;
  } catch {
    return false;
  }
}

export async function getProjects(): Promise<ProjectInfo[]> {
  const data = await safeFetch<ProjectInfo[]>(`${API_BASE}/projects`);
  return Array.isArray(data) ? data : [];
}

export async function saveProject(name: string, state: SimulationState): Promise<{ id: string; name: string } | null> {
  return await safeFetch<{ id: string; name: string }>(`${API_BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      bodies: state.bodies,
      joints: state.joints,
      gravity: state.gravity
    })
  });
}

export async function loadProject(id: string): Promise<SimulationState> {
  const data = await safeFetch<Partial<SimulationState>>(`${API_BASE}/projects/${id}`);
  return mergeWithDefaults(data);
}

export async function deleteProject(id: string): Promise<boolean> {
  try {
    await fetch(`${API_BASE}/projects/${id}`, { method: 'DELETE' });
    return true;
  } catch {
    return false;
  }
}

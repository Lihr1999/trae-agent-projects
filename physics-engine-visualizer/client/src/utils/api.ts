import { SimulationState, RigidBody, Joint, Vector2, Preset, ProjectInfo } from '../types';

const API_BASE = '/api';

export async function stepSimulation(dt: number = 1 / 60): Promise<SimulationState> {
  const response = await fetch(`${API_BASE}/simulation/step`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dt })
  });
  return response.json();
}

export async function getSimulationState(): Promise<SimulationState> {
  const response = await fetch(`${API_BASE}/simulation/state`);
  return response.json();
}

export async function createBody(
  shape: RigidBody['shape'],
  position: Vector2,
  material: RigidBody['material'] = { friction: 0.3, restitution: 0.2, density: 1 },
  isStatic: boolean = false
): Promise<RigidBody> {
  const response = await fetch(`${API_BASE}/simulation/body`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shape, position, material, isStatic })
  });
  return response.json();
}

export async function deleteBody(id: string): Promise<void> {
  await fetch(`${API_BASE}/simulation/body/${id}`, { method: 'DELETE' });
}

export async function createJoint(
  type: Joint['type'],
  bodyA: string,
  bodyB: string,
  localAnchorA: Vector2,
  localAnchorB: Vector2,
  options: Partial<Joint> = {}
): Promise<Joint> {
  const response = await fetch(`${API_BASE}/simulation/joint`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, bodyA, bodyB, localAnchorA, localAnchorB, options })
  });
  return response.json();
}

export async function deleteJoint(id: string): Promise<void> {
  await fetch(`${API_BASE}/simulation/joint/${id}`, { method: 'DELETE' });
}

export async function applyImpulse(bodyId: string, impulse: Vector2): Promise<void> {
  await fetch(`${API_BASE}/simulation/impulse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bodyId, impulse })
  });
}

export async function setGravity(gravity: Vector2): Promise<void> {
  await fetch(`${API_BASE}/simulation/gravity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(gravity)
  });
}

export async function loadPreset(id: string): Promise<SimulationState> {
  const response = await fetch(`${API_BASE}/simulation/preset/${id}`, { method: 'POST' });
  return response.json();
}

export async function getPresets(): Promise<Preset[]> {
  const response = await fetch(`${API_BASE}/simulation/presets`);
  return response.json();
}

export async function clearSimulation(): Promise<void> {
  await fetch(`${API_BASE}/simulation/clear`, { method: 'POST' });
}

export async function setSimulationSettings(settings: {
  iterations?: number;
  timeStep?: number;
  sleepingThreshold?: number;
}): Promise<void> {
  await fetch(`${API_BASE}/simulation/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  });
}

export async function getProjects(): Promise<ProjectInfo[]> {
  const response = await fetch(`${API_BASE}/projects`);
  return response.json();
}

export async function saveProject(name: string, state: SimulationState): Promise<{ id: string; name: string }> {
  const response = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      bodies: state.bodies,
      joints: state.joints,
      gravity: state.gravity
    })
  });
  return response.json();
}

export async function loadProject(id: string): Promise<SimulationState> {
  const response = await fetch(`${API_BASE}/projects/${id}`);
  return response.json();
}

export async function deleteProject(id: string): Promise<void> {
  await fetch(`${API_BASE}/projects/${id}`, { method: 'DELETE' });
}

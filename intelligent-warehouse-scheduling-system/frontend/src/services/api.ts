import type {
  Floor,
  Rack,
  Location,
  SKU,
  Order,
  Wave,
  Robot,
  Task,
  Exception,
  LogEntry,
} from '../types';

const API_BASE = '/api';

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export const api = {
  getHealth: () => request<{ status: string; timestamp: string }>('/health'),

  getFloors: () => request<Floor[]>('/floors'),
  getFloor: (id: string) => request<Floor>(`/floors/${id}`),
  createFloor: (data: Partial<Floor>) =>
    request<Floor>('/floors', { method: 'POST', body: JSON.stringify(data) }),
  updateFloor: (id: string, data: Partial<Floor>) =>
    request<Floor>(`/floors/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteFloor: (id: string) =>
    request<{ success: boolean }>(`/floors/${id}`, { method: 'DELETE' }),

  getRacks: (floorId?: string) =>
    request<Rack[]>(`/racks${floorId ? `?floorId=${floorId}` : ''}`),
  getRack: (id: string) => request<Rack>(`/racks/${id}`),
  createRack: (data: Partial<Rack>) =>
    request<Rack>('/racks', { method: 'POST', body: JSON.stringify(data) }),
  updateRack: (id: string, data: Partial<Rack>) =>
    request<Rack>(`/racks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRack: (id: string) =>
    request<{ success: boolean }>(`/racks/${id}`, { method: 'DELETE' }),

  getLocations: (rackId?: string) =>
    request<Location[]>(`/locations${rackId ? `?rackId=${rackId}` : ''}`),
  updateLocation: (id: string, data: Partial<Location>) =>
    request<Location>(`/locations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  getSKUs: () => request<SKU[]>('/skus'),
  createSKU: (data: Partial<SKU>) =>
    request<SKU>('/skus', { method: 'POST', body: JSON.stringify(data) }),

  getOrders: (status?: Order['status']) =>
    request<Order[]>(`/orders${status ? `?status=${status}` : ''}`),
  createOrder: (data: Partial<Order>) =>
    request<Order>('/orders', { method: 'POST', body: JSON.stringify(data) }),
  updateOrder: (id: string, data: Partial<Order>) =>
    request<Order>(`/orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  getWaves: () => request<Wave[]>('/waves'),
  generateWaves: () =>
    request<Wave[]>('/waves/generate', { method: 'POST' }),
  updateWave: (id: string, data: Partial<Wave>) =>
    request<Wave>(`/waves/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  getRobots: (floorId?: string) =>
    request<Robot[]>(`/robots${floorId ? `?floorId=${floorId}` : ''}`),
  createRobot: (data: Partial<Robot>) =>
    request<Robot>('/robots', { method: 'POST', body: JSON.stringify(data) }),
  updateRobot: (id: string, data: Partial<Robot>) =>
    request<Robot>(`/robots/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  getTasks: (status?: Task['status'], waveId?: string) => {
    let url = '/tasks';
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (waveId) params.append('waveId', waveId);
    if (params.toString()) url += `?${params.toString()}`;
    return request<Task[]>(url);
  },
  assignTasks: () =>
    request<{ taskId: string; robotId: string }[]>('/tasks/assign', { method: 'POST' }),
  cancelTask: (id: string) =>
    request<Task>(`/tasks/${id}/cancel`, { method: 'PUT' }),
  reassignTask: (id: string, robotId: string) =>
    request<Task>(`/tasks/${id}/reassign`, { method: 'PUT', body: JSON.stringify({ robotId }) }),

  getExceptions: (status?: Exception['status']) =>
    request<Exception[]>(`/exceptions${status ? `?status=${status}` : ''}`),
  updateException: (id: string, data: Partial<Exception>) =>
    request<Exception>(`/exceptions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  getLogs: (limit: number = 100) =>
    request<LogEntry[]>(`/logs?limit=${limit}`),

  startSimulation: () =>
    request<{ success: boolean }>('/simulation/start', { method: 'POST' }),
  stopSimulation: () =>
    request<{ success: boolean }>('/simulation/stop', { method: 'POST' }),
};

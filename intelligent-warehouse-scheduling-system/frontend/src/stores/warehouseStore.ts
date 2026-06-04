import { writable, derived } from 'svelte/store';
import type { Floor, Rack, Location, Robot, Task, Wave, Exception, SKU, Order, LogEntry } from '../types';
import { api } from '../services/api';
import { wsService } from '../services/websocket';

export const floors = writable<Floor[]>([]);
export const racks = writable<Rack[]>([]);
export const locations = writable<Location[]>([]);
export const robots = writable<Robot[]>([]);
export const tasks = writable<Task[]>([]);
export const waves = writable<Wave[]>([]);
export const exceptions = writable<Exception[]>([]);
export const skus = writable<SKU[]>([]);
export const orders = writable<Order[]>([]);
export const logs = writable<LogEntry[]>([]);
export const currentFloorId = writable<string | null>(null);
export const isSimulationRunning = writable(false);
export const loading = writable(false);
export const error = writable<string | null>(null);

export const currentFloor = derived(
  [floors, currentFloorId],
  ([$floors, $currentFloorId]) => {
    return $floors.find((f) => f.id === $currentFloorId) || null;
  }
);

export const currentFloorRacks = derived(
  [racks, currentFloorId],
  ([$racks, $currentFloorId]) => {
    return $racks.filter((r) => r.floorId === $currentFloorId);
  }
);

export const currentFloorRobots = derived(
  [robots, currentFloorId],
  ([$robots, $currentFloorId]) => {
    return $robots.filter((r) => r.floorId === $currentFloorId);
  }
);

export const robotStats = derived(robots, ($robots) => {
  return {
    total: $robots.length,
    idle: $robots.filter((r) => r.status === 'idle').length,
    busy: $robots.filter((r) => r.status === 'busy').length,
    charging: $robots.filter((r) => r.status === 'charging').length,
    error: $robots.filter((r) => r.status === 'error').length,
  };
});

export const taskStats = derived(tasks, ($tasks) => {
  return {
    total: $tasks.length,
    pending: $tasks.filter((t) => t.status === 'pending').length,
    assigned: $tasks.filter((t) => t.status === 'assigned').length,
    inProgress: $tasks.filter((t) => t.status === 'in_progress').length,
    completed: $tasks.filter((t) => t.status === 'completed').length,
  };
});

export async function loadAllData(): Promise<void> {
  loading.set(true);
  error.set(null);

  try {
    const [
      floorsData,
      racksData,
      locationsData,
      robotsData,
      tasksData,
      wavesData,
      exceptionsData,
      skusData,
      ordersData,
      logsData,
    ] = await Promise.all([
      api.getFloors(),
      api.getRacks(),
      api.getLocations(),
      api.getRobots(),
      api.getTasks(),
      api.getWaves(),
      api.getExceptions(),
      api.getSKUs(),
      api.getOrders(),
      api.getLogs(200),
    ]);

    floors.set(floorsData);
    racks.set(racksData);
    locations.set(locationsData);
    robots.set(robotsData);
    tasks.set(tasksData);
    waves.set(wavesData);
    exceptions.set(exceptionsData);
    skus.set(skusData);
    orders.set(ordersData);
    logs.set(logsData);

    if (floorsData.length > 0) {
      currentFloorId.set(floorsData[0].id);
    }
  } catch (err) {
    error.set(err instanceof Error ? err.message : 'Failed to load data');
    console.error('Failed to load data:', err);
  } finally {
    loading.set(false);
  }
}

export function setupWebSocketHandlers(): void {
  wsService.connect();

  wsService.on('robot:update', (data) => {
    robots.update(($robots) => {
      const index = $robots.findIndex((r) => r.id === data.id);
      if (index >= 0) {
        const newRobots = [...$robots];
        newRobots[index] = data;
        return newRobots;
      }
      return [...$robots, data];
    });
  });

  wsService.on('task:update', (data) => {
    tasks.update(($tasks) => {
      const index = $tasks.findIndex((t) => t.id === data.id);
      if (index >= 0) {
        const newTasks = [...$tasks];
        newTasks[index] = data;
        return newTasks;
      }
      return [...$tasks, data];
    });
  });

  wsService.on('wave:update', (data) => {
    waves.update(($waves) => {
      const index = $waves.findIndex((w) => w.id === data.id);
      if (index >= 0) {
        const newWaves = [...$waves];
        newWaves[index] = data;
        return newWaves;
      }
      return [...$waves, data];
    });
  });

  wsService.on('exception:new', (data) => {
    exceptions.update(($exceptions) => [data, ...$exceptions]);
  });

  wsService.on('congestion:alert', (data) => {
    console.log('Congestion alert:', data);
  });

  wsService.on('layout:update', () => {
    api.getRacks().then(racks.set);
  });
}

export function cleanup(): void {
  wsService.disconnect();
}

import { create } from 'zustand';
import * as Comlink from 'comlink';
import type {
  SimulationState,
  Agent,
  Employee,
  Order,
  Queue,
  MapElement,
  Seat,
  SimulationConfig,
  LBMGrid,
  HeatMap,
  AnomalyInfo,
  EventLog,
  DeadlockInfo,
  QuadTreeSnapshot,
  LBMWorkerInterface,
  KDEWorkerInterface,
} from '@/types';
import { DEFAULT_CONFIG } from '@/types';

interface SimulationStore {
  state: SimulationState;
  config: SimulationConfig;
  isConnected: boolean;
  isEditing: boolean;
  selectedTool: string | null;
  selectedElementId: string | null;
  viewMode: 'simulation' | 'flow' | 'heat' | 'quadtree';
  lbmWorker: Comlink.Remote<LBMWorkerInterface> | null;
  kdeWorker: Comlink.Remote<KDEWorkerInterface> | null;
  
  setConnected: (connected: boolean) => void;
  setEditing: (editing: boolean) => void;
  setSelectedTool: (tool: string | null) => void;
  setSelectedElementId: (id: string | null) => void;
  setViewMode: (mode: 'simulation' | 'flow' | 'heat' | 'quadtree') => void;
  setLBMWorker: (worker: Comlink.Remote<LBMWorkerInterface> | null) => void;
  setKDEWorker: (worker: Comlink.Remote<KDEWorkerInterface> | null) => void;
  
  setFullState: (state: Partial<SimulationState>) => void;
  applyDelta: (delta: any) => void;
  updateConfig: (config: Partial<SimulationConfig>) => void;
  
  addMapElement: (element: MapElement) => void;
  removeMapElement: (id: string) => void;
  updateMapElement: (id: string, updates: Partial<MapElement>) => void;
  
  addSeat: (seat: Seat) => void;
  removeSeat: (id: string) => void;
  
  clearMap: () => void;
  
  setFlowField: (flowField: LBMGrid | null) => void;
  setHeatMap: (heatMap: HeatMap | null) => void;
  setQuadTreeSnapshot: (snapshot: QuadTreeSnapshot | null) => void;
}

const initialState: SimulationState = {
  time: 0,
  running: false,
  speed: 1,
  agents: [],
  employees: [],
  orders: [],
  seats: [],
  queues: [],
  mapElements: [],
  flowField: null,
  heatMap: null,
  sirMatrix: null,
  deadlockInfo: {
    detected: false,
    timestamp: 0,
    involvedAgents: [],
    involvedSeats: [],
    waitGraph: [],
    seatUtilization: 0,
  },
  anomalies: [],
  statistics: {
    totalArrivals: 0,
    totalDepartures: 0,
    avgWaitTime: 0,
    avgServiceTime: 0,
    seatUtilization: 0,
    queueLengths: {},
    sirCounts: { S: 0, I: 0, R: 0 },
    quadtreeDepth: 0,
    fps: 0,
  },
  quadtreeSnapshot: null,
};

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  state: initialState,
  config: { ...DEFAULT_CONFIG },
  isConnected: false,
  isEditing: false,
  selectedTool: null,
  selectedElementId: null,
  viewMode: 'simulation',
  lbmWorker: null,
  kdeWorker: null,

  setConnected: (connected) => set({ isConnected: connected }),
  setEditing: (editing) => set({ isEditing: editing, selectedTool: null }),
  setSelectedTool: (tool) => set({ selectedTool: tool, selectedElementId: null }),
  setSelectedElementId: (id) => set({ selectedElementId: id }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setLBMWorker: (worker) => set({ lbmWorker: worker }),
  setKDEWorker: (worker) => set({ kdeWorker: worker }),

  setFullState: (newState) =>
    set((state) => ({
      state: { ...state.state, ...newState },
    })),

  applyDelta: (delta) =>
    set((state) => {
      const newAgents = [...state.state.agents];
      const newEmployees = [...state.state.employees];
      const newOrders = [...state.state.orders];
      const newQueues = [...state.state.queues];

      if (delta.updatedAgents) {
        for (const update of delta.updatedAgents) {
          const idx = newAgents.findIndex((a) => a.id === update.id);
          if (idx >= 0) {
            newAgents[idx] = { ...newAgents[idx], ...update };
          } else if (update.position) {
            newAgents.push(update as Agent);
          }
        }
      }

      if (delta.updatedEmployees) {
        for (const update of delta.updatedEmployees) {
          const idx = newEmployees.findIndex((e) => e.id === update.id);
          if (idx >= 0) {
            newEmployees[idx] = { ...newEmployees[idx], ...update };
          }
        }
      }

      if (delta.updatedOrders) {
        for (const update of delta.updatedOrders) {
          const idx = newOrders.findIndex((o) => o.id === update.id);
          if (idx >= 0) {
            newOrders[idx] = { ...newOrders[idx], ...update };
          } else if (update.status) {
            newOrders.push(update as Order);
          }
        }
      }

      if (delta.updatedQueues) {
        for (const update of delta.updatedQueues) {
          const idx = newQueues.findIndex((q) => q.id === update.id);
          if (idx >= 0) {
            newQueues[idx] = { ...newQueues[idx], ...update };
          }
        }
      }

      const activeAgentIds = new Set(
        delta.updatedAgents?.filter((a: any) => a.state !== 'leaving').map((a: any) => a.id) || []
      );
      const filteredAgents = newAgents.filter(
        (a) => a.state !== 'leaving' || activeAgentIds.has(a.id)
      );

      return {
        state: {
          ...state.state,
          time: delta.time ?? state.state.time,
          agents: filteredAgents,
          employees: newEmployees,
          orders: newOrders,
          queues: newQueues,
          anomalies: delta.anomalies ?? state.state.anomalies,
          statistics: {
            ...state.state.statistics,
            ...delta.statistics,
          },
          deadlockInfo: delta.deadlockInfo ?? state.state.deadlockInfo,
        },
      };
    }),

  updateConfig: (config) =>
    set((state) => ({
      config: { ...state.config, ...config },
    })),

  addMapElement: (element) =>
    set((state) => ({
      state: {
        ...state.state,
        mapElements: [...state.state.mapElements, element],
      },
    })),

  removeMapElement: (id) =>
    set((state) => ({
      state: {
        ...state.state,
        mapElements: state.state.mapElements.filter((e) => e.id !== id),
      },
      selectedElementId: get().selectedElementId === id ? null : get().selectedElementId,
    })),

  updateMapElement: (id, updates) =>
    set((state) => ({
      state: {
        ...state.state,
        mapElements: state.state.mapElements.map((e) =>
          e.id === id ? { ...e, ...updates } : e
        ),
      },
    })),

  addSeat: (seat) =>
    set((state) => ({
      state: {
        ...state.state,
        seats: [...state.state.seats, seat],
      },
    })),

  removeSeat: (id) =>
    set((state) => ({
      state: {
        ...state.state,
        seats: state.state.seats.filter((s) => s.id !== id),
      },
    })),

  clearMap: () =>
    set((state) => ({
      state: {
        ...state.state,
        mapElements: [],
        seats: [],
      },
    })),

  setFlowField: (flowField) =>
    set((state) => ({
      state: { ...state.state, flowField },
    })),

  setHeatMap: (heatMap) =>
    set((state) => ({
      state: { ...state.state, heatMap },
    })),

  setQuadTreeSnapshot: (snapshot) =>
    set((state) => ({
      state: { ...state.state, quadtreeSnapshot: snapshot },
    })),
}));

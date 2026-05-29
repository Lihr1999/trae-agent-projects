import { Agent, Employee, Order, Seat, Queue, QueuingTopology } from '../types';

export class QueueNetwork {
  private orderQueue: Queue;
  private pickupQueue: Queue;
  private roamingQueue: Queue;
  private topology: QueuingTopology;

  constructor(topology: QueuingTopology) {
    this.topology = topology;
    this.orderQueue = {
      id: 'order-queue',
      name: '点单队列',
      type: 'order',
      agents: [],
      capacity: topology.orderQueue.capacity,
      servers: topology.orderQueue.servers,
      servingAgents: [],
    };
    this.pickupQueue = {
      id: 'pickup-queue',
      name: '取餐队列',
      type: 'pickup',
      agents: [],
      capacity: topology.pickupQueue.capacity,
      servers: topology.pickupQueue.servers,
      servingAgents: [],
    };
    this.roamingQueue = {
      id: 'roaming-queue',
      name: '寻座游走队列',
      type: 'roaming',
      agents: [],
      capacity: topology.roamingQueue.capacity,
      servers: 0,
      servingAgents: [],
    };
  }

  enqueue(queueType: 'order' | 'pickup' | 'roaming', agentId: string): boolean {
    const queue = this.getQueue(queueType);
    if (queue.agents.length >= queue.capacity) {
      return false;
    }
    if (!queue.agents.includes(agentId)) {
      queue.agents.push(agentId);
    }
    return true;
  }

  dequeue(queueType: 'order' | 'pickup' | 'roaming', agentId: string): boolean {
    const queue = this.getQueue(queueType);
    const index = queue.agents.indexOf(agentId);
    if (index !== -1) {
      queue.agents.splice(index, 1);
      return true;
    }
    const servingIndex = queue.servingAgents.indexOf(agentId);
    if (servingIndex !== -1) {
      queue.servingAgents.splice(servingIndex, 1);
      return true;
    }
    return false;
  }

  getQueue(queueType: 'order' | 'pickup' | 'roaming'): Queue {
    switch (queueType) {
      case 'order':
        return this.orderQueue;
      case 'pickup':
        return this.pickupQueue;
      case 'roaming':
        return this.roamingQueue;
    }
  }

  getAllQueues(): Queue[] {
    return [this.orderQueue, this.pickupQueue, this.roamingQueue];
  }

  assignServer(queueType: 'order' | 'pickup', employees: Employee[]): Employee | null {
    const queue = this.getQueue(queueType);
    if (queue.servingAgents.length >= queue.servers) {
      return null;
    }
    const availableEmployee = employees.find(
      (emp) => !emp.currentOrder && emp.fatigue < 0.9
    );
    if (availableEmployee && queue.agents.length > 0) {
      const nextAgentId = queue.agents.shift()!;
      queue.servingAgents.push(nextAgentId);
      return availableEmployee;
    }
    return null;
  }

  releaseServer(queueType: 'order' | 'pickup', agentId: string): boolean {
    const queue = this.getQueue(queueType);
    const index = queue.servingAgents.indexOf(agentId);
    if (index !== -1) {
      queue.servingAgents.splice(index, 1);
      return true;
    }
    return false;
  }

  getQueueLength(queueType: 'order' | 'pickup' | 'roaming'): number {
    return this.getQueue(queueType).agents.length;
  }

  getServingCount(queueType: 'order' | 'pickup'): number {
    return this.getQueue(queueType).servingAgents.length;
  }

  getQueueStats(): Record<string, { waiting: number; serving: number; capacity: number; utilization: number }> {
    const queues = this.getAllQueues();
    const stats: Record<string, { waiting: number; serving: number; capacity: number; utilization: number }> = {};
    
    for (const queue of queues) {
      const total = queue.agents.length + queue.servingAgents.length;
      const utilization = queue.capacity > 0 ? total / queue.capacity : 0;
      stats[queue.id] = {
        waiting: queue.agents.length,
        serving: queue.servingAgents.length,
        capacity: queue.capacity,
        utilization,
      };
    }
    return stats;
  }

  isQueueFull(queueType: 'order' | 'pickup' | 'roaming'): boolean {
    const queue = this.getQueue(queueType);
    return queue.agents.length + queue.servingAgents.length >= queue.capacity;
  }

  getNextAgent(queueType: 'order' | 'pickup' | 'roaming'): string | null {
    const queue = this.getQueue(queueType);
    return queue.agents.length > 0 ? queue.agents[0] : null;
  }

  updateTopology(topology: QueuingTopology): void {
    this.topology = topology;
    this.orderQueue.servers = topology.orderQueue.servers;
    this.orderQueue.capacity = topology.orderQueue.capacity;
    this.pickupQueue.servers = topology.pickupQueue.servers;
    this.pickupQueue.capacity = topology.pickupQueue.capacity;
    this.roamingQueue.capacity = topology.roamingQueue.capacity;
  }

  getAgentQueue(agentId: string): 'order' | 'pickup' | 'roaming' | null {
    if (this.orderQueue.agents.includes(agentId) || this.orderQueue.servingAgents.includes(agentId)) {
      return 'order';
    }
    if (this.pickupQueue.agents.includes(agentId) || this.pickupQueue.servingAgents.includes(agentId)) {
      return 'pickup';
    }
    if (this.roamingQueue.agents.includes(agentId)) {
      return 'roaming';
    }
    return null;
  }

  moveAgent(fromQueue: 'order' | 'pickup' | 'roaming', toQueue: 'order' | 'pickup' | 'roaming', agentId: string): boolean {
    if (this.dequeue(fromQueue, agentId)) {
      return this.enqueue(toQueue, agentId);
    }
    return false;
  }

  clear(): void {
    this.orderQueue.agents = [];
    this.orderQueue.servingAgents = [];
    this.pickupQueue.agents = [];
    this.pickupQueue.servingAgents = [];
    this.roamingQueue.agents = [];
    this.roamingQueue.servingAgents = [];
  }
}

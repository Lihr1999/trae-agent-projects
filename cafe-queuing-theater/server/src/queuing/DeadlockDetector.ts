import { Agent, Seat, DeadlockInfo } from '../types';

interface WaitEdge {
  from: string;
  to: string;
  type: 'seat-wait' | 'group-wait' | 'resource-wait';
}

export class DeadlockDetector {
  private waitGraph: Map<string, string[]> = new Map();
  private edges: WaitEdge[] = [];
  private lastDetectionTime: number = 0;
  private detectionThreshold: number = 5000;

  constructor(detectionThreshold: number = 5000) {
    this.detectionThreshold = detectionThreshold;
  }

  detectDeadlock(agents: Agent[], seats: Seat[], currentTime: number): DeadlockInfo {
    if (currentTime - this.lastDetectionTime < this.detectionThreshold) {
      return {
        detected: false,
        timestamp: currentTime,
        involvedAgents: [],
        involvedSeats: [],
        waitGraph: [],
        seatUtilization: this.calculateSeatUtilization(seats),
      };
    }

    this.lastDetectionTime = currentTime;
    this.buildWaitGraph(agents, seats);

    const cycles = this.findCycles();
    const seatUtilization = this.calculateSeatUtilization(seats);
    const asymmetricGroups = this.detectAsymmetricGroupArrival(agents, seats);
    const zeroUtilization = seatUtilization === 0 && agents.length > 0;

    const involvedAgents = new Set<string>();
    const involvedSeats = new Set<string>();

    for (const cycle of cycles) {
      for (const node of cycle) {
        if (node.startsWith('agent:')) {
          involvedAgents.add(node.replace('agent:', ''));
        } else if (node.startsWith('seat:')) {
          involvedSeats.add(node.replace('seat:', ''));
        }
      }
    }

    for (const group of asymmetricGroups) {
      group.forEach((agentId) => involvedAgents.add(agentId));
    }

    const detected = cycles.length > 0 || asymmetricGroups.length > 0 || zeroUtilization;

    const waitGraphEdges = this.edges.map((e) => ({
      from: e.from,
      to: e.to,
    }));

    if (detected) {
      this.distributedDeadlockDetection(agents, seats, involvedAgents, involvedSeats);
    }

    return {
      detected,
      timestamp: currentTime,
      involvedAgents: Array.from(involvedAgents),
      involvedSeats: Array.from(involvedSeats),
      waitGraph: waitGraphEdges,
      seatUtilization,
    };
  }

  private buildWaitGraph(agents: Agent[], seats: Seat[]): void {
    this.waitGraph.clear();
    this.edges = [];

    const roamingAgents = agents.filter((a) => a.state === 'roaming' || a.state === 'seating');

    for (const agent of roamingAgents) {
      const agentNode = `agent:${agent.id}`;
      this.ensureNode(agentNode);

      if (agent.groupId) {
        const groupMembers = agents.filter(
          (a) => a.groupId === agent.groupId && a.id !== agent.id
        );
        for (const member of groupMembers) {
          if (member.seatId && !agent.seatId) {
            const memberNode = `agent:${member.id}`;
            this.addEdge(agentNode, memberNode, 'group-wait');
          }
        }
      }

      if (!agent.seatId) {
        const groupSize = agent.groupId
          ? agents.filter((a) => a.groupId === agent.groupId).length
          : agent.size || 1;

        for (const seat of seats) {
          const seatNode = `seat:${seat.id}`;
          this.ensureNode(seatNode);

          const availableCapacity = seat.capacity - seat.occupied;
          if (availableCapacity >= groupSize && !seat.reserved) {
            this.addEdge(agentNode, seatNode, 'seat-wait');
          }

          if (seat.groupId && seat.groupId !== agent.groupId) {
            const occupyingAgents = agents.filter((a) => a.seatId === seat.id);
            for (const occupant of occupyingAgents) {
              const occupantNode = `agent:${occupant.id}`;
              this.ensureNode(occupantNode);
              this.addEdge(agentNode, occupantNode, 'resource-wait');
            }
          }
        }
      }
    }

    for (const seat of seats) {
      const seatNode = `seat:${seat.id}`;
      this.ensureNode(seatNode);

      if (seat.occupied > 0 && seat.groupId) {
        const occupyingAgents = agents.filter((a) => a.seatId === seat.id);
        for (const occupant of occupyingAgents) {
          const occupantNode = `agent:${occupant.id}`;
          this.addEdge(seatNode, occupantNode, 'resource-wait');
        }
      }
    }
  }

  private ensureNode(node: string): void {
    if (!this.waitGraph.has(node)) {
      this.waitGraph.set(node, []);
    }
  }

  private addEdge(from: string, to: string, type: WaitEdge['type']): void {
    const neighbors = this.waitGraph.get(from)!;
    if (!neighbors.includes(to)) {
      neighbors.push(to);
    }
    if (!this.edges.some((e) => e.from === from && e.to === to)) {
      this.edges.push({ from, to, type });
    }
  }

  private findCycles(): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const path: string[] = [];

    const dfs = (node: string): boolean => {
      visited.add(node);
      recStack.add(node);
      path.push(node);

      const neighbors = this.waitGraph.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) {
            return true;
          }
        } else if (recStack.has(neighbor)) {
          const cycleStart = path.indexOf(neighbor);
          if (cycleStart !== -1) {
            const cycle = path.slice(cycleStart);
            if (cycle.length >= 2) {
              cycles.push([...cycle]);
            }
            return true;
          }
        }
      }

      path.pop();
      recStack.delete(node);
      return false;
    };

    for (const node of this.waitGraph.keys()) {
      if (!visited.has(node)) {
        dfs(node);
      }
    }

    return cycles;
  }

  private detectAsymmetricGroupArrival(agents: Agent[], seats: Seat[]): string[][] {
    const groups: Map<string, Agent[]> = new Map();

    for (const agent of agents) {
      if (agent.groupId) {
        if (!groups.has(agent.groupId)) {
          groups.set(agent.groupId, []);
        }
        groups.get(agent.groupId)!.push(agent);
      }
    }

    const asymmetricGroups: string[][] = [];

    for (const [groupId, groupAgents] of groups) {
      if (groupAgents.length < 2) continue;

      const seatedCount = groupAgents.filter((a) => a.seatId).length;
      const waitingCount = groupAgents.filter(
        (a) => a.state === 'roaming' || a.state === 'seating'
      ).length;

      if (seatedCount > 0 && waitingCount > 0 && seatedCount < groupAgents.length) {
        const groupSize = groupAgents.length;
        const suitableSeats = seats.filter(
          (s) => s.capacity - s.occupied >= groupSize && !s.reserved
        );

        if (suitableSeats.length === 0) {
          asymmetricGroups.push(groupAgents.map((a) => a.id));
        }
      }
    }

    return asymmetricGroups;
  }

  private distributedDeadlockDetection(
    agents: Agent[],
    seats: Seat[],
    involvedAgents: Set<string>,
    involvedSeats: Set<string>
  ): void {
    const waitingAgents = agents.filter(
      (a) => involvedAgents.has(a.id) && !a.seatId
    );

    for (const agent of waitingAgents) {
      const groupSize = agent.groupId
        ? agents.filter((a) => a.groupId === agent.groupId).length
        : agent.size || 1;

      for (const seat of seats) {
        if (involvedSeats.has(seat.id)) {
          const occupyingAgents = agents.filter((a) => a.seatId === seat.id);
          for (const occupant of occupyingAgents) {
            if (
              occupant.groupId &&
              agent.groupId &&
              occupant.groupId !== agent.groupId
            ) {
              const occupantGroupSize = agents.filter(
                (a) => a.groupId === occupant.groupId
              ).length;
              const otherGroupWaiting = agents.some(
                (a) =>
                  a.groupId === occupant.groupId &&
                  !a.seatId &&
                  (a.state === 'roaming' || a.state === 'seating')
              );

              if (otherGroupWaiting && occupantGroupSize > 0) {
                const otherSuitableSeats = seats.filter(
                  (s) =>
                    s.id !== seat.id &&
                    s.capacity - s.occupied >= occupantGroupSize &&
                    !s.reserved
                );

                if (otherSuitableSeats.length === 0) {
                  involvedAgents.add(occupant.id);
                }
              }
            }
          }
        }
      }
    }
  }

  private calculateSeatUtilization(seats: Seat[]): number {
    if (seats.length === 0) return 0;

    const totalCapacity = seats.reduce((sum, seat) => sum + seat.capacity, 0);
    const totalOccupied = seats.reduce((sum, seat) => sum + seat.occupied, 0);

    return totalCapacity > 0 ? totalOccupied / totalCapacity : 0;
  }

  getRecoverySuggestions(deadlockInfo: DeadlockInfo, agents: Agent[], seats: Seat[]): string[] {
    const suggestions: string[] = [];

    if (!deadlockInfo.detected) {
      return suggestions;
    }

    if (deadlockInfo.seatUtilization === 0 && agents.length > 0) {
      suggestions.push('座位利用率为零，所有顾客都在等待座位。建议检查座位分配逻辑是否正常工作。');
    }

    if (deadlockInfo.involvedSeats.length > 0) {
      suggestions.push(
        `检测到 ${deadlockInfo.involvedSeats.length} 个座位涉及死锁。考虑允许拼桌或增加临时座位。`
      );
    }

    if (deadlockInfo.involvedAgents.length > 0) {
      const groupIds = new Set<string>();
      for (const agentId of deadlockInfo.involvedAgents) {
        const agent = agents.find((a) => a.id === agentId);
        if (agent?.groupId) {
          groupIds.add(agent.groupId);
        }
      }
      if (groupIds.size > 1) {
        suggestions.push(
          `多个群组(${groupIds.size}个)存在循环等待。建议实施超时抢占机制，强制释放长时间占用的座位。`
        );
      }
    }

    const asymmetricGroups = this.detectAsymmetricGroupArrival(agents, seats);
    if (asymmetricGroups.length > 0) {
      suggestions.push(
        `检测到 ${asymmetricGroups.length} 个不对称群组到达（部分成员已就座，部分仍在等待）。建议群组整体分配座位。`
      );
    }

    if (deadlockInfo.waitGraph.length > 10) {
      suggestions.push('等待图过于复杂。建议限制同时寻座的顾客数量或设置等待超时。');
    }

    const largeGroups = agents.filter(
      (a) => (a.size || 1) > 2 && !a.seatId && (a.state === 'roaming' || a.state === 'seating')
    );
    if (largeGroups.length > 0) {
      suggestions.push(
        `有 ${largeGroups.length} 个大型团体(>2人)在等待座位。考虑为大型团体预留专用区域。`
      );
    }

    return suggestions;
  }

  getWaitGraph(): { from: string; to: string; type: string }[] {
    return this.edges.map((e) => ({
      from: e.from,
      to: e.to,
      type: e.type,
    }));
  }

  reset(): void {
    this.waitGraph.clear();
    this.edges = [];
    this.lastDetectionTime = 0;
  }
}

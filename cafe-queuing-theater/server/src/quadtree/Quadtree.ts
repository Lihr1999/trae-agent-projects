import { Point, Agent, QuadTreeSnapshot } from '../types';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Quadrant {
  nw: QuadtreeNode | null;
  ne: QuadtreeNode | null;
  sw: QuadtreeNode | null;
  se: QuadtreeNode | null;
}

interface QuadtreeNode {
  boundary: Rect;
  depth: number;
  agents: Map<string, Agent>;
  children: Quadrant;
  parent: QuadtreeNode | null;
}

interface NeighborCandidate {
  agent: Agent;
  distance: number;
}

export class Quadtree {
  private root: QuadtreeNode;
  private maxCapacity: number;
  private maxDepth: number;
  private agentLocationMap: Map<string, QuadtreeNode>;
  private anomalies: Array<{ type: string; timestamp: number; description: string; data: Record<string, any> }>;

  constructor(
    boundary: Rect,
    maxCapacity: number = 10,
    maxDepth: number = 8
  ) {
    this.maxCapacity = maxCapacity;
    this.maxDepth = maxDepth;
    this.agentLocationMap = new Map();
    this.anomalies = [];
    this.root = this.createNode(boundary, 0, null);
  }

  private createNode(boundary: Rect, depth: number, parent: QuadtreeNode | null): QuadtreeNode {
    return {
      boundary: { ...boundary },
      depth,
      agents: new Map(),
      children: { nw: null, ne: null, sw: null, se: null },
      parent,
    };
  }

  private containsPoint(boundary: Rect, point: Point): boolean {
    return (
      point.x >= boundary.x &&
      point.x < boundary.x + boundary.width &&
      point.y >= boundary.y &&
      point.y < boundary.y + boundary.height
    );
  }

  private intersectsRect(a: Rect, b: Rect): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  private intersectsCircle(boundary: Rect, center: Point, radius: number): boolean {
    const closestX = Math.max(boundary.x, Math.min(center.x, boundary.x + boundary.width));
    const closestY = Math.max(boundary.y, Math.min(center.y, boundary.y + boundary.height));
    const dx = center.x - closestX;
    const dy = center.y - closestY;
    return dx * dx + dy * dy <= radius * radius;
  }

  private distance(a: Point, b: Point): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private subdivide(node: QuadtreeNode): void {
    const { x, y, width, height } = node.boundary;
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const newDepth = node.depth + 1;

    node.children.nw = this.createNode(
      { x, y, width: halfWidth, height: halfHeight },
      newDepth,
      node
    );
    node.children.ne = this.createNode(
      { x: x + halfWidth, y, width: halfWidth, height: halfHeight },
      newDepth,
      node
    );
    node.children.sw = this.createNode(
      { x, y: y + halfHeight, width: halfWidth, height: halfHeight },
      newDepth,
      node
    );
    node.children.se = this.createNode(
      { x: x + halfWidth, y: y + halfHeight, width: halfWidth, height: halfHeight },
      newDepth,
      node
    );

    for (const [id, agent] of node.agents) {
      this.insertIntoChild(node, agent);
    }
    node.agents.clear();
  }

  private insertIntoChild(node: QuadtreeNode, agent: Agent): boolean {
    const { x, y, width, height } = node.boundary;
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const midX = x + halfWidth;
    const midY = y + halfHeight;

    let target: QuadtreeNode | null = null;

    if (agent.position.x < midX) {
      if (agent.position.y < midY) {
        target = node.children.nw;
      } else {
        target = node.children.sw;
      }
    } else {
      if (agent.position.y < midY) {
        target = node.children.ne;
      } else {
        target = node.children.se;
      }
    }

    if (target) {
      return this.insertRecursive(target, agent);
    }
    return false;
  }

  private insertRecursive(node: QuadtreeNode, agent: Agent): boolean {
    if (!this.containsPoint(node.boundary, agent.position)) {
      return false;
    }

    if (node.agents.size < this.maxCapacity || node.depth >= this.maxDepth) {
      node.agents.set(agent.id, agent);
      this.agentLocationMap.set(agent.id, node);

      if (node.depth >= this.maxDepth && node.agents.size > this.maxCapacity * 2) {
        this.detectDepthImbalance(node);
      }

      return true;
    }

    if (node.children.nw === null) {
      this.subdivide(node);
    }

    return this.insertIntoChild(node, agent);
  }

  public insert(agent: Agent): boolean {
    return this.insertRecursive(this.root, agent);
  }

  private removeFromNode(node: QuadtreeNode, agentId: string): boolean {
    if (node.agents.delete(agentId)) {
      this.agentLocationMap.delete(agentId);
      this.tryMerge(node);
      return true;
    }

    const quadrants: Array<QuadtreeNode | null> = [
      node.children.nw,
      node.children.ne,
      node.children.sw,
      node.children.se,
    ];

    for (const child of quadrants) {
      if (child && this.removeFromNode(child, agentId)) {
        return true;
      }
    }

    return false;
  }

  public remove(agentId: string): boolean {
    const node = this.agentLocationMap.get(agentId);
    if (node) {
      if (node.agents.delete(agentId)) {
        this.agentLocationMap.delete(agentId);
        this.tryMerge(node);
        return true;
      }
    }
    return this.removeFromNode(this.root, agentId);
  }

  public update(agent: Agent): boolean {
    const currentNode = this.agentLocationMap.get(agent.id);

    if (currentNode && this.containsPoint(currentNode.boundary, agent.position)) {
      currentNode.agents.set(agent.id, agent);
      return true;
    }

    this.remove(agent.id);
    return this.insert(agent);
  }

  private tryMerge(node: QuadtreeNode): void {
    if (node.depth === 0) return;

    let totalAgents = node.agents.size;
    const quadrants: Array<QuadtreeNode | null> = [
      node.children.nw,
      node.children.ne,
      node.children.sw,
      node.children.se,
    ];

    for (const child of quadrants) {
      if (!child) return;
      if (child.children.nw !== null) return;
      totalAgents += child.agents.size;
    }

    if (totalAgents <= this.maxCapacity) {
      for (const child of quadrants) {
        if (child) {
          for (const [id, agent] of child.agents) {
            node.agents.set(id, agent);
            this.agentLocationMap.set(id, node);
          }
          child.agents.clear();
        }
      }
      node.children.nw = null;
      node.children.ne = null;
      node.children.sw = null;
      node.children.se = null;

      if (node.parent) {
        this.tryMerge(node.parent);
      }
    }
  }

  private detectDepthImbalance(node: QuadtreeNode): void {
    const leafCount = this.countLeaves(this.root);
    const totalAgents = this.agentLocationMap.size;
    const avgDepth = this.calculateAverageDepth();

    if (node.depth >= this.maxDepth && avgDepth > this.maxDepth * 0.8) {
      this.anomalies.push({
        type: 'quadtree_depth_imbalance',
        timestamp: Date.now(),
        description: '四叉树深度失衡，极端拥挤节点导致性能退化',
        data: {
          maxDepthReached: node.depth,
          totalAgents,
          leafCount,
          averageDepth: avgDepth,
          threshold: this.maxDepth * 0.8,
          severity: totalAgents > 100 ? 'critical' : totalAgents > 50 ? 'high' : 'medium',
        },
      });
    }
  }

  private countLeaves(node: QuadtreeNode): number {
    if (node.children.nw === null) {
      return node.agents.size > 0 ? 1 : 0;
    }

    let count = 0;
    const quadrants: Array<QuadtreeNode | null> = [
      node.children.nw,
      node.children.ne,
      node.children.sw,
      node.children.se,
    ];

    for (const child of quadrants) {
      if (child) {
        count += this.countLeaves(child);
      }
    }

    return count;
  }

  private calculateAverageDepth(): number {
    let totalDepth = 0;
    let agentCount = 0;

    const traverse = (node: QuadtreeNode) => {
      if (node.agents.size > 0) {
        totalDepth += node.depth * node.agents.size;
        agentCount += node.agents.size;
      }

      const quadrants: Array<QuadtreeNode | null> = [
        node.children.nw,
        node.children.ne,
        node.children.sw,
        node.children.se,
      ];

      for (const child of quadrants) {
        if (child) {
          traverse(child);
        }
      }
    };

    traverse(this.root);
    return agentCount > 0 ? totalDepth / agentCount : 0;
  }

  public queryRange(range: Rect): Agent[] {
    const results: Agent[] = [];
    this.queryRangeRecursive(this.root, range, results);
    return results;
  }

  private queryRangeRecursive(node: QuadtreeNode, range: Rect, results: Agent[]): void {
    if (!this.intersectsRect(node.boundary, range)) {
      return;
    }

    for (const agent of node.agents.values()) {
      if (this.containsPoint(range, agent.position)) {
        results.push(agent);
      }
    }

    if (node.children.nw !== null) {
      const quadrants: Array<QuadtreeNode | null> = [
        node.children.nw,
        node.children.ne,
        node.children.sw,
        node.children.se,
      ];

      for (const child of quadrants) {
        if (child) {
          this.queryRangeRecursive(child, range, results);
        }
      }
    }
  }

  public queryRadius(center: Point, radius: number): Agent[] {
    const results: Agent[] = [];
    this.queryRadiusRecursive(this.root, center, radius, results);
    return results;
  }

  private queryRadiusRecursive(
    node: QuadtreeNode,
    center: Point,
    radius: number,
    results: Agent[]
  ): void {
    if (!this.intersectsCircle(node.boundary, center, radius)) {
      return;
    }

    const radiusSq = radius * radius;
    for (const agent of node.agents.values()) {
      const dx = agent.position.x - center.x;
      const dy = agent.position.y - center.y;
      if (dx * dx + dy * dy <= radiusSq) {
        results.push(agent);
      }
    }

    if (node.children.nw !== null) {
      const quadrants: Array<QuadtreeNode | null> = [
        node.children.nw,
        node.children.ne,
        node.children.sw,
        node.children.se,
      ];

      for (const child of quadrants) {
        if (child) {
          this.queryRadiusRecursive(child, center, radius, results);
        }
      }
    }
  }

  public getNeighbors(
    center: Point,
    k: number,
    maxRadius?: number
  ): Agent[] {
    const candidates: NeighborCandidate[] = [];
    const searchRadius = maxRadius ?? Math.max(this.root.boundary.width, this.root.boundary.height);

    this.collectNeighborCandidates(this.root, center, searchRadius, candidates);

    candidates.sort((a, b) => a.distance - b.distance);

    return candidates
      .slice(0, k)
      .map(c => c.agent);
  }

  private collectNeighborCandidates(
    node: QuadtreeNode,
    center: Point,
    maxRadius: number,
    candidates: NeighborCandidate[]
  ): void {
    if (!this.intersectsCircle(node.boundary, center, maxRadius)) {
      return;
    }

    const radiusSq = maxRadius * maxRadius;
    for (const agent of node.agents.values()) {
      const dx = agent.position.x - center.x;
      const dy = agent.position.y - center.y;
      const distSq = dx * dx + dy * dy;
      if (distSq <= radiusSq) {
        candidates.push({
          agent,
          distance: Math.sqrt(distSq),
        });
      }
    }

    if (node.children.nw !== null) {
      const quadrants = this.sortQuadrantsByDistance(node, center);
      for (const child of quadrants) {
        if (child) {
          this.collectNeighborCandidates(child, center, maxRadius, candidates);
        }
      }
    }
  }

  private sortQuadrantsByDistance(
    node: QuadtreeNode,
    center: Point
  ): Array<QuadtreeNode | null> {
    const quadrants: Array<{ node: QuadtreeNode | null; dist: number }> = [];
    const quadrantKeys: Array<keyof Quadrant> = ['nw', 'ne', 'sw', 'se'];

    for (const key of quadrantKeys) {
      const child = node.children[key];
      if (child) {
        const centerX = child.boundary.x + child.boundary.width / 2;
        const centerY = child.boundary.y + child.boundary.height / 2;
        const dx = centerX - center.x;
        const dy = centerY - center.y;
        quadrants.push({
          node: child,
          dist: dx * dx + dy * dy,
        });
      }
    }

    quadrants.sort((a, b) => a.dist - b.dist);
    return quadrants.map(q => q.node);
  }

  public clear(): void {
    this.root = this.createNode(this.root.boundary, 0, null);
    this.agentLocationMap.clear();
    this.anomalies = [];
  }

  public getSnapshot(): QuadTreeSnapshot {
    const nodes: QuadTreeSnapshot['nodes'] = [];
    const depthDistribution: number[] = [];

    const traverse = (node: QuadtreeNode) => {
      nodes.push({
        boundary: { ...node.boundary },
        depth: node.depth,
        agentCount: node.agents.size,
      });

      if (depthDistribution[node.depth] === undefined) {
        depthDistribution[node.depth] = 0;
      }
      depthDistribution[node.depth] += node.agents.size;

      const quadrants: Array<QuadtreeNode | null> = [
        node.children.nw,
        node.children.ne,
        node.children.sw,
        node.children.se,
      ];

      for (const child of quadrants) {
        if (child) {
          traverse(child);
        }
      }
    };

    traverse(this.root);

    return {
      timestamp: Date.now(),
      nodes,
      depthDistribution,
      maxDepth: Math.max(0, ...nodes.map(n => n.depth)),
    };
  }

  public getDepthDistribution(): number[] {
    const distribution: number[] = [];

    const traverse = (node: QuadtreeNode) => {
      if (distribution[node.depth] === undefined) {
        distribution[node.depth] = 0;
      }
      distribution[node.depth] += node.agents.size;

      const quadrants: Array<QuadtreeNode | null> = [
        node.children.nw,
        node.children.ne,
        node.children.sw,
        node.children.se,
      ];

      for (const child of quadrants) {
        if (child) {
          traverse(child);
        }
      }
    };

    traverse(this.root);

    for (let i = 0; i < distribution.length; i++) {
      if (distribution[i] === undefined) {
        distribution[i] = 0;
      }
    }

    return distribution;
  }

  public getAnomalies(): Array<{ type: string; timestamp: number; description: string; data: Record<string, any> }> {
    return [...this.anomalies];
  }

  public getAgentCount(): number {
    return this.agentLocationMap.size;
  }

  public hasAgent(agentId: string): boolean {
    return this.agentLocationMap.has(agentId);
  }
}

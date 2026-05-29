import { Agent, SIRParams, SIRMatrix, HeatMap, Point } from '../types';

export class SIREpidemic {
  private params: SIRParams;

  constructor(params: SIRParams) {
    this.params = params;
  }

  public updateParams(params: Partial<SIRParams>): void {
    this.params = { ...this.params, ...params };
  }

  public buildAdjacencyMatrix(agents: Agent[], radius: number): SIRMatrix {
    const n = agents.length;
    const adjacency: boolean[][] = Array(n).fill(null).map(() => Array(n).fill(false));
    const agentIds: string[] = agents.map(a => a.id);

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dist = this.euclideanDistance(agents[i].position, agents[j].position);
        if (dist <= radius) {
          adjacency[i][j] = true;
          adjacency[j][i] = true;
        }
      }
    }

    return { adjacency, agentIds };
  }

  public step(agents: Agent[], dt: number): void {
    const matrix = this.buildAdjacencyMatrix(agents, this.params.infectionRadius);
    const n = agents.length;

    const newEmotions = agents.map(a => a.emotion);
    const newFrustrations = agents.map(a => a.frustration);

    for (let i = 0; i < n; i++) {
      const agent = agents[i];
      const currentEmotion = agent.emotion;

      if (currentEmotion === 'S') {
        const infectedNeighbors = this.countInfectedNeighbors(i, matrix, agents);
        const infectionProbability = 1 - Math.pow(1 - this.params.beta * dt, infectedNeighbors);
        const frustrationFactor = 1 + agent.frustration;

        if (Math.random() < infectionProbability * frustrationFactor) {
          newEmotions[i] = 'I';
          newFrustrations[i] = Math.min(1, agent.frustration + 0.2);
        }
      } else if (currentEmotion === 'I') {
        if (Math.random() < this.params.gamma * dt) {
          const shouldLeave = this.shouldLeave(agent);
          if (shouldLeave) {
            newEmotions[i] = 'R';
          } else {
            newEmotions[i] = 'S';
            newFrustrations[i] = Math.max(0, agent.frustration - 0.1);
          }
        } else {
          newFrustrations[i] = Math.min(1, agent.frustration + 0.01);
        }
      }
    }

    for (let i = 0; i < n; i++) {
      agents[i].emotion = newEmotions[i];
      agents[i].frustration = newFrustrations[i];

      if (agents[i].emotion === 'R') {
        agents[i].state = 'leaving';
      }
    }
  }

  public generateHeatMap(
    agents: Agent[],
    width: number,
    height: number,
    resolution: number
  ): HeatMap {
    const cols = Math.ceil(width / resolution);
    const rows = Math.ceil(height / resolution);
    const values: number[][] = Array(rows).fill(null).map(() => Array(cols).fill(0));
    const bandwidth = resolution * 2;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const gridX = col * resolution + resolution / 2;
        const gridY = row * resolution + resolution / 2;
        let density = 0;

        for (const agent of agents) {
          if (agent.emotion === 'I') {
            const dist = this.euclideanDistance({ x: gridX, y: gridY }, agent.position);
            density += this.gaussianKernel(dist, bandwidth);
          }
        }

        values[row][col] = density;
      }
    }

    const maxVal = Math.max(...values.flat(), 1e-6);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        values[row][col] /= maxVal;
      }
    }

    return {
      resolution,
      values,
      timestamp: Date.now()
    };
  }

  public detectAvalanche(agents: Agent[]): boolean {
    const n = agents.length;
    if (n === 0) return false;

    const sCount = agents.filter(a => a.emotion === 'S').length;
    const iCount = agents.filter(a => a.emotion === 'I').length;

    const sRatio = sCount / n;
    const iRatio = iCount / n;

    if (iRatio > 0.5 && sRatio > 0.3) {
      const matrix = this.buildAdjacencyMatrix(agents, this.params.infectionRadius);
      const avgConnections = this.averageConnections(matrix);

      if (avgConnections > 3 && iRatio > 0.6) {
        return true;
      }

      const chainReactionScore = this.calculateChainReactionScore(agents, matrix);
      if (chainReactionScore > 0.7) {
        return true;
      }
    }

    return false;
  }

  private euclideanDistance(p1: Point, p2: Point): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private gaussianKernel(distance: number, bandwidth: number): number {
    const sigma = bandwidth / 2;
    const exponent = -(distance * distance) / (2 * sigma * sigma);
    return Math.exp(exponent) / (Math.sqrt(2 * Math.PI) * sigma);
  }

  private countInfectedNeighbors(
    index: number,
    matrix: SIRMatrix,
    agents: Agent[]
  ): number {
    let count = 0;
    for (let j = 0; j < agents.length; j++) {
      if (matrix.adjacency[index][j] && agents[j].emotion === 'I') {
        count++;
      }
    }
    return count;
  }

  private shouldLeave(agent: Agent): boolean {
    return agent.frustration >= this.params.frustrationThreshold;
  }

  private averageConnections(matrix: SIRMatrix): number {
    const n = matrix.adjacency.length;
    if (n === 0) return 0;
    let total = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (matrix.adjacency[i][j]) total++;
      }
    }
    return total / n;
  }

  private calculateChainReactionScore(agents: Agent[], matrix: SIRMatrix): number {
    const n = agents.length;
    let highRiskCount = 0;

    for (let i = 0; i < n; i++) {
      if (agents[i].emotion === 'S') {
        const infectedNeighbors = this.countInfectedNeighbors(i, matrix, agents);
        const frustration = agents[i].frustration;
        const avgConn = this.averageConnections(matrix);
        const risk = (infectedNeighbors / Math.max(1, avgConn)) * (1 + frustration);
        if (risk > 0.8) {
          highRiskCount++;
        }
      }
    }

    const sCount = agents.filter(a => a.emotion === 'S').length;
    return sCount > 0 ? highRiskCount / sCount : 0;
  }
}

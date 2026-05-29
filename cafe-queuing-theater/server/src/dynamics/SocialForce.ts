import { Point, Vector, Agent, SocialForceParams, MapElement } from '../types';

export class SocialForce {
  private params: SocialForceParams;
  private positionHistory: Map<string, Point[]> = new Map();
  private jitterThreshold: number = 0.01;
  private historyWindow: number = 10;

  constructor(params: SocialForceParams) {
    this.params = params;
  }

  public computeForces(
    agents: Agent[],
    mapElements: MapElement[],
    dt: number
  ): Vector[] {
    const forces: Vector[] = [];

    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i];
      let totalForce: Vector = { x: 0, y: 0 };

      const desiredForce = this.computeDesiredForce(agent);
      totalForce = this.addVectors(totalForce, desiredForce);

      for (let j = 0; j < agents.length; j++) {
        if (i !== j) {
          const other = agents[j];
          const interactionForce = this.computeAgentInteractionForce(agent, other);
          totalForce = this.addVectors(totalForce, interactionForce);
        }
      }

      const groupForce = this.computeGroupForce(agent, agents);
      totalForce = this.addVectors(totalForce, groupForce);

      for (const element of mapElements) {
        const boundaryForce = this.computeBoundaryForce(agent, element);
        totalForce = this.addVectors(totalForce, boundaryForce);
      }

      forces.push(totalForce);
    }

    return forces;
  }

  public updateAgents(
    agents: Agent[],
    forces: Vector[],
    dt: number
  ): Agent[] {
    return agents.map((agent, i) => {
      const force = forces[i];
      const acceleration = this.scaleVector(force, 1 / agent.size);

      let newVelocity = this.addVectors(
        agent.velocity,
        this.scaleVector(acceleration, dt)
      );

      const speed = Math.sqrt(newVelocity.x ** 2 + newVelocity.y ** 2);
      if (speed > this.params.maxSpeed) {
        newVelocity = this.scaleVector(
          newVelocity, this.params.maxSpeed / speed
        );
      }

      const newPosition = this.addVectors(
        agent.position,
        this.scaleVector(newVelocity, dt)
      );

      this.updatePositionHistory(agent.id, newPosition);

      return {
        ...agent,
        position: newPosition,
        velocity: newVelocity,
      };
    });
  }

  public detectLocalExtrema(agents: Agent[]): string[] {
    const jitteringAgents: string[] = [];

    for (const agent of agents) {
      const history = this.positionHistory.get(agent.id);
      if (history && history.length >= this.historyWindow) {
        const variance = this.computePositionVariance(history);
        const displacement = this.computeNetDisplacement(history);

        if (variance > this.jitterThreshold && displacement < variance * 0.5) {
          jitteringAgents.push(agent.id);
        }
      }
    }

    return jitteringAgents;
  }

  private computeDesiredForce(agent: Agent): Vector {
    const desiredDirection = this.normalizeVector(
      this.subtractVectors(agent.target, agent.position)
    );
    const desiredVel = this.scaleVector(desiredDirection, this.params.maxSpeed);
    const velDiff = this.subtractVectors(desiredVel, agent.velocity);
    return this.scaleVector(velDiff, 1 / this.params.tau);
  }

  private computeAgentInteractionForce(agent: Agent, other: Agent): Vector {
    const diff = this.subtractVectors(agent.position, other.position);
    const distance = this.vectorMagnitude(diff);
    const direction = this.normalizeVector(diff);

    const socialPsychForce = this.computeSocialPsychForce(distance, direction);
    const physicalForce = this.computePhysicalContactForce(agent, other, distance, direction);

    return this.addVectors(socialPsychForce, physicalForce);
  }

  private computeSocialPsychForce(
    distance: number,
    direction: Vector
  ): Vector {
    const exponent = -distance / this.params.B;
    const magnitude = this.params.A * Math.exp(exponent);
    return this.scaleVector(direction, magnitude);
  }

  private computePhysicalContactForce(
    agent: Agent,
    other: Agent,
    distance: number,
    direction: Vector
  ): Vector {
    const combinedRadius = (agent.size + other.size) / 2;

    if (distance >= combinedRadius) {
      return { x: 0, y: 0 };
    }

    const overlap = combinedRadius - distance;
    const repulsionMagnitude = this.params.k * overlap;

    const relativeVel = this.subtractVectors(other.velocity, agent.velocity);
    const tangentialDir = { x: -direction.y, y: direction.x };
    const tangentialVel = this.dotProduct(relativeVel, tangentialDir);
    const frictionMagnitude = this.params.kappa * overlap * Math.abs(tangentialVel);

    const repulsionForce = this.scaleVector(direction, repulsionMagnitude);
    const frictionForce = this.scaleVector(tangentialDir, frictionMagnitude * Math.sign(tangentialVel));

    return this.addVectors(repulsionForce, frictionForce);
  }

  private computeGroupForce(agent: Agent, agents: Agent[]): Vector {
    if (agent.groupId === undefined) {
      return { x: 0, y: 0 };
    }

    const groupMembers = agents.filter(
      a => a.groupId === agent.groupId && a.id !== agent.id
    );

    if (groupMembers.length === 0) {
      return { x: 0, y: 0 };
    }

    let groupForce: Vector = { x: 0, y: 0 };
    const groupCenter = this.computeGroupCenter(groupMembers);
    const cohesionForce = this.computeCohesionForce(agent, groupCenter);
    groupForce = this.addVectors(groupForce, cohesionForce);

    const separationForce = this.computeSeparationForce(agent, groupMembers);
    groupForce = this.addVectors(groupForce, separationForce);

    const avoidanceForce = this.computeGroupAvoidanceForce(agent, agents);
    groupForce = this.addVectors(groupForce, avoidanceForce);

    return groupForce;
  }

  private computeGroupCenter(groupMembers: Agent[]): Point {
    if (groupMembers.length === 0) {
      return { x: 0, y: 0 };
    }

    const sum = groupMembers.reduce(
      (acc, m) => this.addVectors(acc, m.position),
      { x: 0, y: 0 }
    );

    return this.scaleVector(sum, 1 / groupMembers.length);
  }

  private computeCohesionForce(agent: Agent, groupCenter: Point): Vector {
    const toCenter = this.subtractVectors(groupCenter, agent.position);
    const distance = this.vectorMagnitude(toCenter);

    if (distance < 0.5) {
      return { x: 0, y: 0 };
    }

    const strength = Math.min(distance * 2, 5);
    return this.scaleVector(this.normalizeVector(toCenter), strength);
  }

  private computeSeparationForce(agent: Agent, groupMembers: Agent[]): Vector {
    let separationForce: Vector = { x: 0, y: 0 };
    const minDistance = 0.8;

    for (const member of groupMembers) {
      const diff = this.subtractVectors(agent.position, member.position);
      const distance = this.vectorMagnitude(diff);

      if (distance < minDistance && distance > 0) {
        const repelStrength = (minDistance - distance) * 10;
        separationForce = this.addVectors(
          separationForce,
          this.scaleVector(this.normalizeVector(diff), repelStrength)
        );
      }
    }

    return separationForce;
  }

  private computeGroupAvoidanceForce(agent: Agent, agents: Agent[]): Vector {
    let avoidanceForce: Vector = { x: 0, y: 0 };

    for (const other of agents) {
      if (other.groupId !== agent.groupId) {
        const diff = this.subtractVectors(agent.position, other.position);
        const distance = this.vectorMagnitude(diff);

        if (distance < 1.5) {
          const strength = (1.5 - distance) * 3;
          avoidanceForce = this.addVectors(
            avoidanceForce,
            this.scaleVector(this.normalizeVector(diff), strength)
          );
        }
      }
    }

    return avoidanceForce;
  }

  private computeBoundaryForce(agent: Agent, element: MapElement): Vector {
    const closestPoint = this.findClosestPointOnPolygon(
      agent.position,
      element.polygon
    );

    const diff = this.subtractVectors(agent.position, closestPoint);
    const distance = this.vectorMagnitude(diff);

    if (distance < 0.001) {
      return { x: 0, y: 0 };
    }

    const direction = this.normalizeVector(diff);
    const exponent = -distance / this.params.B;
    const magnitude = this.params.A * Math.exp(exponent) * 1.5;

    return this.scaleVector(direction, magnitude);
  }

  private findClosestPointOnPolygon(point: Point, polygon: Point[]): Point {
    let closest: Point = polygon[0];
    let minDist = Infinity;

    for (let i = 0; i < polygon.length; i++) {
      const p1 = polygon[i];
      const p2 = polygon[(i + 1) % polygon.length];

      const segmentPoint = this.findClosestPointOnSegment(point, p1, p2);
      const dist = this.vectorMagnitude(
        this.subtractVectors(point, segmentPoint)
      );

      if (dist < minDist) {
        minDist = dist;
        closest = segmentPoint;
      }
    }

    return closest;
  }

  private findClosestPointOnSegment(
    point: Point,
    p1: Point,
    p2: Point
  ): Point {
    const segment = this.subtractVectors(p2, p1);
    const toPoint = this.subtractVectors(point, p1);

    const segLengthSq = this.dotProduct(segment, segment);
    if (segLengthSq === 0) return p1;

    let t = this.dotProduct(toPoint, segment) / segLengthSq;
    t = Math.max(0, Math.min(1, t));

    return {
      x: p1.x + t * segment.x,
      y: p1.y + t * segment.y,
    };
  }

  private updatePositionHistory(agentId: string, position: Point): void {
    let history = this.positionHistory.get(agentId);
    if (!history) {
      history = [];
      this.positionHistory.set(agentId, history);
    }

    history.push(position);

    if (history.length > this.historyWindow) {
      history.shift();
    }
  }

  private computePositionVariance(history: Point[]): number {
    if (history.length < 2) return 0;

    let sumX = 0;
    let sumY = 0;
    let sumXSq = 0;
    let sumYSq = 0;

    for (const p of history) {
      sumX += p.x;
      sumY += p.y;
      sumXSq += p.x * p.x;
      sumYSq += p.y * p.y;
    }

    const n = history.length;
    const varX = (sumXSq / n - (sumX / n) ** 2);
    const varY = (sumYSq / n - (sumY / n) ** 2);

    return Math.sqrt(varX + varY);
  }

  private computeNetDisplacement(history: Point[]): number {
    if (history.length < 2) return 0;

    const first = history[0];
    const last = history[history.length - 1];

    return this.vectorMagnitude(this.subtractVectors(last, first));
  }

  private addVectors(a: Vector, b: Vector): Vector {
    return { x: a.x + b.x, y: a.y + b.y };
  }

  private subtractVectors(a: Vector, b: Vector): Vector {
    return { x: a.x - b.x, y: a.y - b.y };
  }

  private scaleVector(v: Vector, scalar: number): Vector {
    return { x: v.x * scalar, y: v.y * scalar };
  }

  private vectorMagnitude(v: Vector): number {
    return Math.sqrt(v.x ** 2 + v.y ** 2);
  }

  private normalizeVector(v: Vector): Vector {
    const mag = this.vectorMagnitude(v);
    if (mag === 0) return { x: 0, y: 0 };
    return { x: v.x / mag, y: v.y / mag };
  }

  private dotProduct(a: Vector, b: Vector): number {
    return a.x * b.x + a.y * b.y;
  }
}

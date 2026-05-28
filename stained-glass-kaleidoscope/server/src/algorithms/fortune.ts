export interface Point {
  x: number;
  y: number;
}

export interface VoronoiCell {
  site: Point;
  vertices: Point[];
  neighbors: number[];
}

export interface VoronoiEdge {
  start: Point;
  end: Point;
  left: number;
  right: number;
}

export interface VoronoiResult {
  cells: VoronoiCell[];
  edges: VoronoiEdge[];
}

class Event {
  type: 'site' | 'circle';
  point: Point;
  siteIndex?: number;
  arc?: Arc;
  circleCenter?: Point;

  constructor(type: 'site' | 'circle', point: Point) {
    this.type = type;
    this.point = point;
  }
}

class Arc {
  siteIndex: number;
  site: Point;
  leftEdge?: Edge;
  rightEdge?: Edge;
  prev?: Arc;
  next?: Arc;
  circleEvent?: Event;

  constructor(site: Point, siteIndex: number) {
    this.site = site;
    this.siteIndex = siteIndex;
  }
}

class Edge {
  start: Point;
  end?: Point;
  leftSite: number;
  rightSite: number;
  direction: Point;

  constructor(start: Point, leftSite: number, rightSite: number, direction: Point) {
    this.start = start;
    this.leftSite = leftSite;
    this.rightSite = rightSite;
    this.direction = direction;
  }
}

class PriorityQueue<T> {
  private items: { item: T; priority: number }[] = [];

  enqueue(item: T, priority: number): void {
    const element = { item, priority };
    let added = false;
    for (let i = 0; i < this.items.length; i++) {
      if (element.priority < this.items[i].priority) {
        this.items.splice(i, 0, element);
        added = true;
        break;
      }
    }
    if (!added) {
      this.items.push(element);
    }
  }

  dequeue(): T | undefined {
    return this.items.shift()?.item;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  remove(predicate: (item: T) => boolean): void {
    this.items = this.items.filter((e) => !predicate(e.item));
  }
}

export function computeVoronoi(
  points: Point[],
  bounds: { width: number; height: number }
): VoronoiResult {
  const sortedPoints = points
    .map((p, i) => ({ point: p, index: i }))
    .sort((a, b) => a.point.y - b.point.y);

  const eventQueue = new PriorityQueue<Event>();
  sortedPoints.forEach(({ point, index }) => {
    const event = new Event('site', point);
    event.siteIndex = index;
    eventQueue.enqueue(event, point.y);
  });

  let beachline: Arc | undefined;
  const edges: Edge[] = [];
  const cells: { site: Point; vertices: Point[]; neighbors: number[] }[] = points.map(
    (p) => ({ site: p, vertices: [], neighbors: [] })
  );

  const handleSiteEvent = (event: Event) => {
    const newArc = new Arc(event.point, event.siteIndex!);
    
    if (!beachline) {
      beachline = newArc;
      return;
    }

    let current = beachline;
    while (current.next) {
      const d1 = distanceToArc(event.point, current);
      const d2 = distanceToArc(event.point, current.next);
      if (d1 <= d2) break;
      current = current.next;
    }

    const leftArc = current;
    const rightArc = current.next;

    if (leftArc.circleEvent) {
      eventQueue.remove((e) => e === leftArc.circleEvent);
      leftArc.circleEvent = undefined;
    }

    const middleArc = new Arc(event.point, event.siteIndex!);
    
    const leftEdge = new Edge(
      { x: 0, y: 0 },
      leftArc.siteIndex,
      middleArc.siteIndex,
      { x: 1, y: 0 }
    );
    edges.push(leftEdge);
    
    const rightEdge = new Edge(
      { x: 0, y: 0 },
      middleArc.siteIndex,
      rightArc?.siteIndex ?? leftArc.siteIndex,
      { x: 1, y: 0 }
    );
    edges.push(rightEdge);

    leftArc.rightEdge = leftEdge;
    middleArc.leftEdge = leftEdge;
    middleArc.rightEdge = rightEdge;
    
    if (rightArc) {
      rightArc.leftEdge = rightEdge;
    }

    middleArc.prev = leftArc;
    middleArc.next = rightArc;
    leftArc.next = middleArc;
    if (rightArc) {
      rightArc.prev = middleArc;
    }

    checkCircleEvent(leftArc, eventQueue);
    if (rightArc) {
      checkCircleEvent(rightArc, eventQueue);
    }
  };

  const checkCircleEvent = (arc: Arc, queue: PriorityQueue<Event>) => {
    if (!arc.prev || !arc.next) return;
    
    const circleCenter = findCircleCenter(
      arc.prev.site,
      arc.site,
      arc.next.site
    );
    
    if (!circleCenter) return;
    
    const radius = Math.hypot(
      circleCenter.x - arc.site.x,
      circleCenter.y - arc.site.y
    );
    const eventY = circleCenter.y + radius;
    
    const event = new Event('circle', { x: circleCenter.x, y: eventY });
    event.arc = arc;
    event.circleCenter = circleCenter;
    
    arc.circleEvent = event;
    queue.enqueue(event, eventY);
  };

  const handleCircleEvent = (event: Event) => {
    const arc = event.arc;
    if (!arc || !arc.prev || !arc.next) return;

    const vertex = event.circleCenter!;
    
    if (arc.leftEdge) {
      arc.leftEdge.end = vertex;
    }
    if (arc.rightEdge) {
      arc.rightEdge.end = vertex;
    }

    cells[arc.prev.siteIndex].vertices.push(vertex);
    cells[arc.siteIndex].vertices.push(vertex);
    cells[arc.next.siteIndex].vertices.push(vertex);

    if (!cells[arc.prev.siteIndex].neighbors.includes(arc.siteIndex)) {
      cells[arc.prev.siteIndex].neighbors.push(arc.siteIndex);
    }
    if (!cells[arc.siteIndex].neighbors.includes(arc.prev.siteIndex)) {
      cells[arc.siteIndex].neighbors.push(arc.prev.siteIndex);
    }
    if (!cells[arc.siteIndex].neighbors.includes(arc.next.siteIndex)) {
      cells[arc.siteIndex].neighbors.push(arc.next.siteIndex);
    }
    if (!cells[arc.next.siteIndex].neighbors.includes(arc.siteIndex)) {
      cells[arc.next.siteIndex].neighbors.push(arc.siteIndex);
    }

    arc.prev.next = arc.next;
    arc.next.prev = arc.prev;

    const newEdge = new Edge(
      vertex,
      arc.prev.siteIndex,
      arc.next.siteIndex,
      { x: 1, y: 0 }
    );
    edges.push(newEdge);

    arc.prev.rightEdge = newEdge;
    arc.next.leftEdge = newEdge;

    if (arc.prev.circleEvent) {
      eventQueue.remove((e) => e === arc.prev!.circleEvent);
      arc.prev.circleEvent = undefined;
    }
    if (arc.next.circleEvent) {
      eventQueue.remove((e) => e === arc.next!.circleEvent);
      arc.next.circleEvent = undefined;
    }

    checkCircleEvent(arc.prev, eventQueue);
    checkCircleEvent(arc.next, eventQueue);
  };

  while (!eventQueue.isEmpty()) {
    const event = eventQueue.dequeue();
    if (!event) break;
    
    if (event.type === 'site') {
      handleSiteEvent(event);
    } else {
      handleCircleEvent(event);
    }
  }

  const resultEdges: VoronoiEdge[] = edges
    .filter((e) => e.start && e.end)
    .map((e) => ({
      start: e.start,
      end: e.end!,
      left: e.leftSite,
      right: e.rightSite,
    }));

  return {
    cells,
    edges: resultEdges,
  };
}

function distanceToArc(point: Point, arc: Arc): number {
  const dx = point.x - arc.site.x;
  const dy = point.y - arc.site.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function findCircleCenter(p1: Point, p2: Point, p3: Point): Point | null {
  const a1 = 2 * (p2.x - p1.x);
  const b1 = 2 * (p2.y - p1.y);
  const c1 = p2.x * p2.x - p1.x * p1.x + p2.y * p2.y - p1.y * p1.y;
  
  const a2 = 2 * (p3.x - p2.x);
  const b2 = 2 * (p3.y - p2.y);
  const c2 = p3.x * p3.x - p2.x * p2.x + p3.y * p3.y - p2.y * p2.y;
  
  const det = a1 * b2 - a2 * b1;
  if (Math.abs(det) < 1e-10) return null;
  
  const x = (b2 * c1 - b1 * c2) / det;
  const y = (a1 * c2 - a2 * c1) / det;
  
  return { x, y };
}

export function handleDegenerateTriangles(cells: VoronoiCell[]): VoronoiCell[] {
  return cells.map((cell) => {
    const vertices = [...cell.vertices];
    for (let i = 0; i < vertices.length - 2; i++) {
      const area = triangleArea(
        vertices[i],
        vertices[i + 1],
        vertices[i + 2]
      );
      if (area < 1e-6) {
        const jitter = 1e-4;
        vertices[i + 1].x += (Math.random() - 0.5) * jitter;
        vertices[i + 1].y += (Math.random() - 0.5) * jitter;
      }
    }
    return { ...cell, vertices };
  });
}

function triangleArea(p1: Point, p2: Point, p3: Point): number {
  return Math.abs(
    (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x)
  ) / 2;
}

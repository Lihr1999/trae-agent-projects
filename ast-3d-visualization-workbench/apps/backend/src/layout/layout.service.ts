import { Injectable, Logger } from '@nestjs/common';
import {
  LayoutNode,
  LayoutEdge,
  LayoutResult,
  LayoutParams,
  ASTNodeInput,
} from './layout.interfaces';

interface RTNode {
  id: string;
  type: string;
  label: string;
  depth: number;
  children: RTNode[];
  hasError: boolean;
  parentId: string | null;
  prelim: number;
  modifier: number;
  x: number;
  y: number;
  z: number;
  thread: RTNode | null;
  ancestor: RTNode;
  change: number;
  shift: number;
  number: number;
}

@Injectable()
export class LayoutService {
  private readonly logger = new Logger(LayoutService.name);

  computeLayout(ast: ASTNodeInput, params: LayoutParams = {}): LayoutResult {
    const startTime = Date.now();

    const {
      layerSpacing = 8,
      siblingSpacing = 3,
      subtreeSpacing = 5,
      angularSpread = 20,
      maxZDepth = 500,
      algorithm = 'hybrid',
      forceIterations = 100,
      repulsionStrength = 50,
      attractionStrength = 0.01,
      lodThreshold = 5000,
    } = params;

    const totalNodes = this.countASTNodes(ast);
    const useLod = totalNodes > lodThreshold;
    const effectiveAngularSpread = useLod ? angularSpread * 0.5 : angularSpread;
    const effectiveLayerSpacing = useLod ? layerSpacing * 0.7 : layerSpacing;

    let nodes: LayoutNode[];
    let edges: LayoutEdge[];

    switch (algorithm) {
      case 'reingold-tilford':
        ({ nodes, edges } = this.reingoldTilford3D(
          ast,
          effectiveLayerSpacing,
          siblingSpacing,
          subtreeSpacing,
          effectiveAngularSpread,
          maxZDepth,
        ));
        break;
      case 'force-directed':
        ({ nodes, edges } = this.forceDirected(
          ast,
          effectiveLayerSpacing,
          forceIterations,
          repulsionStrength,
          attractionStrength,
          maxZDepth,
        ));
        break;
      case 'hybrid':
      default:
        ({ nodes, edges } = this.hybridLayout(
          ast,
          effectiveLayerSpacing,
          siblingSpacing,
          subtreeSpacing,
          effectiveAngularSpread,
          maxZDepth,
          forceIterations,
          repulsionStrength,
          attractionStrength,
        ));
        break;
    }

    const bounds = this.computeBounds(nodes);

    return {
      nodes,
      edges,
      bounds,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      computeTime: Date.now() - startTime,
    };
  }

  private reingoldTilford3D(
    ast: ASTNodeInput,
    layerSpacing: number,
    siblingSpacing: number,
    subtreeSpacing: number,
    angularSpread: number,
    maxZDepth: number,
  ): { nodes: LayoutNode[]; edges: LayoutEdge[] } {
    const root = this.buildRTNode(ast, 0, null, 0);
    this.firstWalk(root, siblingSpacing, subtreeSpacing);
    this.secondWalk(root, -root.prelim, 0);

    this.assignZCoordinates(root, angularSpread, maxZDepth, 0, 1);
    this.applyZigzagFolding(root, maxZDepth);

    const nodes: LayoutNode[] = [];
    const edges: LayoutEdge[] = [];
    this.collectLayoutNodes(root, nodes, edges, layerSpacing);

    return { nodes, edges };
  }

  private buildRTNode(astNode: ASTNodeInput, depth: number, parentId: string | null, siblingNumber: number): RTNode {
    const rtNode: RTNode = {
      id: astNode.id,
      type: astNode.type,
      label: astNode.text.substring(0, 50),
      depth,
      children: [],
      hasError: astNode.hasError || astNode.isErrorPlaceholder || false,
      parentId,
      prelim: 0,
      modifier: 0,
      x: 0,
      y: 0,
      z: 0,
      thread: null,
      ancestor: null as any,
      change: 0,
      shift: 0,
      number: siblingNumber,
    };
    rtNode.ancestor = rtNode;

    astNode.children.forEach((child, index) => {
      rtNode.children.push(this.buildRTNode(child, depth + 1, astNode.id, index));
    });

    return rtNode;
  }

  private firstWalk(node: RTNode, siblingSpacing: number, subtreeSpacing: number): void {
    if (node.children.length === 0) {
      node.prelim = 0;
      return;
    }

    for (const child of node.children) {
      this.firstWalk(child, siblingSpacing, subtreeSpacing);
    }

    const defaultAncestor = node.children[0];
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      if (i > 0) {
        this.apportion(child, defaultAncestor, siblingSpacing, subtreeSpacing);
      }
    }

    this.executeShifts(node);

    const firstChild = node.children[0];
    const lastChild = node.children[node.children.length - 1];
    const midpoint = (firstChild.prelim + lastChild.prelim) / 2;

    node.prelim = midpoint;
  }

  private apportion(node: RTNode, defaultAncestor: RTNode, siblingSpacing: number, subtreeSpacing: number): void {
    let v: RTNode = node;
    let w: RTNode = this.previousSibling(v);
    let vop: RTNode = v;
    let vip: RTNode = v;
    let vim: RTNode = w;
    let vom: RTNode = vip.children[0] || vip;

    let sip = vip.modifier;
    let sop = vop.modifier;
    let sim = vim.modifier;
    let som = vom.modifier;

    let nextUpper = this.nextLeft(vim);
    let nextLower = this.nextRight(vip);

    while (nextUpper !== null && nextLower !== null) {
      vim = nextUpper;
      vip = nextLower;
      const nextVom = this.nextLeft(vom);
      const nextVop = this.nextRight(vop);
      if (nextVom !== null) vom = nextVom;
      if (nextVop !== null) vop = nextVop;

      vop.ancestor = node;

      const shift = (vim.prelim + sim) - (vip.prelim + sip) + siblingSpacing + subtreeSpacing;

      if (shift > 0) {
        const ancestor = this.ancestor(vim, node, defaultAncestor);
        this.moveSubtree(ancestor, node, shift);
        sip += shift;
        sop += shift;
      }

      sim += vim.modifier;
      sip += vip.modifier;
      som += vom.modifier;
      sop += vop.modifier;

      nextUpper = this.nextLeft(vim);
      nextLower = this.nextRight(vip);
    }

    if (this.nextLeft(vim) !== null && this.nextRight(vop) === null) {
      vop.thread = this.nextLeft(vim);
      vop.modifier += sim - sop;
    }

    if (this.nextLeft(vip) !== null && this.nextRight(vom) === null) {
      vom.thread = this.nextLeft(vip);
      vom.modifier += sip - som;
      defaultAncestor = node;
    }
  }

  private nextLeft(node: RTNode): RTNode | null {
    if (node.children.length > 0) return node.children[0];
    return node.thread;
  }

  private nextRight(node: RTNode): RTNode | null {
    if (node.children.length > 0) return node.children[node.children.length - 1];
    return node.thread;
  }

  private previousSibling(node: RTNode): RTNode {
    const parent = this.findParentInTree(node);
    if (!parent) return node;
    const idx = parent.children.indexOf(node);
    return idx > 0 ? parent.children[idx - 1] : node;
  }

  private findParentInTree(_node: RTNode): RTNode | null {
    return null;
  }

  private ancestor(vim: RTNode, node: RTNode, defaultAncestor: RTNode): RTNode {
    if (vim.ancestor && this.isSibling(vim.ancestor, node)) {
      return vim.ancestor;
    }
    return defaultAncestor;
  }

  private isSibling(a: RTNode, b: RTNode): boolean {
    return a.parentId === b.parentId && a.parentId !== null;
  }

  private moveSubtree(wl: RTNode, wr: RTNode, shift: number): void {
    const subtrees = wr.number - wl.number;
    if (subtrees === 0) return;

    wr.change -= shift / subtrees;
    wr.shift += shift;
    wl.change += shift / subtrees;
    wr.prelim += shift;
    wr.modifier += shift;
  }

  private executeShifts(node: RTNode): void {
    let shift = 0;
    let change = 0;

    for (let i = node.children.length - 1; i >= 0; i--) {
      const child = node.children[i];
      child.prelim += shift;
      child.modifier += shift;
      change += child.change;
      shift += child.shift + change;
    }
  }

  private secondWalk(node: RTNode, modifier: number, depth: number): void {
    node.x = node.prelim + modifier;
    node.y = depth;

    for (const child of node.children) {
      this.secondWalk(child, modifier + node.modifier, depth + 1);
    }
  }

  private assignZCoordinates(node: RTNode, angularSpread: number, maxZDepth: number, segmentStart: number, segmentSize: number): void {
    if (node.children.length === 0) return;

    const childCount = node.children.length;
    for (let i = 0; i < childCount; i++) {
      const child = node.children[i];
      const childSegment = segmentSize / childCount;
      const midAngle = segmentStart + childSegment * (i + 0.5);
      child.z = (midAngle - 0.5) * angularSpread;

      if (Math.abs(child.z) > maxZDepth) {
        child.z = Math.sign(child.z) * maxZDepth;
      }

      this.assignZCoordinates(child, angularSpread, maxZDepth, segmentStart + childSegment * i, childSegment);
    }
  }

  private applyZigzagFolding(node: RTNode, maxZDepth: number): void {
    const chainNodes = this.findLongChains(node, 20);

    for (const chain of chainNodes) {
      if (chain.length < 3) continue;

      for (let i = 0; i < chain.length; i++) {
        const chainNode = chain[i];
        const zigzagOffset = (i % 2 === 0 ? 1 : -1) * (maxZDepth * 0.1);
        chainNode.z = zigzagOffset + (chainNode.z * 0.3);

        if (Math.abs(chainNode.z) > maxZDepth) {
          chainNode.z = Math.sign(chainNode.z) * maxZDepth;
        }
      }
    }
  }

  private findLongChains(node: RTNode, minChainLength: number): RTNode[][] {
    const chains: RTNode[][] = [];

    const traverse = (current: RTNode, currentChain: RTNode[]): void => {
      currentChain.push(current);

      if (current.children.length === 1) {
        traverse(current.children[0], currentChain);
      } else {
        if (currentChain.length >= minChainLength) {
          chains.push([...currentChain]);
        }
        for (const child of current.children) {
          traverse(child, []);
        }
      }
    };

    traverse(node, []);
    return chains;
  }

  private collectLayoutNodes(
    rtNode: RTNode,
    nodes: LayoutNode[],
    edges: LayoutEdge[],
    layerSpacing: number,
  ): void {
    nodes.push({
      id: rtNode.id,
      x: rtNode.x,
      y: rtNode.y * layerSpacing,
      z: rtNode.z,
      type: rtNode.type,
      label: rtNode.label,
      depth: rtNode.depth,
      childCount: rtNode.children.length,
      hasError: rtNode.hasError,
      parentId: rtNode.parentId,
    });

    for (const child of rtNode.children) {
      edges.push({ source: rtNode.id, target: child.id });
      this.collectLayoutNodes(child, nodes, edges, layerSpacing);
    }
  }

  private forceDirected(
    ast: ASTNodeInput,
    layerSpacing: number,
    iterations: number,
    repulsionStrength: number,
    attractionStrength: number,
    maxZDepth: number,
  ): { nodes: LayoutNode[]; edges: LayoutEdge[] } {
    const layoutNodes: LayoutNode[] = [];
    const edges: LayoutEdge[] = [];

    this.flattenAST(ast, layoutNodes, edges, 0, null, layerSpacing);

    const nodeMap = new Map<string, LayoutNode>();
    for (const node of layoutNodes) {
      nodeMap.set(node.id, node);
    }

    const positions = new Map<string, { x: number; y: number; z: number }>();
    for (const node of layoutNodes) {
      positions.set(node.id, {
        x: (Math.random() - 0.5) * layoutNodes.length * 0.5,
        y: node.depth * layerSpacing,
        z: (Math.random() - 0.5) * 10,
      });
    }

    const temperature = Math.max(layoutNodes.length * 0.5, 10);
    const cooling = temperature / (iterations + 1);

    for (let iter = 0; iter < iterations; iter++) {
      const displacement = new Map<string, { x: number; y: number; z: number }>();
      for (const node of layoutNodes) {
        displacement.set(node.id, { x: 0, y: 0, z: 0 });
      }

      for (let i = 0; i < layoutNodes.length; i++) {
        for (let j = i + 1; j < layoutNodes.length; j++) {
          const posI = positions.get(layoutNodes[i].id)!;
          const posJ = positions.get(layoutNodes[j].id)!;

          const dx = posI.x - posJ.x;
          const dy = posI.y - posJ.y;
          const dz = posI.z - posJ.z;

          const distSq = dx * dx + dy * dy + dz * dz;
          const dist = Math.sqrt(distSq) + 0.01;

          const repulsion = repulsionStrength / distSq;

          const forceX = (dx / dist) * repulsion;
          const forceY = (dy / dist) * repulsion * 0.1;
          const forceZ = (dz / dist) * repulsion * 0.5;

          const dispI = displacement.get(layoutNodes[i].id)!;
          const dispJ = displacement.get(layoutNodes[j].id)!;
          dispI.x += forceX;
          dispI.y += forceY;
          dispI.z += forceZ;
          dispJ.x -= forceX;
          dispJ.y -= forceY;
          dispJ.z -= forceZ;
        }
      }

      for (const edge of edges) {
        const posS = positions.get(edge.source)!;
        const posT = positions.get(edge.target)!;

        const dx = posT.x - posS.x;
        const dy = posT.y - posS.y;
        const dz = posT.z - posS.z;

        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.01;

        const attraction = attractionStrength * dist;

        const forceX = (dx / dist) * attraction;
        const forceY = (dy / dist) * attraction * 0.1;
        const forceZ = (dz / dist) * attraction * 0.5;

        const dispS = displacement.get(edge.source)!;
        const dispT = displacement.get(edge.target)!;
        dispS.x += forceX;
        dispS.y += forceY;
        dispS.z += forceZ;
        dispT.x -= forceX;
        dispT.y -= forceY;
        dispT.z -= forceZ;
      }

      const currentTemp = temperature - cooling * iter;
      const clampedTemp = Math.max(currentTemp, 0.1);

      for (const node of layoutNodes) {
        const pos = positions.get(node.id)!;
        const disp = displacement.get(node.id)!;

        const dispMag = Math.sqrt(disp.x * disp.x + disp.y * disp.y + disp.z * disp.z) + 0.01;
        const clampedDispMag = Math.min(dispMag, clampedTemp);

        pos.x += (disp.x / dispMag) * clampedDispMag;
        pos.y += (disp.y / dispMag) * clampedDispMag * 0.05;
        pos.z += (disp.z / dispMag) * clampedDispMag * 0.5;

        pos.y = node.depth * layerSpacing;

        if (Math.abs(pos.z) > maxZDepth) {
          pos.z = Math.sign(pos.z) * maxZDepth;
        }
      }
    }

    for (const node of layoutNodes) {
      const pos = positions.get(node.id)!;
      node.x = pos.x;
      node.y = pos.y;
      node.z = pos.z;
    }

    return { nodes: layoutNodes, edges };
  }

  private hybridLayout(
    ast: ASTNodeInput,
    layerSpacing: number,
    siblingSpacing: number,
    subtreeSpacing: number,
    angularSpread: number,
    maxZDepth: number,
    forceIterations: number,
    repulsionStrength: number,
    attractionStrength: number,
  ): { nodes: LayoutNode[]; edges: LayoutEdge[] } {
    const rtResult = this.reingoldTilford3D(
      ast,
      layerSpacing,
      siblingSpacing,
      subtreeSpacing,
      angularSpread,
      maxZDepth,
    );

    const nodeMap = new Map<string, LayoutNode>();
    for (const node of rtResult.nodes) {
      nodeMap.set(node.id, { ...node });
    }

    const positions = new Map<string, { x: number; y: number; z: number }>();
    for (const node of rtResult.nodes) {
      positions.set(node.id, { x: node.x, y: node.y, z: node.z });
    }

    const effectiveIterations = Math.min(forceIterations, Math.max(20, Math.floor(rtResult.nodes.length / 10)));
    const reducedRepulsion = repulsionStrength * 0.3;
    const reducedAttraction = attractionStrength * 2;

    for (let iter = 0; iter < effectiveIterations; iter++) {
      const displacement = new Map<string, { x: number; y: number; z: number }>();
      for (const node of rtResult.nodes) {
        displacement.set(node.id, { x: 0, y: 0, z: 0 });
      }

      const sampleSize = Math.min(rtResult.nodes.length, 500);
      const sampleIndices = new Set<number>();
      if (sampleSize < rtResult.nodes.length) {
        while (sampleIndices.size < sampleSize) {
          sampleIndices.add(Math.floor(Math.random() * rtResult.nodes.length));
        }
      }

      const sampledNodes = sampleSize < rtResult.nodes.length
        ? [...sampleIndices].map(i => rtResult.nodes[i])
        : rtResult.nodes;

      for (let i = 0; i < sampledNodes.length; i++) {
        for (let j = i + 1; j < sampledNodes.length; j++) {
          const posI = positions.get(sampledNodes[i].id)!;
          const posJ = positions.get(sampledNodes[j].id)!;

          const dx = posI.x - posJ.x;
          const dz = posI.z - posJ.z;

          const distSq = dx * dx + dz * dz + 1;
          const dist = Math.sqrt(distSq);

          const repulsion = reducedRepulsion / distSq;

          const dispI = displacement.get(sampledNodes[i].id)!;
          const dispJ = displacement.get(sampledNodes[j].id)!;
          dispI.x += (dx / dist) * repulsion;
          dispI.z += (dz / dist) * repulsion * 0.3;
          dispJ.x -= (dx / dist) * repulsion;
          dispJ.z -= (dz / dist) * repulsion * 0.3;
        }
      }

      for (const edge of rtResult.edges) {
        const posS = positions.get(edge.source)!;
        const posT = positions.get(edge.target)!;

        const dx = posT.x - posS.x;
        const dz = posT.z - posS.z;

        const dist = Math.sqrt(dx * dx + dz * dz) + 0.01;

        const idealDist = layerSpacing * 0.8;
        const attraction = reducedAttraction * (dist - idealDist);

        const dispS = displacement.get(edge.source)!;
        const dispT = displacement.get(edge.target)!;
        dispS.x += (dx / dist) * attraction;
        dispS.z += (dz / dist) * attraction * 0.3;
        dispT.x -= (dx / dist) * attraction;
        dispT.z -= (dz / dist) * attraction * 0.3;
      }

      const damping = 1 - (iter / effectiveIterations) * 0.8;

      for (const node of rtResult.nodes) {
        const pos = positions.get(node.id)!;
        const disp = displacement.get(node.id)!;

        const dispMag = Math.sqrt(disp.x * disp.x + disp.z * disp.z) + 0.01;
        const maxDisp = 2.0 * damping;

        pos.x += (disp.x / dispMag) * Math.min(dispMag, maxDisp);
        pos.z += (disp.z / dispMag) * Math.min(dispMag, maxDisp);

        if (Math.abs(pos.z) > maxZDepth) {
          pos.z = Math.sign(pos.z) * maxZDepth;
        }
      }
    }

    const finalNodes: LayoutNode[] = [];
    for (const node of rtResult.nodes) {
      const pos = positions.get(node.id)!;
      finalNodes.push({
        ...node,
        x: pos.x,
        y: pos.y,
        z: pos.z,
      });
    }

    return { nodes: finalNodes, edges: rtResult.edges };
  }

  private flattenAST(
    ast: ASTNodeInput,
    nodes: LayoutNode[],
    edges: LayoutEdge[],
    depth: number,
    parentId: string | null,
    layerSpacing: number,
  ): void {
    nodes.push({
      id: ast.id,
      x: 0,
      y: depth * layerSpacing,
      z: 0,
      type: ast.type,
      label: ast.text.substring(0, 50),
      depth,
      childCount: ast.children.length,
      hasError: ast.hasError || ast.isErrorPlaceholder || false,
      parentId,
    });

    if (parentId) {
      edges.push({ source: parentId, target: ast.id });
    }

    for (const child of ast.children) {
      this.flattenAST(child, nodes, edges, depth + 1, ast.id, layerSpacing);
    }
  }

  private computeBounds(nodes: LayoutNode[]): LayoutResult['bounds'] {
    if (nodes.length === 0) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 };
    }

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (const node of nodes) {
      if (node.x < minX) minX = node.x;
      if (node.x > maxX) maxX = node.x;
      if (node.y < minY) minY = node.y;
      if (node.y > maxY) maxY = node.y;
      if (node.z < minZ) minZ = node.z;
      if (node.z > maxZ) maxZ = node.z;
    }

    return { minX, maxX, minY, maxY, minZ, maxZ };
  }

  private countASTNodes(node: ASTNodeInput): number {
    let count = 1;
    for (const child of node.children) {
      count += this.countASTNodes(child);
    }
    return count;
  }
}

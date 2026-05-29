import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { HeatMap, LBMGrid, Agent, MapElement, Seat, Employee, QuadTreeSnapshot } from '@/types';

interface HeatMapRendererProps {
  width: number;
  height: number;
  heatMap: HeatMap | null;
  flowField: LBMGrid | null;
  agents: Agent[];
  mapElements: MapElement[];
  seats: Seat[];
  employees: Employee[];
  quadtreeSnapshot: QuadTreeSnapshot | null;
  viewMode: 'simulation' | 'flow' | 'heat' | 'quadtree';
  showFlowParticles: boolean;
}

const HeatMapRenderer: React.FC<HeatMapRendererProps> = ({
  width,
  height,
  heatMap,
  flowField,
  agents,
  mapElements,
  seats,
  employees,
  quadtreeSnapshot,
  viewMode,
  showFlowParticles,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const heatMapTextureRef = useRef<THREE.DataTexture | null>(null);
  const flowParticlesRef = useRef<THREE.Points | null>(null);
  const particleVelocitiesRef = useRef<Float32Array | null>(null);
  const animationIdRef = useRef<number>(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    sceneRef.current = scene;

    const camera = new THREE.OrthographicCamera(
      0, width, height, 0, 0.1, 1000
    );
    camera.position.z = 100;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    createGrid(scene, width, height);
    createMapElements(scene, mapElements);
    createSeats(scene, seats);
    createHeatMapLayer(scene, width, height);
    createFlowParticles(scene, width, height);
    createQuadTreeOverlay(scene, width, height);

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      updateFlowParticles();
      updateAgents();
      updateEmployees();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationIdRef.current);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [width, height]);

  useEffect(() => {
    if (!sceneRef.current) return;

    clearSceneLayer(sceneRef.current, 'mapElement');
    clearSceneLayer(sceneRef.current, 'seat');
    createMapElements(sceneRef.current, mapElements);
    createSeats(sceneRef.current, seats);
  }, [mapElements, seats]);

  useEffect(() => {
    updateHeatMapTexture(heatMap);
  }, [heatMap]);

  useEffect(() => {
    if (flowParticlesRef.current) {
      flowParticlesRef.current.visible = viewMode === 'flow' || showFlowParticles;
    }
    if (heatMapTextureRef.current) {
      const material = heatMapTextureRef.current.userData.material;
      if (material) {
        material.opacity = viewMode === 'heat' || viewMode === 'simulation' ? 0.6 : 0;
      }
    }

    if (sceneRef.current) {
      const quadtreeLayer = sceneRef.current.getObjectByName('quadtreeLayer');
      if (quadtreeLayer) {
        quadtreeLayer.visible = viewMode === 'quadtree';
      }
      updateQuadTreeOverlay(quadtreeSnapshot);
    }
  }, [viewMode, showFlowParticles, quadtreeSnapshot]);

  const createGrid = (scene: THREE.Scene, w: number, h: number) => {
    const gridHelper = new THREE.GridHelper(
      Math.max(w, h),
      Math.max(w, h) / 50,
      0x333355,
      0x222244
    );
    gridHelper.rotation.x = Math.PI / 2;
    gridHelper.position.x = w / 2;
    gridHelper.position.y = h / 2;
    gridHelper.position.z = -1;
    scene.add(gridHelper);
  };

  const createMapElements = (scene: THREE.Scene, elements: MapElement[]) => {
    const colors: Record<string, number> = {
      bar: 0x8b4513,
      seat: 0x4a90d9,
      entrance: 0x50c878,
      obstacle: 0x444444,
    };

    for (const element of elements) {
      const shape = new THREE.Shape();
      if (element.polygon.length > 0) {
        shape.moveTo(element.polygon[0].x, element.polygon[0].y);
        for (let i = 1; i < element.polygon.length; i++) {
          shape.lineTo(element.polygon[i].x, element.polygon[i].y);
        }
        shape.closePath();
      }

      const geometry = new THREE.ShapeGeometry(shape);
      const material = new THREE.MeshBasicMaterial({
        color: colors[element.type] || 0x666666,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.z = -0.5;
      mesh.name = `mapElement_${element.id}`;
      mesh.userData.type = 'mapElement';
      scene.add(mesh);

      const edges = new THREE.EdgesGeometry(geometry);
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
      const lineSegments = new THREE.LineSegments(edges, lineMaterial);
      lineSegments.position.z = 0.01;
      lineSegments.name = `mapElement_${element.id}_border`;
      lineSegments.userData.type = 'mapElement';
      scene.add(lineSegments);
    }
  };

  const createSeats = (scene: THREE.Scene, seats: Seat[]) => {
    for (const seat of seats) {
      const geometry = new THREE.CircleGeometry(15, 16);
      const material = new THREE.MeshBasicMaterial({
        color: seat.occupied > 0 ? 0xff6b6b : 0x6bcb77,
        transparent: true,
        opacity: 0.9,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(seat.position.x, seat.position.y, 0.5);
      mesh.name = `seat_${seat.id}`;
      mesh.userData.type = 'seat';
      mesh.userData.seatId = seat.id;
      scene.add(mesh);

      const textGeometry = new THREE.RingGeometry(12, 14, 16);
      const textMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: seat.reserved ? 1 : 0.3,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(textGeometry, textMaterial);
      ring.position.set(seat.position.x, seat.position.y, 0.6);
      ring.name = `seat_${seat.id}_ring`;
      ring.userData.type = 'seat';
      scene.add(ring);
    }
  };

  const createHeatMapLayer = (scene: THREE.Scene, w: number, h: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.createImageData(256, 256);

    const texture = new THREE.DataTexture(
      imageData.data,
      256,
      256,
      THREE.RGBAFormat,
      THREE.UnsignedByteType
    );
    texture.needsUpdate = true;
    heatMapTextureRef.current = texture;

    const geometry = new THREE.PlaneGeometry(w, h);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    });
    texture.userData.material = material;

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(w / 2, h / 2, 1);
    mesh.name = 'heatmapLayer';
    scene.add(mesh);
  };

  const createFlowParticles = (scene: THREE.Scene, w: number, h: number) => {
    const particleCount = 500;
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 2);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = Math.random() * w;
      positions[i * 3 + 1] = Math.random() * h;
      positions[i * 3 + 2] = 2;

      velocities[i * 2] = 0;
      velocities[i * 2 + 1] = 0;

      colors[i * 3] = 0.5;
      colors[i * 3 + 1] = 0.8;
      colors[i * 3 + 2] = 1;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 3,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(geometry, material);
    particles.name = 'flowParticles';
    particles.visible = false;
    scene.add(particles);
    flowParticlesRef.current = particles;
    particleVelocitiesRef.current = velocities;
  };

  const createQuadTreeOverlay = (scene: THREE.Scene, w: number, h: number) => {
    const group = new THREE.Group();
    group.name = 'quadtreeLayer';
    group.visible = false;
    scene.add(group);
  };

  const updateQuadTreeOverlay = (snapshot: QuadTreeSnapshot | null) => {
    if (!sceneRef.current) return;

    const group = sceneRef.current.getObjectByName('quadtreeLayer') as THREE.Group;
    if (!group) return;

    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      if (child instanceof THREE.LineSegments) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    }

    if (!snapshot) return;

    const depthColors = [0x00ff00, 0x88ff00, 0xffff00, 0xff8800, 0xff0000, 0xff00ff];

    for (const node of snapshot.nodes) {
      const shape = new THREE.Shape();
      shape.moveTo(node.boundary.x, node.boundary.y);
      shape.lineTo(node.boundary.x + node.boundary.width, node.boundary.y);
      shape.lineTo(node.boundary.x + node.boundary.width, node.boundary.y + node.boundary.height);
      shape.lineTo(node.boundary.x, node.boundary.y + node.boundary.height);
      shape.closePath();

      const edges = new THREE.EdgesGeometry(new THREE.ShapeGeometry(shape));
      const color = depthColors[Math.min(node.depth, depthColors.length - 1)];
      const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.7 });
      const lineSegments = new THREE.LineSegments(edges, material);
      lineSegments.position.z = 5;
      group.add(lineSegments);
    }
  };

  const updateHeatMapTexture = (heatMap: HeatMap | null) => {
    if (!heatMapTextureRef.current || !heatMap) return;

    const texture = heatMapTextureRef.current;
    const data = texture.image.data as Uint8ClampedArray;
    const resolution = heatMap.resolution;
    const cols = Math.ceil(width / resolution);
    const rows = Math.ceil(height / resolution);

    for (let j = 0; j < 256; j++) {
      for (let i = 0; i < 256; i++) {
        const x = Math.floor((i / 256) * cols);
        const y = Math.floor((j / 256) * rows);

        let value = 0;
        if (y < heatMap.values.length && x < heatMap.values[y].length) {
          value = heatMap.values[y][x];
        }

        const idx = (j * 256 + i) * 4;

        if (value <= 0.01) {
          data[idx] = 0;
          data[idx + 1] = 0;
          data[idx + 2] = 0;
          data[idx + 3] = 0;
        } else {
          const [r, g, b] = getHeatColor(value);
          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          data[idx + 3] = Math.floor(255 * Math.min(1, value * 1.5));
        }
      }
    }

    texture.needsUpdate = true;
  };

  const getHeatColor = (value: number): [number, number, number] => {
    const stops = [
      { t: 0, color: [0, 0, 128] },
      { t: 0.2, color: [0, 128, 255] },
      { t: 0.4, color: [0, 255, 255] },
      { t: 0.6, color: [128, 255, 0] },
      { t: 0.8, color: [255, 255, 0] },
      { t: 0.95, color: [255, 128, 0] },
      { t: 1, color: [255, 0, 0] },
    ];

    for (let i = 0; i < stops.length - 1; i++) {
      if (value >= stops[i].t && value <= stops[i + 1].t) {
        const t = (value - stops[i].t) / (stops[i + 1].t - stops[i].t);
        return [
          Math.floor(stops[i].color[0] + t * (stops[i + 1].color[0] - stops[i].color[0])),
          Math.floor(stops[i].color[1] + t * (stops[i + 1].color[1] - stops[i].color[1])),
          Math.floor(stops[i].color[2] + t * (stops[i + 1].color[2] - stops[i].color[2])),
        ];
      }
    }

    return [255, 0, 0];
  };

  const updateFlowParticles = () => {
    if (!flowParticlesRef.current || !particleVelocitiesRef.current || !flowField) return;

    const positions = flowParticlesRef.current.geometry.attributes.position.array as Float32Array;
    const velocities = particleVelocitiesRef.current;
    const colors = flowParticlesRef.current.geometry.attributes.color.array as Float32Array;
    const gridSize = width / flowField.density[0].length;

    for (let i = 0; i < positions.length / 3; i++) {
      const px = positions[i * 3];
      const py = positions[i * 3 + 1];

      const gx = Math.floor(px / gridSize);
      const gy = Math.floor(py / gridSize);

      if (gy >= 0 && gy < flowField.velocity.length && gx >= 0 && gx < flowField.velocity[gy].length) {
        const vx = flowField.velocity[gy][gx].x;
        const vy = flowField.velocity[gy][gx].y;

        velocities[i * 2] = velocities[i * 2] * 0.95 + vx * 0.5;
        velocities[i * 2 + 1] = velocities[i * 2 + 1] * 0.95 + vy * 0.5;

        positions[i * 3] += velocities[i * 2];
        positions[i * 3 + 1] += velocities[i * 2 + 1];

        const speed = Math.sqrt(velocities[i * 2] ** 2 + velocities[i * 2 + 1] ** 2);
        const speedNorm = Math.min(1, speed / 0.1);
        colors[i * 3] = speedNorm;
        colors[i * 3 + 1] = 0.5 + 0.5 * (1 - speedNorm);
        colors[i * 3 + 2] = 1 - speedNorm;
      }

      if (positions[i * 3] < 0) positions[i * 3] = width;
      if (positions[i * 3] > width) positions[i * 3] = 0;
      if (positions[i * 3 + 1] < 0) positions[i * 3 + 1] = height;
      if (positions[i * 3 + 1] > height) positions[i * 3 + 1] = 0;
    }

    flowParticlesRef.current.geometry.attributes.position.needsUpdate = true;
    flowParticlesRef.current.geometry.attributes.color.needsUpdate = true;
  };

  const updateAgents = () => {
    if (!sceneRef.current) return;

    for (const agent of agents) {
      let agentMesh = sceneRef.current.getObjectByName(`agent_${agent.id}`) as THREE.Group;

      if (!agentMesh) {
        agentMesh = createAgentMesh(agent);
        sceneRef.current.add(agentMesh);
      }

      const targetX = agent.position.x;
      const targetY = agent.position.y;
      const currentX = agentMesh.position.x;
      const currentY = agentMesh.position.y;

      agentMesh.position.x = currentX + (targetX - currentX) * 0.3;
      agentMesh.position.y = currentY + (targetY - currentY) * 0.3;

      const bodyMesh = agentMesh.getObjectByName('body') as THREE.Mesh;
      if (bodyMesh) {
        const material = bodyMesh.material as THREE.MeshBasicMaterial;
        if (agent.emotion === 'I') {
          material.color.setHex(0xff4444);
        } else if (agent.emotion === 'R') {
          material.color.setHex(0x888888);
        } else {
          material.color.set(agent.color || 0x4a90d9);
        }
      }

      const emotionRing = agentMesh.getObjectByName('emotionRing') as THREE.Mesh;
      if (emotionRing) {
        const material = emotionRing.material as THREE.MeshBasicMaterial;
        material.opacity = agent.frustration * 0.8;
        const scale = 1 + agent.frustration * 0.5;
        emotionRing.scale.set(scale, scale, 1);
      }

      const jitter = agent.frustration > 0.8 ? (Math.random() - 0.5) * 2 : 0;
      agentMesh.rotation.z = jitter * 0.1;
    }

    const agentIds = new Set(agents.map((a) => a.id));
    const toRemove: THREE.Object3D[] = [];

    sceneRef.current.traverse((obj) => {
      if (obj.name?.startsWith('agent_')) {
        const id = obj.name.replace('agent_', '');
        if (!agentIds.has(id)) {
          toRemove.push(obj);
        }
      }
    });

    for (const obj of toRemove) {
      sceneRef.current.remove(obj);
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }
  };

  const createAgentMesh = (agent: Agent): THREE.Group => {
    const group = new THREE.Group();
    group.name = `agent_${agent.id}`;
    group.position.set(agent.position.x, agent.position.y, 3);
    group.userData.type = 'agent';

    const bodyGeometry = new THREE.CircleGeometry(agent.size * 4, 16);
    const bodyMaterial = new THREE.MeshBasicMaterial({
      color: agent.color || 0x4a90d9,
      transparent: true,
      opacity: 0.9,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.name = 'body';
    group.add(body);

    const emotionGeometry = new THREE.RingGeometry(agent.size * 4.5, agent.size * 5.5, 16);
    const emotionMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    const emotionRing = new THREE.Mesh(emotionGeometry, emotionMaterial);
    emotionRing.name = 'emotionRing';
    group.add(emotionRing);

    if (agent.groupId) {
      const indicatorGeometry = new THREE.TorusGeometry(agent.size * 6, 1, 8, 16);
      const indicatorMaterial = new THREE.MeshBasicMaterial({
        color: 0xffd700,
        transparent: true,
        opacity: 0.6,
      });
      const indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
      indicator.name = 'groupIndicator';
      group.add(indicator);
    }

    return group;
  };

  const updateEmployees = () => {
    if (!sceneRef.current) return;

    for (const employee of employees) {
      let empMesh = sceneRef.current.getObjectByName(`employee_${employee.id}`) as THREE.Group;

      if (!empMesh) {
        empMesh = createEmployeeMesh(employee);
        sceneRef.current.add(empMesh);
      }

      empMesh.position.x = employee.position.x;
      empMesh.position.y = employee.position.y;

      const fatigueIndicator = empMesh.getObjectByName('fatigueIndicator') as THREE.Mesh;
      if (fatigueIndicator) {
        const material = fatigueIndicator.material as THREE.MeshBasicMaterial;
        if (employee.fatigue > 0.7) {
          material.color.setHex(0xff0000);
          empMesh.rotation.z = Math.sin(Date.now() * 0.01) * 0.1 * employee.fatigue;
        } else if (employee.fatigue > 0.4) {
          material.color.setHex(0xffa500);
        } else {
          material.color.setHex(0x00ff00);
        }
        material.opacity = 0.3 + employee.fatigue * 0.5;
      }
    }
  };

  const createEmployeeMesh = (employee: Employee): THREE.Group => {
    const group = new THREE.Group();
    group.name = `employee_${employee.id}`;
    group.position.set(employee.position.x, employee.position.y, 2.5);
    group.userData.type = 'employee';

    const bodyGeometry = new THREE.PlaneGeometry(12, 16);
    const bodyMaterial = new THREE.MeshBasicMaterial({
      color: 0x8b4513,
      transparent: true,
      opacity: 0.9,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    group.add(body);

    const fatigueGeometry = new THREE.CircleGeometry(14, 16);
    const fatigueMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.3,
    });
    const fatigueIndicator = new THREE.Mesh(fatigueGeometry, fatigueMaterial);
    fatigueIndicator.name = 'fatigueIndicator';
    fatigueIndicator.position.z = -0.1;
    group.add(fatigueIndicator);

    return group;
  };

  const clearSceneLayer = (scene: THREE.Scene, layerType: string) => {
    const toRemove: THREE.Object3D[] = [];
    scene.traverse((obj) => {
      if (obj.userData.type === layerType) {
        toRemove.push(obj);
      }
    });

    for (const obj of toRemove) {
      scene.remove(obj);
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    />
  );
};

export default HeatMapRenderer;

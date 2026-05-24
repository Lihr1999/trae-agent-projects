import * as THREE from 'three';
import { buildExtrudedGeometry, geoToScene } from '../utils/extrude.js';
import { buildFlyingLine, updateFlyingLine } from '../utils/bezier.js';
import { pickFromEvent } from '../utils/raycast.js';

export class MapScene {
  constructor(container, { onPick, onDrill } = {}) {
    this.container = container;
    this.onPick = onPick;
    this.onDrill = onDrill;
    this.provinceMeshes = [];
    this.flyingLines = [];
    this.hovered = null;
    this.currentLevel = 'province';
    this.currentParentId = null;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050912);
    this.scene.fog = new THREE.Fog(0x050912, 120, 400);

    this.camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 2000);
    this.camera.position.set(0, 80, 80);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    this.scene.add(new THREE.AmbientLight(0x556677, 0.7));
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(50, 100, 50);
    this.scene.add(dir);
    const fill = new THREE.DirectionalLight(0x66aaff, 0.4);
    fill.position.set(-50, 60, -50);
    this.scene.add(fill);

    const grid = new THREE.GridHelper(200, 40, 0x1a2a44, 0x0c1526);
    grid.position.y = -0.01;
    this.scene.add(grid);

    this.provinceGroup = new THREE.Group();
    this.scene.add(this.provinceGroup);

    this.flyGroup = new THREE.Group();
    this.scene.add(this.flyGroup);

    this.clock = new THREE.Clock();
    this.mouse = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();

    this._bind();
    this._animate = this._animate.bind(this);
    this._running = true;
    this._animate();

    window.addEventListener('resize', this._onResize);
  }

  _bind() {
    this._onResize = () => {
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };
    this._onClick = (e) => {
      const hit = pickFromEvent(this.camera, this.renderer.domElement, e, this.provinceMeshes, true);
      if (hit) {
        const obj = this._findUserRoot(hit.object);
        if (obj && obj.userData && obj.userData.region) {
          this.onDrill?.(obj.userData.region);
        }
      }
    };
    this._onMove = (e) => {
      const hit = pickFromEvent(this.camera, this.renderer.domElement, e, this.provinceMeshes, true);
      if (this.hovered) {
        const mat = this.hovered.material;
        if (mat && mat.emissive) mat.emissive.setHex(0x000000);
        this.hovered.scale.y = this.hovered.userData.baseScaleY || 1;
        this.hovered = null;
      }
      if (hit) {
        const obj = this._findUserRoot(hit.object);
        if (obj && obj.userData && obj.userData.region) {
          const mat = obj.material;
          if (mat && mat.emissive) mat.emissive.setHex(0x3388ff);
          obj.userData.baseScaleY = obj.scale.y;
          obj.scale.y = Math.min(3, obj.scale.y * 1.4);
          this.hovered = obj;
          this.onPick?.(obj.userData.region);
        }
      } else {
        this.onPick?.(null);
      }
    };
    this.renderer.domElement.addEventListener('click', this._onClick);
    this.renderer.domElement.addEventListener('mousemove', this._onMove);
  }

  _findUserRoot(obj) {
    let cur = obj;
    while (cur && !cur.userData?.region && cur.parent) cur = cur.parent;
    return cur;
  }

  clearProvinces() {
    this.provinceGroup.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
    while (this.provinceGroup.children.length) this.provinceGroup.remove(this.provinceGroup.children[0]);
    this.provinceMeshes = [];
  }

  clearFlies() {
    this.flyGroup.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
    while (this.flyGroup.children.length) this.flyGroup.remove(this.flyGroup.children[0]);
    this.flyingLines = [];
  }

  loadFeatureCollection(featureCollection, opts = {}) {
    this.clearProvinces();
    const { heightBase = 1.5, heightScale = 0.0004, onComplete } = opts;
    const features = featureCollection?.features || [];
    if (!features.length) {
      onComplete?.();
      return;
    }

    let loaded = 0;
    const target = features.length;

    features.forEach((feature) => {
      const gdp = feature.properties?.gdp || 0;
      const pop = feature.properties?.population || 0;
      const h = heightBase + gdp * heightScale;

      try {
        const geom = buildExtrudedGeometry(feature, h);
        if (!geom) { loaded++; if (loaded >= target) onComplete?.(); return; }
        const mat = new THREE.MeshStandardMaterial({
          vertexColors: true,
          metalness: 0.2,
          roughness: 0.55,
          transparent: true,
          opacity: 0.92,
          emissive: 0x000000,
        });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.userData = { region: { ...feature.properties, center: this._featureCenter(feature) } };
        mesh.userData.baseHeight = h;
        mesh.scale.set(1, 0.001, 1);
        this.provinceGroup.add(mesh);
        this.provinceMeshes.push(mesh);

        const start = performance.now();
        const dur = 700 + Math.random() * 400;
        const rise = () => {
          const t = Math.min(1, (performance.now() - start) / dur);
          const e = 1 - Math.pow(1 - t, 3);
          mesh.scale.y = 0.001 + e * (1 - 0.001);
          if (t < 1) requestAnimationFrame(rise);
        };
        requestAnimationFrame(rise);
      } catch (err) {
        console.warn('Failed to build geometry:', err);
      }
      loaded++;
      if (loaded >= target) onComplete?.();
    });
  }

  _featureCenter(feature) {
    const g = feature.geometry;
    if (!g) return [104, 35];
    const polys = g.type === 'MultiPolygon' ? g.coordinates : [g.coordinates];
    let sx = 0, sy = 0, n = 0;
    polys.forEach((p) => {
      if (!p || !p[0]) return;
      p[0].forEach((pt) => { sx += pt[0]; sy += pt[1]; n++; });
    });
    if (!n) return [104, 35];
    return [sx / n, sy / n];
  }

  loadFlows(flows, regionsMap) {
    this.clearFlies();
    if (!flows || !flows.length) return;
    const maxBatch = 200;
    const batch = flows.slice(0, maxBatch);

    let processed = 0;
    const processChunk = () => {
      const chunkSize = 30;
      const chunk = batch.slice(processed, processed + chunkSize);
      chunk.forEach((f) => {
        const from = regionsMap[f.from_id];
        const to = regionsMap[f.to_id];
        if (!from || !to) return;
        const line = buildFlyingLine(from.center, to.center, 0x00e0ff);
        line.userData = { flow: f };
        this.flyGroup.add(line);
        this.flyingLines.push(line);
      });
      processed += chunkSize;
      if (processed < batch.length) setTimeout(processChunk, 0);
    };
    processChunk();
  }

  drillTo(targetCenter, level, parentId) {
    this.currentLevel = level;
    this.currentParentId = parentId;
    this._animateCameraTo(targetCenter);
  }

  resetToCountry() {
    this.currentLevel = 'province';
    this.currentParentId = null;
    this._animateCameraTo([104, 35], { height: 80, distance: 80 });
  }

  _animateCameraTo(center, opts = {}) {
    const [lng, lat] = center;
    const target = geoToScene([lng, lat]);
    const startPos = this.camera.position.clone();
    const endPos = target.clone().add(new THREE.Vector3(0, opts.height || 50, opts.distance || 50));
    const start = performance.now();
    const dur = 1500;
    const cam = this.camera;
    const tick = () => {
      const t = Math.min(1, (performance.now() - start) / dur);
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      cam.position.lerpVectors(startPos, endPos, e);
      cam.lookAt(target);
      if (t < 1) requestAnimationFrame(tick);
    };
    tick();
  }

  applyPreset(preset) {
    if (!preset) return;
    const center = preset.center || [104, 35];
    const height = preset.cameraHeight || 50;
    this._animateCameraTo(center, { height, distance: height });
  }

  _animate() {
    if (!this._running) return;
    requestAnimationFrame(this._animate);
    const delta = this.clock.getDelta();
    this.flyingLines.forEach((l) => updateFlyingLine(l, delta));

    const t = performance.now() * 0.001;
    this.provinceMeshes.forEach((m) => {
      if (m.material.emissiveIntensity !== undefined) {
        m.material.emissiveIntensity = 0.6 + Math.sin(t * 2 + m.userData.region?.id?.length) * 0.2;
      }
    });

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this._running = false;
    window.removeEventListener('resize', this._onResize);
    this.renderer.domElement.removeEventListener('click', this._onClick);
    this.renderer.domElement.removeEventListener('mousemove', this._onMove);
    this.clearProvinces();
    this.clearFlies();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
  }
}

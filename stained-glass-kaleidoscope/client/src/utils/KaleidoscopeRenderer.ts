import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  KaleidoscopeConfig,
  GlassFragment,
  Material,
  Point,
  Photon,
  CausticPattern
} from '../types';

import kaleidoscopeVertex from '../shaders/kaleidoscopeVertex.glsl?raw';
import kaleidoscopeFragment from '../shaders/kaleidoscopeFragment.glsl?raw';
import causticVertex from '../shaders/causticVertex.glsl?raw';
import causticFragment from '../shaders/causticFragment.glsl?raw';

export class KaleidoscopeRenderer {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private animationId: number | null = null;
  private time: number = 0;

  private kaleidoscopeMesh: THREE.Mesh | null = null;
  private causticPoints: THREE.Points | null = null;
  private fragmentMeshes: Map<string, THREE.Mesh> = new Map();
  private tessellationGroup: THREE.Group = new THREE.Group();

  private kaleidoscopeMaterial: THREE.ShaderMaterial | null = null;
  private causticMaterial: THREE.ShaderMaterial | null = null;

  private config: KaleidoscopeConfig;
  private photons: Photon[] = [];

  constructor(container: HTMLElement, config: KaleidoscopeConfig) {
    this.container = container;
    this.config = config;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a1a);

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.z = 3;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    this.setupLighting();
    this.createKaleidoscopeShader();
    this.createCausticShader();
    this.scene.add(this.tessellationGroup);

    window.addEventListener('resize', this.onResize.bind(this));
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0xffffff, 1, 100);
    pointLight1.position.set(5, 5, 5);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xaaaaaa, 0.5, 100);
    pointLight2.position.set(-5, -5, 5);
    this.scene.add(pointLight2);
  }

  private createKaleidoscopeShader(): void {
    this.kaleidoscopeMaterial = new THREE.ShaderMaterial({
      vertexShader: kaleidoscopeVertex,
      fragmentShader: kaleidoscopeFragment,
      uniforms: {
        uTime: { value: 0 },
        uAnimationSpeed: { value: this.config.animationSpeed },
        uCausticIntensity: { value: this.config.causticIntensity },
        uInterferenceStrength: { value: this.config.interferenceStrength },
        uMirrorCount: { value: this.config.spaceGroup.mirrorCount },
        uMirrorAngle: { value: this.config.spaceGroup.mirrorAngle },
        uGlassColor: { value: new THREE.Color(0x88ccff) },
        uRefractiveIndex: { value: 1.52 },
        uDispersionCoefficient: { value: 0.01 }
      },
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });

    const geometry = new THREE.CircleGeometry(2, 256);
    this.kaleidoscopeMesh = new THREE.Mesh(geometry, this.kaleidoscopeMaterial);
    this.scene.add(this.kaleidoscopeMesh);
  }

  private createCausticShader(): void {
    this.causticMaterial = new THREE.ShaderMaterial({
      vertexShader: causticVertex,
      fragmentShader: causticFragment,
      uniforms: {
        uPointSize: { value: 8.0 },
        uResolution: { value: new THREE.Vector2(this.container.clientWidth, this.container.clientHeight) },
        uCausticIntensity: { value: this.config.causticIntensity }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
  }

  public updateConfig(config: Partial<KaleidoscopeConfig>): void {
    this.config = { ...this.config, ...config };

    if (this.kaleidoscopeMaterial) {
      this.kaleidoscopeMaterial.uniforms.uAnimationSpeed.value = this.config.animationSpeed;
      this.kaleidoscopeMaterial.uniforms.uCausticIntensity.value = this.config.causticIntensity;
      this.kaleidoscopeMaterial.uniforms.uInterferenceStrength.value = this.config.interferenceStrength;
      this.kaleidoscopeMaterial.uniforms.uMirrorCount.value = this.config.spaceGroup.mirrorCount;
      this.kaleidoscopeMaterial.uniforms.uMirrorAngle.value = this.config.spaceGroup.mirrorAngle;
    }

    if (this.causticMaterial) {
      this.causticMaterial.uniforms.uCausticIntensity.value = this.config.causticIntensity;
    }
  }

  public updatePhotons(photons: Photon[], causticPattern: CausticPattern | null): void {
    this.photons = photons;

    if (causticPattern && causticPattern.positions.length > 0) {
      this.createCausticPoints(causticPattern);
    }
  }

  private createCausticPoints(causticPattern: CausticPattern): void {
    if (this.causticPoints) {
      this.scene.remove(this.causticPoints);
      this.causticPoints.geometry.dispose();
    }

    const geometry = new THREE.BufferGeometry();
    const count = Math.min(causticPattern.positions.length, 5000);

    const positions = new Float32Array(count * 2);
    const intensities = new Float32Array(count);
    const wavelengths = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const pos = causticPattern.positions[i];
      positions[i * 2] = pos.x;
      positions[i * 2 + 1] = pos.y;
      intensities[i] = causticPattern.intensities[i];
      wavelengths[i] = causticPattern.wavelengths[i];
    }

    geometry.setAttribute('aPhotonPosition', new THREE.BufferAttribute(positions, 2));
    geometry.setAttribute('aPhotonIntensity', new THREE.BufferAttribute(intensities, 1));
    geometry.setAttribute('aPhotonWavelength', new THREE.BufferAttribute(wavelengths, 1));

    if (this.causticMaterial) {
      this.causticPoints = new THREE.Points(geometry, this.causticMaterial);
      this.scene.add(this.causticPoints);
    }
  }

  public updateFragments(fragments: GlassFragment[], materials: Material[]): void {
    for (const [id, mesh] of this.fragmentMeshes) {
      this.tessellationGroup.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.fragmentMeshes.clear();

    const materialMap = new Map(materials.map(m => [m.id, m]));

    for (const fragment of fragments) {
      const mesh = this.createFragmentMesh(fragment, materialMap);
      if (mesh) {
        this.fragmentMeshes.set(fragment.id, mesh);
        this.tessellationGroup.add(mesh);
      }
    }
  }

  private createFragmentMesh(fragment: GlassFragment, materials: Map<string, Material>): THREE.Mesh | null {
    if (fragment.vertices.length < 3) return null;

    const material = materials.get(fragment.materialId);
    if (!material) return null;

    const shape = new THREE.Shape();
    shape.moveTo(fragment.vertices[0].x, fragment.vertices[0].y);

    for (let i = 1; i < fragment.vertices.length; i++) {
      shape.lineTo(fragment.vertices[i].x, fragment.vertices[i].y);
    }
    shape.closePath();

    const geometry = new THREE.ShapeGeometry(shape);

    const meshMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(material.color.r, material.color.g, material.color.b),
      transparent: true,
      opacity: 0.8,
      roughness: material.roughness,
      metalness: 0.1,
      transmission: 0.9,
      thickness: 0.5,
      ior: material.refractiveIndex,
      clearcoat: 0.3,
      clearcoatRoughness: 0.2
    });

    const mesh = new THREE.Mesh(geometry, meshMaterial);
    mesh.position.z = 0.01;

    return mesh;
  }

  public updateTessellation(cells: Point[][]): void {
    while (this.tessellationGroup.children.length > this.fragmentMeshes.size) {
      const child = this.tessellationGroup.children[this.tessellationGroup.children.length - 1];
      this.tessellationGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    }

    const baseMeshes = Array.from(this.fragmentMeshes.values());

    for (let i = 1; i < cells.length; i++) {
      const cell = cells[i];
      if (cell.length < 3) continue;

      const shape = new THREE.Shape();
      shape.moveTo(cell[0].x, cell[0].y);

      for (let j = 1; j < cell.length; j++) {
        shape.lineTo(cell[j].x, cell[j].y);
      }
      shape.closePath();

      const geometry = new THREE.ShapeGeometry(shape);
      const material = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color().setHSL(i / cells.length, 0.7, 0.5),
        transparent: true,
        opacity: 0.6,
        roughness: 0.2,
        metalness: 0.1,
        transmission: 0.8,
        thickness: 0.3,
        ior: 1.5
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.z = 0.02 + i * 0.001;
      this.tessellationGroup.add(mesh);
    }
  }

  public startAnimation(): void {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      this.time += 0.016 * this.config.animationSpeed;

      if (this.kaleidoscopeMaterial) {
        this.kaleidoscopeMaterial.uniforms.uTime.value = this.time;
      }

      this.tessellationGroup.rotation.z = Math.sin(this.time * 0.2) * 0.1;

      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }

  public stopAnimation(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private onResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);

    if (this.causticMaterial) {
      this.causticMaterial.uniforms.uResolution.value.set(width, height);
    }
  }

  public dispose(): void {
    this.stopAnimation();
    window.removeEventListener('resize', this.onResize.bind(this));

    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }

  public getDomElement(): HTMLCanvasElement {
    return this.renderer.domElement;
  }
}

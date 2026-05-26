import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

import vertexShader from '../shaders/vertexShader.glsl?raw';
import fragmentShader from '../shaders/fragmentShader.glsl?raw';

import type { CloudRenderParams } from '../types';
import { CloudParticleSystem } from './particles';
import { getWebGLInfo } from './webgl';

export class VolumetricCloudRenderer {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private composer: EffectComposer;
  private cloudMaterial: THREE.ShaderMaterial;
  private cloudMesh: THREE.Mesh;
  private particleSystem: CloudParticleSystem;
  private animationId: number | null = null;
  private lastTime: number = 0;
  private frameCount: number = 0;
  private fpsUpdateTime: number = 0;
  private currentFps: number = 60;
  private params: CloudRenderParams;
  private onPerformanceUpdate: ((fps: number, frameTime: number) => void) | null = null;
  private onError: ((error: string) => void) | null = null;
  private isPaused: boolean = false;
  private webglInfo = getWebGLInfo();
  private useFallback: boolean = false;
  private targetResolution: THREE.Vector2;
  private memoryUsage: number = 0;

  constructor(container: HTMLElement, params: CloudRenderParams) {
    this.container = container;
    this.params = params;
    this.targetResolution = new THREE.Vector2();

    this.checkWebGLSupport();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0e27);
    this.scene.fog = new THREE.FogExp2(0x0a0e27, 0.0002);

    const width = container.clientWidth;
    const height = container.clientHeight;

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100000);
    this.camera.position.set(0, params.cloudHeight + 500, 2000);
    this.camera.lookAt(0, params.cloudHeight, 0);

    const pixelRatio = Math.min(window.devicePixelRatio, params.renderScale);
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.useFallback,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.minDistance = 500;
    this.controls.maxDistance = 10000;
    this.controls.target.set(0, params.cloudHeight, 0);

    this.cloudMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uCameraPos: { value: this.camera.position },
        uCameraDir: { value: new THREE.Vector3(0, 0, -1) },
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(width, height) },
        uInvProjectionMatrix: { value: new THREE.Matrix4() },
        uInvViewMatrix: { value: new THREE.Matrix4() },
        uCloudDensity: { value: params.cloudDensity },
        uCloudThickness: { value: params.cloudThickness },
        uCloudCoverage: { value: params.cloudCoverage },
        uCloudHeight: { value: params.cloudHeight },
        uLightIntensity: { value: params.lightIntensity },
        uScatterCoeff: { value: params.scatterCoeff },
        uSunHeight: { value: params.sunHeight },
        uSunAzimuth: { value: params.sunAzimuth },
        uWindSpeed: { value: params.windSpeed },
        uWindDirection: { value: params.windDirection },
        uParticleSpeed: { value: params.particleSpeed },
        uSampleCount: { value: params.sampleCount },
        uRenderScale: { value: params.renderScale },
        uTransitionProgress: { value: 1.0 },
        uNoiseVisualization: { value: false },
        uFogDensity: { value: 0.0001 },
        uPreviousParams: { value: new Array(8).fill(new THREE.Vector3()) },
        uTargetParams: { value: new Array(8).fill(new THREE.Vector3()) }
      }
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    this.cloudMesh = new THREE.Mesh(geometry, this.cloudMaterial);
    this.cloudMesh.frustumCulled = false;
    this.scene.add(this.cloudMesh);

    this.particleSystem = new CloudParticleSystem(this.scene, params, 500);

    this.composer = new EffectComposer(this.renderer);
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(width, height);

    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      0.5,
      0.4,
      0.85
    );
    this.composer.addPass(bloomPass);

    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);

    this.calculateMemoryUsage();

    window.addEventListener('resize', this.handleResize);
  }

  private checkWebGLSupport() {
    if (!this.webglInfo.webgl2) {
      this.useFallback = true;
      if (this.onError) {
        this.onError('WebGL 2.0 not supported. Using fallback renderer with reduced quality.');
      }
    }

    if (!this.webglInfo.webglCompute) {
      console.warn('WebGL Compute not supported. Using fragment shader fallback.');
    }
  }

  private calculateMemoryUsage() {
    const { noiseResolution } = this.params;
    const texture3DSize = noiseResolution * noiseResolution * noiseResolution * 4;
    const framebufferSize = this.renderer.domElement.width * this.renderer.domElement.height * 4 * 2;
    this.memoryUsage = (texture3DSize + framebufferSize) / (1024 * 1024);
  }

  setParams(newParams: Partial<CloudRenderParams>) {
    this.params = { ...this.params, ...newParams };

    const uniforms = this.cloudMaterial.uniforms;
    if (newParams.cloudDensity !== undefined) uniforms.uCloudDensity.value = newParams.cloudDensity;
    if (newParams.cloudThickness !== undefined) uniforms.uCloudThickness.value = newParams.cloudThickness;
    if (newParams.cloudCoverage !== undefined) uniforms.uCloudCoverage.value = newParams.cloudCoverage;
    if (newParams.cloudHeight !== undefined) uniforms.uCloudHeight.value = newParams.cloudHeight;
    if (newParams.lightIntensity !== undefined) uniforms.uLightIntensity.value = newParams.lightIntensity;
    if (newParams.scatterCoeff !== undefined) uniforms.uScatterCoeff.value = newParams.scatterCoeff;
    if (newParams.sunHeight !== undefined) uniforms.uSunHeight.value = newParams.sunHeight;
    if (newParams.sunAzimuth !== undefined) uniforms.uSunAzimuth.value = newParams.sunAzimuth;
    if (newParams.windSpeed !== undefined) uniforms.uWindSpeed.value = newParams.windSpeed;
    if (newParams.windDirection !== undefined) uniforms.uWindDirection.value = newParams.windDirection;
    if (newParams.particleSpeed !== undefined) uniforms.uParticleSpeed.value = newParams.particleSpeed;
    if (newParams.sampleCount !== undefined) uniforms.uSampleCount.value = newParams.sampleCount;
    if (newParams.renderScale !== undefined) {
      uniforms.uRenderScale.value = newParams.renderScale;
      const pixelRatio = Math.min(window.devicePixelRatio, newParams.renderScale);
      this.renderer.setPixelRatio(pixelRatio);
      this.composer.setPixelRatio(pixelRatio);
    }
    if (newParams.transitionProgress !== undefined) uniforms.uTransitionProgress.value = newParams.transitionProgress;
    if (newParams.noiseVisualization !== undefined) uniforms.uNoiseVisualization.value = newParams.noiseVisualization;

    if (newParams.windSpeed !== undefined || newParams.windDirection !== undefined) {
      this.particleSystem.setWindDeformation(this.params.windSpeed, this.params.windDirection);
    }

    this.calculateMemoryUsage();
    this.checkMemoryLimits();
  }

  private checkMemoryLimits() {
    const vramEstimate = this.webglInfo.estimatedVRAM;
    const usagePercent = (this.memoryUsage / vramEstimate) * 100;

    if (usagePercent > 80 && this.onError) {
      this.onError(`High memory usage: ${usagePercent.toFixed(1)}% of estimated VRAM. Consider reducing render scale or noise resolution.`);
    }

    if (usagePercent > 95) {
      const newScale = Math.max(0.25, this.params.renderScale * 0.75);
      this.setParams({ renderScale: newScale });
      if (this.onError) {
        this.onError('Critical memory limit reached! Auto-reducing render scale to prevent crash.');
      }
    }
  }

  start() {
    this.lastTime = performance.now();
    this.animate();
  }

  stop() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
    this.lastTime = performance.now();
  }

  private animate = () => {
    this.animationId = requestAnimationFrame(this.animate);

    if (this.isPaused) return;

    const currentTime = performance.now();
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    this.frameCount++;
    if (currentTime - this.fpsUpdateTime >= 500) {
      this.currentFps = Math.round((this.frameCount * 1000) / (currentTime - this.fpsUpdateTime));
      const frameTime = 1000 / this.currentFps;
      if (this.onPerformanceUpdate) {
        this.onPerformanceUpdate(this.currentFps, frameTime);
      }
      this.frameCount = 0;
      this.fpsUpdateTime = currentTime;
    }

    this.cloudMaterial.uniforms.uTime.value = currentTime;
    this.cloudMaterial.uniforms.uCameraPos.value.copy(this.camera.position);

    const cameraDir = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDir);
    this.cloudMaterial.uniforms.uCameraDir.value.copy(cameraDir);

    this.camera.updateMatrixWorld();
    this.cloudMaterial.uniforms.uInvProjectionMatrix.value.copy(this.camera.projectionMatrixInverse);
    this.cloudMaterial.uniforms.uInvViewMatrix.value.copy(this.camera.matrixWorld);

    this.particleSystem.update(deltaTime, this.params);

    this.controls.update();
    this.composer.render();
  };

  private handleResize = () => {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
    this.cloudMaterial.uniforms.uResolution.value.set(width, height);

    this.calculateMemoryUsage();
  };

  setOnPerformanceUpdate(callback: (fps: number, frameTime: number) => void) {
    this.onPerformanceUpdate = callback;
  }

  setOnError(callback: (error: string) => void) {
    this.onError = callback;
  }

  getMemoryUsage(): number {
    return this.memoryUsage;
  }

  getFps(): number {
    return this.currentFps;
  }

  getWebGLInfo() {
    return this.webglInfo;
  }

  isFallbackMode(): boolean {
    return this.useFallback;
  }

  dispose() {
    this.stop();
    window.removeEventListener('resize', this.handleResize);

    this.particleSystem.dispose();

    this.cloudMaterial.dispose();
    this.cloudMesh.geometry.dispose();

    this.composer.dispose();
    this.renderer.dispose();

    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

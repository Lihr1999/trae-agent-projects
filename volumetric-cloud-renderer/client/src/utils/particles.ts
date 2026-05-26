import * as THREE from 'three';
import type { CloudRenderParams } from '../types';

export class CloudParticleSystem {
  private scene: THREE.Scene;
  private particles: THREE.Points;
  private particleCount: number;
  private positions: Float32Array;
  private velocities: Float32Array;
  private originalPositions: Float32Array;
  private params: CloudRenderParams;
  private time: number = 0;

  constructor(scene: THREE.Scene, params: CloudRenderParams, count: number = 500) {
    this.scene = scene;
    this.particleCount = count;
    this.params = params;

    const geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(count * 3);
    this.velocities = new Float32Array(count * 3);
    this.originalPositions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const angle = Math.random() * Math.PI * 2;
      const radius = 500 + Math.random() * 1500;
      const height = params.cloudHeight - 1000 + Math.random() * 2000;

      this.positions[i3] = Math.cos(angle) * radius;
      this.positions[i3 + 1] = height;
      this.positions[i3 + 2] = Math.sin(angle) * radius;

      this.originalPositions[i3] = this.positions[i3];
      this.originalPositions[i3 + 1] = this.positions[i3 + 1];
      this.originalPositions[i3 + 2] = this.positions[i3 + 2];

      this.velocities[i3] = (Math.random() - 0.5) * 0.5;
      this.velocities[i3 + 1] = (Math.random() - 0.5) * 0.2;
      this.velocities[i3 + 2] = (Math.random() - 0.5) * 0.5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 8,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.particles = new THREE.Points(geometry, material);
    this.particles.visible = params.particleSpeed > 0;
    this.scene.add(this.particles);
  }

  update(deltaTime: number, params: CloudRenderParams) {
    this.params = params;
    this.time += deltaTime;

    this.particles.visible = params.particleSpeed > 0;
    if (!this.particles.visible) return;

    const windRad = (params.windDirection * Math.PI) / 180;
    const windX = Math.cos(windRad) * params.windSpeed * 0.01 * params.particleSpeed;
    const windZ = Math.sin(windRad) * params.windSpeed * 0.01 * params.particleSpeed;

    const positions = this.particles.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;

      positions[i3] += this.velocities[i3] * deltaTime * 60 + windX * deltaTime;
      positions[i3 + 1] += this.velocities[i3 + 1] * deltaTime * 30;
      positions[i3 + 2] += this.velocities[i3 + 2] * deltaTime * 60 + windZ * deltaTime;

      const noiseOffset = Math.sin(this.time * 0.5 + i * 0.1) * 0.5;
      positions[i3 + 1] += noiseOffset * deltaTime * 5;

      const cloudBottom = params.cloudHeight - (params.cloudThickness * 400) * 0.5;
      const cloudTop = params.cloudHeight + (params.cloudThickness * 400) * 0.5;

      if (positions[i3 + 1] < cloudBottom || positions[i3 + 1] > cloudTop) {
        positions[i3] = this.originalPositions[i3] + (Math.random() - 0.5) * 100;
        positions[i3 + 1] = params.cloudHeight + (Math.random() - 0.5) * (params.cloudThickness * 300);
        positions[i3 + 2] = this.originalPositions[i3 + 2] + (Math.random() - 0.5) * 100;
      }

      const dist = Math.sqrt(positions[i3] ** 2 + positions[i3 + 2] ** 2);
      if (dist > 3000) {
        const angle = Math.atan2(positions[i3 + 2], positions[i3]);
        positions[i3] = Math.cos(angle) * 500;
        positions[i3 + 2] = Math.sin(angle) * 500;
      }
    }

    this.particles.geometry.attributes.position.needsUpdate = true;

    const particleOpacity = Math.min(0.6, params.particleSpeed * 0.05);
    (this.particles.material as THREE.PointsMaterial).opacity = particleOpacity;
    (this.particles.material as THREE.PointsMaterial).size = 6 + params.particleSpeed;
  }

  setWindDeformation(windSpeed: number, windDirection: number) {
    const positions = this.particles.geometry.attributes.position.array as Float32Array;
    const windRad = (windDirection * Math.PI) / 180;
    const deformationAmount = windSpeed * 0.5;

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const heightFactor = (positions[i3 + 1] - (this.params.cloudHeight - this.params.cloudThickness * 200)) / (this.params.cloudThickness * 400);
      const factor = Math.max(0, Math.min(1, heightFactor));

      positions[i3] += Math.cos(windRad) * deformationAmount * factor;
      positions[i3 + 2] += Math.sin(windRad) * deformationAmount * factor;
    }

    this.particles.geometry.attributes.position.needsUpdate = true;
  }

  dispose() {
    this.scene.remove(this.particles);
    this.particles.geometry.dispose();
    (this.particles.material as THREE.Material).dispose();
  }
}

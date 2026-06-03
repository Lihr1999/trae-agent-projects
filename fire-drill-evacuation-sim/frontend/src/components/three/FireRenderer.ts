import * as THREE from 'three'
import type { FireIncident } from '../../types'

const FIRE_VERTEX_SHADER = `
  attribute float aSize;
  attribute float aLife;
  attribute vec3 aColor;
  varying float vLife;
  varying vec3 vColor;
  void main() {
    vLife = aLife;
    vColor = aColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (200.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const FIRE_FRAGMENT_SHADER = `
  varying float vLife;
  varying vec3 vColor;
  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float alpha = (1.0 - dist * 2.0) * vLife;
    gl_FragColor = vec4(vColor, alpha);
  }
`

const SMOKE_VERTEX_SHADER = `
  attribute float aSize;
  attribute float aLife;
  varying float vLife;
  void main() {
    vLife = aLife;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (250.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const SMOKE_FRAGMENT_SHADER = `
  varying float vLife;
  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float alpha = (1.0 - dist * 2.0) * vLife * 0.4;
    gl_FragColor = vec4(0.5, 0.5, 0.5, alpha);
  }
`

interface FireParticleData {
  positions: Float32Array
  colors: Float32Array
  sizes: Float32Array
  lives: Float32Array
  velocities: Float32Array
  count: number
  maxLife: Float32Array
}

interface SmokeParticleData {
  positions: Float32Array
  sizes: Float32Array
  lives: Float32Array
  velocities: Float32Array
  count: number
  maxLife: Float32Array
}

export class FireRenderer {
  private fireEffects: Map<number, THREE.Group> = new Map()
  private fireParticleData: Map<number, FireParticleData> = new Map()
  private smokeParticleData: Map<number, SmokeParticleData> = new Map()

  createFireEffect(fire: FireIncident): THREE.Group {
    const group = new THREE.Group()
    group.userData = { type: 'fire', id: fire.id }

    const particleCount = fire.fire_level * 120
    const fireParticles = this.createFireParticles(particleCount, fire)
    group.add(fireParticles)

    const smokeCount = fire.fire_level * 60
    const smokeParticles = this.createSmokeParticles(smokeCount, fire)
    group.add(smokeParticles)

    const radiusVis = this.createRadiusVisualization(fire)
    group.add(radiusVis)

    const light = new THREE.PointLight(0xff6600, fire.fire_level * 0.5, fire.affected_radius * 2)
    light.position.set(0, 3, 0)
    group.add(light)

    group.position.set(fire.position_x, fire.position_y, fire.position_z)
    this.fireEffects.set(fire.id, group)
    return group
  }

  private createFireParticles(count: number, fire: FireIncident): THREE.Points {
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const lives = new Float32Array(count)
    const velocities = new Float32Array(count * 3)
    const maxLife = new Float32Array(count)

    const baseSize = 1.5 + fire.fire_level * 0.5

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * fire.affected_radius * 0.3
      positions[i * 3 + 1] = Math.random() * 2
      positions[i * 3 + 2] = (Math.random() - 0.5) * fire.affected_radius * 0.3

      velocities[i * 3] = (Math.random() - 0.5) * 0.5
      velocities[i * 3 + 1] = 1 + Math.random() * 2
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.5

      maxLife[i] = 0.5 + Math.random() * 1.5
      lives[i] = Math.random()

      const t = lives[i]
      if (t < 0.33) {
        colors[i * 3] = 1.0
        colors[i * 3 + 1] = 0.2
        colors[i * 3 + 2] = 0.0
      } else if (t < 0.66) {
        colors[i * 3] = 1.0
        colors[i * 3 + 1] = 0.5
        colors[i * 3 + 2] = 0.0
      } else {
        colors[i * 3] = 1.0
        colors[i * 3 + 1] = 0.9
        colors[i * 3 + 2] = 0.3
      }

      sizes[i] = baseSize * (0.5 + Math.random())
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    geometry.setAttribute('aLife', new THREE.BufferAttribute(lives, 1))

    const material = new THREE.ShaderMaterial({
      vertexShader: FIRE_VERTEX_SHADER,
      fragmentShader: FIRE_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

    const points = new THREE.Points(geometry, material)
    points.userData = { type: 'fire_particles' }

    this.fireParticleData.set(fire.id, {
      positions,
      colors,
      sizes,
      lives,
      velocities,
      count,
      maxLife,
    })

    return points
  }

  private createSmokeParticles(count: number, fire: FireIncident): THREE.Points {
    const positions = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const lives = new Float32Array(count)
    const velocities = new Float32Array(count * 3)
    const maxLife = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * fire.affected_radius * 0.4
      positions[i * 3 + 1] = 3 + Math.random() * 5
      positions[i * 3 + 2] = (Math.random() - 0.5) * fire.affected_radius * 0.4

      velocities[i * 3] = (Math.random() - 0.5) * 0.3
      velocities[i * 3 + 1] = 0.5 + Math.random() * 1.0
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.3

      maxLife[i] = 1.0 + Math.random() * 2.0
      lives[i] = Math.random()
      sizes[i] = 3 + Math.random() * 4
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    geometry.setAttribute('aLife', new THREE.BufferAttribute(lives, 1))

    const material = new THREE.ShaderMaterial({
      vertexShader: SMOKE_VERTEX_SHADER,
      fragmentShader: SMOKE_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
    })

    const points = new THREE.Points(geometry, material)
    points.userData = { type: 'smoke_particles' }

    this.smokeParticleData.set(fire.id, {
      positions,
      sizes,
      lives,
      velocities,
      count,
      maxLife,
    })

    return points
  }

  private createRadiusVisualization(fire: FireIncident): THREE.Mesh {
    const radius = Math.max(fire.affected_radius, 1)
    const geometry = new THREE.CylinderGeometry(radius, radius, 0.1, 32)
    const material = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.y = 0.1
    mesh.userData = { type: 'fire_radius' }
    return mesh
  }

  update(delta: number): void {
    this.fireParticleData.forEach((data, id) => {
      const group = this.fireEffects.get(id)
      if (!group) return

      const firePoints = group.children.find((c) => c.userData.type === 'fire_particles') as THREE.Points | undefined
      if (!firePoints) return

      const posAttr = firePoints.geometry.getAttribute('position') as THREE.BufferAttribute
      const lifeAttr = firePoints.geometry.getAttribute('aLife') as THREE.BufferAttribute
      const colorAttr = firePoints.geometry.getAttribute('aColor') as THREE.BufferAttribute

      for (let i = 0; i < data.count; i++) {
        data.lives[i] -= delta / data.maxLife[i]

        if (data.lives[i] <= 0) {
          data.lives[i] = 1.0
          data.positions[i * 3] = (Math.random() - 0.5) * 3
          data.positions[i * 3 + 1] = 0
          data.positions[i * 3 + 2] = (Math.random() - 0.5) * 3
          data.velocities[i * 3] = (Math.random() - 0.5) * 0.5
          data.velocities[i * 3 + 1] = 1 + Math.random() * 2
          data.velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.5
        }

        data.positions[i * 3] += data.velocities[i * 3] * delta
        data.positions[i * 3 + 1] += data.velocities[i * 3 + 1] * delta
        data.positions[i * 3 + 2] += data.velocities[i * 3 + 2] * delta

        const t = data.lives[i]
        if (t < 0.33) {
          data.colors[i * 3] = 1.0
          data.colors[i * 3 + 1] = 0.2 * t * 3
          data.colors[i * 3 + 2] = 0.0
        } else if (t < 0.66) {
          data.colors[i * 3] = 1.0
          data.colors[i * 3 + 1] = 0.2 + 0.3 * ((t - 0.33) / 0.33)
          data.colors[i * 3 + 2] = 0.0
        } else {
          data.colors[i * 3] = 1.0
          data.colors[i * 3 + 1] = 0.5 + 0.4 * ((t - 0.66) / 0.34)
          data.colors[i * 3 + 2] = 0.3 * ((t - 0.66) / 0.34)
        }

        posAttr.setXYZ(i, data.positions[i * 3], data.positions[i * 3 + 1], data.positions[i * 3 + 2])
        lifeAttr.setX(i, data.lives[i])
        colorAttr.setXYZ(i, data.colors[i * 3], data.colors[i * 3 + 1], data.colors[i * 3 + 2])
      }

      posAttr.needsUpdate = true
      lifeAttr.needsUpdate = true
      colorAttr.needsUpdate = true
    })

    this.smokeParticleData.forEach((data, id) => {
      const group = this.fireEffects.get(id)
      if (!group) return

      const smokePoints = group.children.find((c) => c.userData.type === 'smoke_particles') as THREE.Points | undefined
      if (!smokePoints) return

      const posAttr = smokePoints.geometry.getAttribute('position') as THREE.BufferAttribute
      const lifeAttr = smokePoints.geometry.getAttribute('aLife') as THREE.BufferAttribute
      const sizeAttr = smokePoints.geometry.getAttribute('aSize') as THREE.BufferAttribute

      for (let i = 0; i < data.count; i++) {
        data.lives[i] -= delta / data.maxLife[i]

        if (data.lives[i] <= 0) {
          data.lives[i] = 1.0
          data.positions[i * 3] = (Math.random() - 0.5) * 4
          data.positions[i * 3 + 1] = 3
          data.positions[i * 3 + 2] = (Math.random() - 0.5) * 4
          data.velocities[i * 3] = (Math.random() - 0.5) * 0.3
          data.velocities[i * 3 + 1] = 0.5 + Math.random() * 1.0
          data.velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.3
        }

        data.positions[i * 3] += data.velocities[i * 3] * delta
        data.positions[i * 3 + 1] += data.velocities[i * 3 + 1] * delta
        data.positions[i * 3 + 2] += data.velocities[i * 3 + 2] * delta

        data.sizes[i] = 3 + (1 - data.lives[i]) * 6

        posAttr.setXYZ(i, data.positions[i * 3], data.positions[i * 3 + 1], data.positions[i * 3 + 2])
        lifeAttr.setX(i, data.lives[i])
        sizeAttr.setX(i, data.sizes[i])
      }

      posAttr.needsUpdate = true
      lifeAttr.needsUpdate = true
      sizeAttr.needsUpdate = true
    })
  }

  updateFireEffect(mesh: THREE.Object3D, fire: FireIncident): void {
    const light = mesh.children.find((c) => c instanceof THREE.PointLight) as THREE.PointLight | undefined
    if (light) {
      light.intensity = fire.fire_level * 0.5
      light.distance = fire.affected_radius * 2
    }

    const radiusVis = mesh.children.find((c) => c.userData.type === 'fire_radius') as THREE.Mesh | undefined
    if (radiusVis) {
      const oldGeom = radiusVis.geometry as THREE.CylinderGeometry
      const newRadius = Math.max(fire.affected_radius, 1)
      if (Math.abs(oldGeom.parameters.radiusTop - newRadius) > 0.1) {
        radiusVis.geometry.dispose()
        radiusVis.geometry = new THREE.CylinderGeometry(newRadius, newRadius, 0.1, 32)
      }

      const mat = radiusVis.material as THREE.MeshStandardMaterial
      if (fire.status === 'contained') {
        mat.opacity = 0.1
        mat.color.setHex(0xff8800)
      } else if (fire.status === 'extinguished') {
        mat.opacity = 0.05
        mat.color.setHex(0x888888)
      } else {
        mat.opacity = 0.15
        mat.color.setHex(0xff0000)
      }
      mat.needsUpdate = true
    }

    if (fire.status === 'extinguished') {
      const firePoints = mesh.children.find((c) => c.userData.type === 'fire_particles') as THREE.Points | undefined
      if (firePoints) {
        firePoints.visible = false
      }
      const smokePoints = mesh.children.find((c) => c.userData.type === 'smoke_particles') as THREE.Points | undefined
      if (smokePoints) {
        smokePoints.visible = false
      }
    }
  }

  createSmokeEffect(position: THREE.Vector3, intensity: number): THREE.Points {
    const count = Math.floor(intensity * 50)
    const positions = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const lives = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 4
      positions[i * 3 + 1] = Math.random() * 8
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4
      sizes[i] = 2 + Math.random() * 5
      lives[i] = Math.random()
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    geometry.setAttribute('aLife', new THREE.BufferAttribute(lives, 1))

    const material = new THREE.ShaderMaterial({
      vertexShader: SMOKE_VERTEX_SHADER,
      fragmentShader: SMOKE_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
    })

    const points = new THREE.Points(geometry, material)
    points.position.copy(position)
    return points
  }

  getFireEffect(id: number): THREE.Group | undefined {
    return this.fireEffects.get(id)
  }

  removeFireEffect(id: number): void {
    this.fireEffects.delete(id)
    this.fireParticleData.delete(id)
    this.smokeParticleData.delete(id)
  }

  disposeMesh(group: THREE.Group): void {
    group.traverse((child) => {
      if ((child as any).geometry) {
        ;(child as any).geometry.dispose()
      }
      if ((child as any).material) {
        if ((child as any).material.uniforms) {
          Object.values((child as any).material.uniforms).forEach((u: any) => {
            if (u.value && u.value.dispose) u.value.dispose()
          })
        }
        ;(child as any).material.dispose()
      }
    })
  }
}

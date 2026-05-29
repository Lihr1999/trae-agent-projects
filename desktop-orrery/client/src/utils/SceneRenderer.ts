import * as THREE from 'three'
import { OrbitControls } from './OrbitControls'
import type { Body, Vector3, CollisionEvent, SimulationConfig } from '../types'

export class SceneRenderer {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private controls: OrbitControls
  private container: HTMLElement

  private bodyMeshes: Map<string, THREE.Mesh> = new Map()
  private trailLines: Map<string, THREE.Line> = new Map()
  private labels: Map<string, HTMLDivElement> = new Map()

  private potentialField: THREE.Mesh | null = null
  private particles: THREE.Points | null = null
  private particleVelocities: Vector3[] = []

  private ambientLight: THREE.AmbientLight
  private sunLight: THREE.PointLight

  private stars: THREE.Points

  private clock: THREE.Clock
  private animationId: number | null = null

  private onFrameCallback: (() => void) | null = null

  constructor(container: HTMLElement) {
    this.container = container

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x0a0a1a)
    this.scene.fog = new THREE.FogExp2(0x0a0a1a, 0.0008)

    const aspect = container.clientWidth / container.clientHeight
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.001, 100000)
    this.camera.position.set(0, 50, 100)

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.2

    container.appendChild(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.minDistance = 0.1
    this.controls.maxDistance = 5000

    this.ambientLight = new THREE.AmbientLight(0x404050, 0.5)
    this.scene.add(this.ambientLight)

    this.sunLight = new THREE.PointLight(0xffffff, 2, 2000)
    this.sunLight.position.set(0, 0, 0)
    this.scene.add(this.sunLight)

    this.stars = this.createStarField()
    this.scene.add(this.stars)

    this.createGridHelper()

    this.clock = new THREE.Clock()

    window.addEventListener('resize', this.onResize)
  }

  private createStarField(): THREE.Points {
    const geometry = new THREE.BufferGeometry()
    const vertices: number[] = []
    const colors: number[] = []

    for (let i = 0; i < 10000; i++) {
      const radius = 500 + Math.random() * 1500
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      vertices.push(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      )

      const brightness = 0.5 + Math.random() * 0.5
      const color = new THREE.Color()
      color.setHSL(0.1 + Math.random() * 0.2, 0.2, brightness)
      colors.push(color.r, color.g, color.b)
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))

    const material = new THREE.PointsMaterial({
      size: 1,
      vertexColors: true,
      transparent: true,
      opacity: 0.8
    })

    return new THREE.Points(geometry, material)
  }

  private createGridHelper() {
    const gridSize = 200
    const gridDivisions = 40

    const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x222244, 0x151530)
    gridHelper.position.y = -0.01
    this.scene.add(gridHelper)

    const axesHelper = new THREE.AxesHelper(10)
    this.scene.add(axesHelper)
  }

  public addBody(body: Body) {
    const geometry = new THREE.SphereGeometry(body.radius, 32, 32)
    const color = new THREE.Color(body.color)

    const emissiveIntensity = body.mass > 1e29 ? 0.5 : 0

    const material = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity,
      roughness: 0.7,
      metalness: 0.1
    })

    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(body.position.x, body.position.y, body.position.z)
    mesh.userData = { bodyId: body.id }

    this.scene.add(mesh)
    this.bodyMeshes.set(body.id, mesh)

    this.createTrailLine(body)
    this.createLabel(body)

    if (body.name.toLowerCase() === 'sun' || body.name.toLowerCase().includes('star')) {
      const glowGeometry = new THREE.SphereGeometry(body.radius * 1.5, 32, 32)
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: body.color,
        transparent: true,
        opacity: 0.3,
        side: THREE.BackSide
      })
      const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial)
      glowMesh.position.copy(mesh.position)
      this.scene.add(glowMesh)
    }
  }

  private createTrailLine(body: Body) {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(1000 * 3)
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    const material = new THREE.LineBasicMaterial({
      color: body.color,
      transparent: true,
      opacity: 0.6
    })

    const line = new THREE.Line(geometry, material)
    this.scene.add(line)
    this.trailLines.set(body.id, line)
  }

  private createLabel(body: Body) {
    const label = document.createElement('div')
    label.className = 'body-label'
    label.textContent = body.name
    label.style.cssText = `
      position: absolute;
      color: ${body.color};
      font-size: 11px;
      font-weight: 600;
      text-shadow: 0 0 4px rgba(0,0,0,0.8);
      pointer-events: none;
      white-space: nowrap;
      transform: translate(-50%, -100%);
      margin-top: -8px;
      z-index: 100;
    `
    this.container.appendChild(label)
    this.labels.set(body.id, label)
  }

  public removeBody(id: string) {
    const mesh = this.bodyMeshes.get(id)
    if (mesh) {
      this.scene.remove(mesh)
      mesh.geometry.dispose()
      ;(mesh.material as THREE.Material).dispose()
      this.bodyMeshes.delete(id)
    }

    const trail = this.trailLines.get(id)
    if (trail) {
      this.scene.remove(trail)
      trail.geometry.dispose()
      ;(trail.material as THREE.Material).dispose()
      this.trailLines.delete(id)
    }

    const label = this.labels.get(id)
    if (label) {
      label.remove()
      this.labels.delete(id)
    }
  }

  public updateBody(body: Body, showLabels: boolean) {
    const mesh = this.bodyMeshes.get(body.id)
    if (mesh) {
      mesh.position.set(body.position.x, body.position.y, body.position.z)
    }

    const trail = this.trailLines.get(body.id)
    if (trail && body.trail.length > 1) {
      const positions = trail.geometry.attributes.position.array as Float32Array
      for (let i = 0; i < body.trail.length; i++) {
        positions[i * 3] = body.trail[i].x
        positions[i * 3 + 1] = body.trail[i].y
        positions[i * 3 + 2] = body.trail[i].z
      }
      trail.geometry.attributes.position.needsUpdate = true
      trail.geometry.setDrawRange(0, body.trail.length)
    }

    const label = this.labels.get(body.id)
    if (label && mesh) {
      if (showLabels) {
        const screenPos = mesh.position.clone().project(this.camera)
        const x = (screenPos.x * 0.5 + 0.5) * this.container.clientWidth
        const y = (-screenPos.y * 0.5 + 0.5) * this.container.clientHeight

        if (screenPos.z < 1) {
          label.style.left = `${x}px`
          label.style.top = `${y}px`
          label.style.display = 'block'
        } else {
          label.style.display = 'none'
        }
      } else {
        label.style.display = 'none'
      }
    }
  }

  public updatePotentialField(bodies: Body[], config: SimulationConfig, bounds: { min: Vector3; max: Vector3 }) {
    if (this.potentialField) {
      this.scene.remove(this.potentialField)
      this.potentialField.geometry.dispose()
      ;(this.potentialField.material as THREE.Material).dispose()
    }

    const resolution = 50
    const geometry = new THREE.PlaneGeometry(
      bounds.max.x - bounds.min.x,
      bounds.max.z - bounds.min.z,
      resolution,
      resolution
    )

    const positions = geometry.attributes.position.array as Float32Array
    const colors = new Float32Array(positions.length)

    for (let i = 0; i <= resolution; i++) {
      for (let j = 0; j <= resolution; j++) {
        const idx = i * (resolution + 1) + j
        const x = bounds.min.x + (bounds.max.x - bounds.min.x) * (j / resolution)
        const z = bounds.min.z + (bounds.max.z - bounds.min.z) * (i / resolution)

        let potential = 0
        for (const body of bodies) {
          const dx = x - body.position.x
          const dz = z - body.position.z
          const dy = -body.position.y
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)
          if (distance > 0.001) {
            potential -= (config.gravitationalConstant * body.mass) / distance
          }
        }

        const normalizedPotential = Math.min(Math.max((potential + 1e15) / 1e15, -1), 1)
        positions[idx * 3 + 1] = normalizedPotential * 10

        const color = new THREE.Color()
        color.setHSL(0.6 - normalizedPotential * 0.3, 0.8, 0.5)
        colors[idx * 3] = color.r
        colors[idx * 3 + 1] = color.g
        colors[idx * 3 + 2] = color.b
      }
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.computeVertexNormals()

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      wireframe: false
    })

    this.potentialField = new THREE.Mesh(geometry, material)
    this.potentialField.rotation.x = -Math.PI / 2
    this.potentialField.position.set(
      (bounds.min.x + bounds.max.x) / 2,
      0,
      (bounds.min.z + bounds.max.z) / 2
    )
    this.scene.add(this.potentialField)
  }

  public hidePotentialField() {
    if (this.potentialField) {
      this.potentialField.visible = false
    }
  }

  public showPotentialField() {
    if (this.potentialField) {
      this.potentialField.visible = true
    }
  }

  public createExplosion(position: Vector3, color: string, intensity: number = 1) {
    const particleCount = Math.floor(200 * intensity)
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    const velocities: Vector3[] = []

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = position.x
      positions[i * 3 + 1] = position.y
      positions[i * 3 + 2] = position.z

      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const speed = (0.5 + Math.random()) * intensity

      velocities.push({
        x: speed * Math.sin(phi) * Math.cos(theta),
        y: speed * Math.sin(phi) * Math.sin(theta),
        z: speed * Math.cos(phi)
      })
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    const material = new THREE.PointsMaterial({
      color: new THREE.Color(color),
      size: 0.1 + Math.random() * 0.1,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending
    })

    this.particles = new THREE.Points(geometry, material)
    this.particleVelocities = velocities
    this.scene.add(this.particles)

    setTimeout(() => {
      if (this.particles) {
        this.scene.remove(this.particles)
        this.particles.geometry.dispose()
        ;(this.particles.material as THREE.Material).dispose()
        this.particles = null
        this.particleVelocities = []
      }
    }, 2000)
  }

  public handleEvents(events: CollisionEvent[]) {
    for (const event of events) {
      if (event.type === 'collision') {
        this.createExplosion(event.position, '#ff6644', event.severity * 2)
      } else if (event.type === 'close-encounter') {
        this.createExplosion(event.position, '#44aaff', event.severity * 0.5)
      }
    }
  }

  public setOnFrameCallback(callback: () => void) {
    this.onFrameCallback = callback
  }

  private animate = () => {
    this.animationId = requestAnimationFrame(this.animate)

    const delta = this.clock.getDelta()

    this.controls.update()

    if (this.particles && this.particleVelocities.length > 0) {
      const positions = this.particles.geometry.attributes.position.array as Float32Array
      for (let i = 0; i < this.particleVelocities.length; i++) {
        positions[i * 3] += this.particleVelocities[i].x * delta * 60
        positions[i * 3 + 1] += this.particleVelocities[i].y * delta * 60
        positions[i * 3 + 2] += this.particleVelocities[i].z * delta * 60
      }
      this.particles.geometry.attributes.position.needsUpdate = true

      const material = this.particles.material as THREE.PointsMaterial
      material.opacity = Math.max(0, material.opacity - delta * 0.5)
    }

    this.stars.rotation.y += delta * 0.01

    if (this.onFrameCallback) {
      this.onFrameCallback()
    }

    this.renderer.render(this.scene, this.camera)
  }

  public start() {
    this.animate()
  }

  public stop() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  private onResize = () => {
    const width = this.container.clientWidth
    const height = this.container.clientHeight

    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()

    this.renderer.setSize(width, height)
  }

  public focusOnBody(position: Vector3) {
    this.controls.target.set(position.x, position.y, position.z)
    this.controls.update()
  }

  public resetCamera() {
    this.camera.position.set(0, 50, 100)
    this.controls.target.set(0, 0, 0)
    this.controls.update()
  }

  public dispose() {
    this.stop()
    window.removeEventListener('resize', this.onResize)
    this.controls.dispose()
    this.renderer.dispose()
    this.container.removeChild(this.renderer.domElement)

    this.bodyMeshes.forEach((mesh) => {
      mesh.geometry.dispose()
      ;(mesh.material as THREE.Material).dispose()
    })

    this.trailLines.forEach((line) => {
      line.geometry.dispose()
      ;(line.material as THREE.Material).dispose()
    })

    this.labels.forEach((label) => label.remove())
  }
}

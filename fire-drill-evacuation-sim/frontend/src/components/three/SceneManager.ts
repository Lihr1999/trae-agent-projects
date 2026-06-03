import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

export class SceneManager {
  scene: THREE.Scene
  renderer: THREE.WebGLRenderer
  camera: THREE.PerspectiveCamera
  controls: OrbitControls
  raycaster: THREE.Raycaster
  mouse: THREE.Vector2
  animationId: number = 0
  container: HTMLElement | null = null
  private clock: THREE.Clock
  private onUpdateCallbacks: Array<(delta: number) => void> = []

  constructor() {
    this.scene = new THREE.Scene()
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 2000)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()
    this.clock = new THREE.Clock()
  }

  init(container: HTMLElement): void {
    this.container = container
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.setClearColor(0x1a1a2e, 1)
    container.appendChild(this.renderer.domElement)
    this.setupCamera()
    this.setupLights()
    this.setupOrbitControls()
    this.createGroundPlane()
    this.setupEventListeners()
    this.animate()
  }

  setupCamera(): void {
    this.camera.position.set(80, 60, 80)
    this.camera.lookAt(0, 0, 0)
    this.camera.near = 0.1
    this.camera.far = 2000
    this.camera.updateProjectionMatrix()
  }

  setupLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.4)
    this.scene.add(ambient)

    const directional = new THREE.DirectionalLight(0xffffff, 0.8)
    directional.position.set(50, 100, 50)
    directional.castShadow = true
    directional.shadow.mapSize.width = 2048
    directional.shadow.mapSize.height = 2048
    directional.shadow.camera.near = 0.5
    directional.shadow.camera.far = 500
    directional.shadow.camera.left = -100
    directional.shadow.camera.right = 100
    directional.shadow.camera.top = 100
    directional.shadow.camera.bottom = -100
    directional.shadow.bias = -0.0001
    this.scene.add(directional)

    const hemisphere = new THREE.HemisphereLight(0x87ceeb, 0x362f2f, 0.3)
    this.scene.add(hemisphere)
  }

  setupOrbitControls(): void {
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.minDistance = 10
    this.controls.maxDistance = 500
    this.controls.maxPolarAngle = Math.PI / 2.05
    this.controls.autoRotate = false
    this.controls.autoRotateSpeed = 0.5
    this.controls.target.set(0, 0, 0)
    this.controls.update()
  }

  createGroundPlane(): void {
    const geometry = new THREE.PlaneGeometry(200, 200)
    const material = new THREE.MeshStandardMaterial({
      color: 0x4a524a,
      roughness: 0.9,
      metalness: 0.1,
    })
    const ground = new THREE.Mesh(geometry, material)
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    ground.userData.type = 'ground'
    this.scene.add(ground)

    const grid = new THREE.GridHelper(200, 40, 0x3a3a3a, 0x3a3a3a)
    grid.position.y = 0.01
    ;(grid.material as THREE.Material).opacity = 0.3
    ;(grid.material as THREE.Material).transparent = true
    this.scene.add(grid)
  }

  setupEventListeners(): void {
    window.addEventListener('resize', this.onResize.bind(this))
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this))
  }

  onMouseMove(event: MouseEvent): void {
    if (!this.container) return
    const rect = this.container.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  }

  getIntersectedObjects(event: MouseEvent, objects: THREE.Object3D[]): THREE.Intersection[] {
    if (!this.container) return []
    const rect = this.container.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    this.raycaster.setFromCamera(this.mouse, this.camera)
    return this.raycaster.intersectObjects(objects, true)
  }

  animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this))
    const delta = this.clock.getDelta()
    this.controls.update()
    for (const cb of this.onUpdateCallbacks) {
      cb(delta)
    }
    this.renderer.render(this.scene, this.camera)
  }

  onUpdate(callback: (delta: number) => void): void {
    this.onUpdateCallbacks.push(callback)
  }

  removeUpdateCallback(callback: (delta: number) => void): void {
    const idx = this.onUpdateCallbacks.indexOf(callback)
    if (idx !== -1) {
      this.onUpdateCallbacks.splice(idx, 1)
    }
  }

  onResize(): void {
    if (!this.container) return
    const width = this.container.clientWidth
    const height = this.container.clientHeight
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }

  addObject(object: THREE.Object3D): void {
    this.scene.add(object)
  }

  removeObject(object: THREE.Object3D): void {
    this.scene.remove(object)
  }

  clearScene(): void {
    while (this.scene.children.length > 0) {
      const child = this.scene.children[0]
      if (child.userData.type === 'ground' || child instanceof THREE.GridHelper || child instanceof THREE.Light) {
        break
      }
      this.scene.remove(child)
      if ((child as any).geometry) (child as any).geometry.dispose()
      if ((child as any).material) {
        if (Array.isArray((child as any).material)) {
          ;(child as any).material.forEach((m: THREE.Material) => m.dispose())
        } else {
          ;(child as any).material.dispose()
        }
      }
    }
  }

  focusOn(position: THREE.Vector3): void {
    const targetPos = position.clone()
    targetPos.y += 20
    targetPos.z += 20
    const startPos = this.camera.position.clone()
    const startTarget = this.controls.target.clone()
    const duration = 1000
    const startTime = Date.now()

    const animateCamera = () => {
      const elapsed = Date.now() - startTime
      const t = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)

      this.camera.position.lerpVectors(startPos, targetPos, eased)
      this.controls.target.lerpVectors(startTarget, position, eased)
      this.controls.update()

      if (t < 1) {
        requestAnimationFrame(animateCamera)
      }
    }
    animateCamera()
  }

  resetCamera(): void {
    this.focusOn(new THREE.Vector3(0, 0, 0))
    const targetPos = new THREE.Vector3(80, 60, 80)
    const startPos = this.camera.position.clone()
    const startTarget = this.controls.target.clone()
    const duration = 1000
    const startTime = Date.now()

    const animateCamera = () => {
      const elapsed = Date.now() - startTime
      const t = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)

      this.camera.position.lerpVectors(startPos, targetPos, eased)
      this.controls.target.lerpVectors(startTarget, new THREE.Vector3(0, 0, 0), eased)
      this.controls.update()

      if (t < 1) {
        requestAnimationFrame(animateCamera)
      }
    }
    animateCamera()
  }

  dispose(): void {
    cancelAnimationFrame(this.animationId)
    window.removeEventListener('resize', this.onResize.bind(this))
    this.onUpdateCallbacks = []
    this.controls.dispose()
    this.renderer.dispose()
    this.scene.traverse((object) => {
      if ((object as any).geometry) {
        ;(object as any).geometry.dispose()
      }
      if ((object as any).material) {
        const materials = Array.isArray((object as any).material)
          ? (object as any).material
          : [(object as any).material]
        materials.forEach((material: THREE.Material) => material.dispose())
      }
    })
    if (this.container && this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement)
    }
  }
}

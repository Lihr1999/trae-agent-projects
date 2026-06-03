import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

export type CameraMode = 'first_person' | 'third_person' | 'overview'

export class CameraController {
  camera: THREE.PerspectiveCamera
  controls: OrbitControls
  mode: CameraMode = 'overview'
  followTarget: THREE.Object3D | null = null
  private moveSpeed: number = 30
  private lookSpeed: number = 0.002
  private keys: Set<string> = new Set()
  private euler: THREE.Euler = new THREE.Euler(0, 0, 0, 'YXZ')
  private thirdPersonOffset: THREE.Vector3 = new THREE.Vector3(0, 15, 20)
  private domElement: HTMLElement
  private isPointerLocked: boolean = false
  private buildings: THREE.Box3[] = []
  private transitionActive: boolean = false
  private transitionStart: THREE.Vector3 = new THREE.Vector3()
  private transitionEnd: THREE.Vector3 = new THREE.Vector3()
  private transitionTargetStart: THREE.Vector3 = new THREE.Vector3()
  private transitionTargetEnd: THREE.Vector3 = new THREE.Vector3()
  private transitionProgress: number = 0
  private transitionDuration: number = 1.0

  constructor(camera: THREE.PerspectiveCamera, controls: OrbitControls, domElement: HTMLElement) {
    this.camera = camera
    this.controls = controls
    this.domElement = domElement
    this.setupKeyboardControls()
  }

  private setupKeyboardControls(): void {
    window.addEventListener('keydown', this.onKeyDown.bind(this))
    window.addEventListener('keyup', this.onKeyUp.bind(this))
    this.domElement.addEventListener('click', this.onCanvasClick.bind(this))
    document.addEventListener('pointerlockchange', this.onPointerLockChange.bind(this))
    document.addEventListener('mousemove', this.onMouseMove.bind(this))
  }

  private onKeyDown(e: KeyboardEvent): void {
    this.keys.add(e.code)
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.code)
  }

  private onCanvasClick(): void {
    if (this.mode === 'first_person' && !this.isPointerLocked) {
      this.domElement.requestPointerLock()
    }
  }

  private onPointerLockChange(): void {
    this.isPointerLocked = document.pointerLockElement === this.domElement
  }

  private onMouseMove(e: MouseEvent): void {
    if (this.mode === 'first_person' && this.isPointerLocked) {
      this.euler.setFromQuaternion(this.camera.quaternion)
      this.euler.y -= e.movementX * this.lookSpeed
      this.euler.x -= e.movementY * this.lookSpeed
      this.euler.x = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.euler.x))
      this.camera.quaternion.setFromEuler(this.euler)
    }
  }

  setMode(mode: CameraMode): void {
    if (this.mode === mode) return

    const oldMode = this.mode
    this.mode = mode

    if (mode === 'first_person') {
      this.controls.enabled = false
      this.camera.position.y = Math.max(this.camera.position.y, 2)
      this.euler.setFromQuaternion(this.camera.quaternion)
    } else if (mode === 'third_person') {
      this.controls.enabled = true
      this.controls.minDistance = 5
      this.controls.maxDistance = 50
      if (this.isPointerLocked) {
        document.exitPointerLock()
      }
    } else {
      this.controls.enabled = true
      this.controls.minDistance = 10
      this.controls.maxDistance = 500
      if (this.isPointerLocked) {
        document.exitPointerLock()
      }
    }
  }

  setFollowTarget(target: THREE.Object3D): void {
    this.followTarget = target
    if (this.mode === 'third_person') {
      this.controls.target.copy(target.position)
    }
  }

  clearFollowTarget(): void {
    this.followTarget = null
  }

  flyToPosition(position: THREE.Vector3): void {
    this.transitionActive = true
    this.transitionStart.copy(this.camera.position)
    this.transitionTargetStart.copy(this.controls.target)

    const direction = new THREE.Vector3().subVectors(this.camera.position, this.controls.target).normalize()
    this.transitionEnd.copy(position).add(direction.multiplyScalar(30))
    this.transitionEnd.y = Math.max(this.transitionEnd.y, 10)
    this.transitionTargetEnd.copy(position)
    this.transitionProgress = 0
  }

  setBuildings(buildings: THREE.Box3[]): void {
    this.buildings = buildings
  }

  private checkCollision(position: THREE.Vector3): boolean {
    const playerBox = new THREE.Box3(
      new THREE.Vector3(position.x - 0.5, position.y - 1, position.z - 0.5),
      new THREE.Vector3(position.x + 0.5, position.y + 1, position.z + 0.5)
    )
    for (const building of this.buildings) {
      if (playerBox.intersectsBox(building)) {
        return true
      }
    }
    return false
  }

  update(delta: number): void {
    if (this.transitionActive) {
      this.transitionProgress += delta / this.transitionDuration
      if (this.transitionProgress >= 1) {
        this.transitionProgress = 1
        this.transitionActive = false
      }
      const t = this.easeInOutCubic(this.transitionProgress)
      this.camera.position.lerpVectors(this.transitionStart, this.transitionEnd, t)
      this.controls.target.lerpVectors(this.transitionTargetStart, this.transitionTargetEnd, t)
      this.controls.update()
      return
    }

    if (this.mode === 'first_person') {
      this.updateFirstPerson(delta)
    } else if (this.mode === 'third_person' && this.followTarget) {
      this.updateThirdPerson(delta)
    }
  }

  private updateFirstPerson(delta: number): void {
    const moveDir = new THREE.Vector3()
    const forward = new THREE.Vector3()
    const right = new THREE.Vector3()

    this.camera.getWorldDirection(forward)
    forward.y = 0
    forward.normalize()
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize()

    if (this.keys.has('KeyW')) moveDir.add(forward)
    if (this.keys.has('KeyS')) moveDir.sub(forward)
    if (this.keys.has('KeyA')) moveDir.sub(right)
    if (this.keys.has('KeyD')) moveDir.add(right)

    if (moveDir.length() > 0) {
      moveDir.normalize().multiplyScalar(this.moveSpeed * delta)
      const newPos = this.camera.position.clone().add(moveDir)
      newPos.y = this.camera.position.y

      if (!this.checkCollision(newPos)) {
        this.camera.position.copy(newPos)
      } else {
        const slideX = this.camera.position.clone()
        slideX.x = newPos.x
        if (!this.checkCollision(slideX)) {
          this.camera.position.x = newPos.x
        }
        const slideZ = this.camera.position.clone()
        slideZ.z = newPos.z
        if (!this.checkCollision(slideZ)) {
          this.camera.position.z = newPos.z
        }
      }
    }
  }

  private updateThirdPerson(delta: number): void {
    if (!this.followTarget) return

    const targetPos = this.followTarget.position.clone().add(this.thirdPersonOffset)
    this.camera.position.lerp(targetPos, 3 * delta)
    this.controls.target.lerp(this.followTarget.position, 5 * delta)
    this.controls.update()
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  getOverviewPosition(): { position: THREE.Vector3; target: THREE.Vector3 } {
    return {
      position: new THREE.Vector3(80, 60, 80),
      target: new THREE.Vector3(0, 0, 0),
    }
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown.bind(this))
    window.removeEventListener('keyup', this.onKeyUp.bind(this))
    if (this.isPointerLocked) {
      document.exitPointerLock()
    }
  }
}

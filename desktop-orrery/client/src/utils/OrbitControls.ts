import * as THREE from 'three'

export class OrbitControls {
  private object: THREE.Camera
  private domElement: HTMLElement

  public enabled = true
  public target = new THREE.Vector3()

  public minDistance = 0
  public maxDistance = Infinity

  public enableDamping = true
  public dampingFactor = 0.05

  public enableZoom = true
  public zoomSpeed = 1.0

  public enableRotate = true
  public rotateSpeed = 1.0

  public enablePan = true
  public panSpeed = 1.0

  private spherical = new THREE.Spherical()
  private sphericalDelta = new THREE.Spherical()

  private position0 = new THREE.Vector3()
  private target0 = new THREE.Vector3()

  private rotateStart = new THREE.Vector2()
  private rotateEnd = new THREE.Vector2()
  private rotateDelta = new THREE.Vector2()

  private panStart = new THREE.Vector2()
  private panEnd = new THREE.Vector2()
  private panDelta = new THREE.Vector2()
  private panOffset = new THREE.Vector3()

  private zoomStart = 0
  private zoomEnd = 0
  private zoomDelta = 0

  private isRotating = false
  private isPanning = false
  private isZooming = false

  private offset = new THREE.Vector3()

  constructor(object: THREE.Camera, domElement: HTMLElement) {
    this.object = object
    this.domElement = domElement

    this.position0 = this.object.position.clone()
    this.target0 = this.target.clone()

    this.domElement.addEventListener('contextmenu', this.onContextMenu)
    this.domElement.addEventListener('mousedown', this.onMouseDown)
    this.domElement.addEventListener('wheel', this.onMouseWheel)
    this.domElement.addEventListener('touchstart', this.onTouchStart)
    this.domElement.addEventListener('touchend', this.onTouchEnd)
    this.domElement.addEventListener('touchmove', this.onTouchMove)
    document.addEventListener('mousemove', this.onMouseMove)
    document.addEventListener('mouseup', this.onMouseUp)

    this.update()
  }

  private onContextMenu = (event: Event) => {
    event.preventDefault()
  }

  private onMouseDown = (event: MouseEvent) => {
    if (!this.enabled) return

    switch (event.button) {
      case 0:
        if (!this.enableRotate) return
        this.isRotating = true
        this.rotateStart.set(event.clientX, event.clientY)
        break
      case 1:
        if (!this.enableZoom) return
        this.isZooming = true
        this.zoomStart = event.clientY
        break
      case 2:
        if (!this.enablePan) return
        this.isPanning = true
        this.panStart.set(event.clientX, event.clientY)
        break
    }
  }

  private onMouseMove = (event: MouseEvent) => {
    if (!this.enabled) return

    if (this.isRotating && this.enableRotate) {
      this.rotateEnd.set(event.clientX, event.clientY)
      this.rotateDelta.subVectors(this.rotateEnd, this.rotateStart)

      const element = this.domElement
      this.rotateLeft(2 * Math.PI * this.rotateDelta.x / element.clientWidth * this.rotateSpeed)
      this.rotateUp(2 * Math.PI * this.rotateDelta.y / element.clientHeight * this.rotateSpeed)

      this.rotateStart.copy(this.rotateEnd)
      this.update()
    }

    if (this.isZooming && this.enableZoom) {
      this.zoomEnd = event.clientY
      this.zoomDelta = this.zoomStart - this.zoomEnd
      this.dollyIn(this.getZoomScale(this.zoomDelta))
      this.zoomStart = this.zoomEnd
      this.update()
    }

    if (this.isPanning && this.enablePan) {
      this.panEnd.set(event.clientX, event.clientY)
      this.panDelta.subVectors(this.panEnd, this.panStart)
      this.pan(this.panDelta.x, this.panDelta.y)
      this.panStart.copy(this.panEnd)
      this.update()
    }
  }

  private onMouseUp = () => {
    this.isRotating = false
    this.isZooming = false
    this.isPanning = false
  }

  private onMouseWheel = (event: WheelEvent) => {
    if (!this.enabled || !this.enableZoom) return
    event.preventDefault()
    this.dollyIn(this.getZoomScale(-event.deltaY * 0.01))
    this.update()
  }

  private onTouchStart = (event: TouchEvent) => {
    if (!this.enabled) return
    event.preventDefault()

    const touch = event.touches[0]
    this.rotateStart.set(touch.clientX, touch.clientY)
    this.isRotating = true
  }

  private onTouchMove = (event: TouchEvent) => {
    if (!this.enabled || !this.enableRotate) return
    event.preventDefault()

    const touch = event.touches[0]
    this.rotateEnd.set(touch.clientX, touch.clientY)
    this.rotateDelta.subVectors(this.rotateEnd, this.rotateStart)

    const element = this.domElement
    this.rotateLeft(2 * Math.PI * this.rotateDelta.x / element.clientWidth * this.rotateSpeed)
    this.rotateUp(2 * Math.PI * this.rotateDelta.y / element.clientHeight * this.rotateSpeed)

    this.rotateStart.copy(this.rotateEnd)
    this.update()
  }

  private onTouchEnd = () => {
    this.isRotating = false
  }

  private getZoomScale(delta: number): number {
    return Math.pow(0.95, this.zoomSpeed * delta)
  }

  private rotateLeft(angle: number) {
    this.sphericalDelta.theta -= angle
  }

  private rotateUp(angle: number) {
    this.sphericalDelta.phi -= angle
  }

  private pan(deltaX: number, deltaY: number) {
    const element = this.domElement
    const position = this.object.position
    const targetDistance = position.distanceTo(this.target)

    const panFactor = (targetDistance * this.panSpeed) / Math.min(element.clientWidth, element.clientHeight)

    const right = new THREE.Vector3()
    const up = new THREE.Vector3()

    this.object.getWorldDirection(right)
    right.cross(this.object.up).normalize()
    up.copy(this.object.up)

    right.multiplyScalar(-deltaX * panFactor)
    up.multiplyScalar(deltaY * panFactor)

    this.panOffset.add(right).add(up)
  }

  private dollyIn(scale: number) {
    this.sphericalDelta.radius *= scale
  }

  public update() {
    this.offset.copy(this.object.position).sub(this.target)

    this.spherical.setFromVector3(this.offset)

    this.spherical.theta += this.sphericalDelta.theta
    this.spherical.phi += this.sphericalDelta.phi

    this.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.spherical.phi))

    if (this.enableDamping) {
      this.spherical.radius *= this.sphericalDelta.radius
    } else {
      this.spherical.radius = this.sphericalDelta.radius > 1 ? 
        this.spherical.radius * this.sphericalDelta.radius : 
        this.spherical.radius
    }

    this.spherical.radius = Math.max(this.minDistance, Math.min(this.maxDistance, this.spherical.radius))

    this.target.add(this.panOffset)

    this.offset.setFromSpherical(this.spherical)
    this.object.position.copy(this.target).add(this.offset)
    this.object.lookAt(this.target)

    if (this.enableDamping) {
      this.sphericalDelta.theta *= (1 - this.dampingFactor)
      this.sphericalDelta.phi *= (1 - this.dampingFactor)
      this.sphericalDelta.radius = 1
      this.panOffset.multiplyScalar(1 - this.dampingFactor)
    } else {
      this.sphericalDelta.set(0, 0, 1)
      this.panOffset.set(0, 0, 0)
    }

    return true
  }

  public reset() {
    this.target.copy(this.target0)
    this.object.position.copy(this.position0)
    this.update()
  }

  public dispose() {
    this.domElement.removeEventListener('contextmenu', this.onContextMenu)
    this.domElement.removeEventListener('mousedown', this.onMouseDown)
    this.domElement.removeEventListener('wheel', this.onMouseWheel)
    this.domElement.removeEventListener('touchstart', this.onTouchStart)
    this.domElement.removeEventListener('touchend', this.onTouchEnd)
    this.domElement.removeEventListener('touchmove', this.onTouchMove)
    document.removeEventListener('mousemove', this.onMouseMove)
    document.removeEventListener('mouseup', this.onMouseUp)
  }
}

import * as THREE from 'three'
import type { EvacuationRoute, PeopleGroup } from '../../types'

const PEOPLE_STATUS_COLORS: Record<string, number> = {
  stationary: 0x2196f3,
  evacuating: 0xffc107,
  evacuated: 0x4caf50,
}

interface EvacuationAnimState {
  routeId: string
  peopleId: number
  currentStepIndex: number
  progress: number
  speed: number
  steps: THREE.Vector3[]
}

export class EvacuationRenderer {
  private routeMeshes: Map<string, THREE.Group> = new Map()
  private peopleMeshes: Map<number, THREE.Group> = new Map()
  private animationStates: Map<number, EvacuationAnimState> = new Map()
  private dashOffset: number = 0

  createEvacuationRoute(route: EvacuationRoute): THREE.Group {
    const group = new THREE.Group()
    group.userData = { type: 'evacuation_route', id: route.route_id }

    if (route.steps.length < 2) return group

    const points = route.steps.map(
      (step) => new THREE.Vector3(step.position_x, step.position_y + 0.3, step.position_z)
    )

    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal')
    const tubeSegments = Math.max(points.length * 8, 32)
    const tubeRadius = 0.15
    const tubeGeometry = new THREE.TubeGeometry(curve, tubeSegments, tubeRadius, 8, false)
    const tubeMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ff88,
      emissive: 0x00ff88,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.8,
    })
    const tube = new THREE.Mesh(tubeGeometry, tubeMaterial)
    tube.userData = { type: 'route_tube' }
    group.add(tube)

    const glowGeometry = new THREE.TubeGeometry(curve, tubeSegments, tubeRadius * 2.5, 8, false)
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.12,
    })
    const glow = new THREE.Mesh(glowGeometry, glowMaterial)
    glow.userData = { type: 'route_glow' }
    group.add(glow)

    const dashCount = Math.max(points.length * 3, 10)
    const dashGeometry = new THREE.SphereGeometry(0.2, 6, 6)
    const dashMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.6,
    })

    const instancedDashes = new THREE.InstancedMesh(dashGeometry, dashMaterial, dashCount)
    instancedDashes.userData = { type: 'route_dashes', curve, dashCount }
    const dummy = new THREE.Object3D()
    for (let i = 0; i < dashCount; i++) {
      const t = i / dashCount
      const pos = curve.getPointAt(t)
      dummy.position.copy(pos)
      dummy.updateMatrix()
      instancedDashes.setMatrixAt(i, dummy.matrix)
    }
    instancedDashes.instanceMatrix.needsUpdate = true
    group.add(instancedDashes)

    for (let i = 0; i < points.length; i++) {
      const markerGeom = new THREE.SphereGeometry(0.35, 8, 8)
      const markerMat = new THREE.MeshStandardMaterial({
        color: i === 0 ? 0x4caf50 : i === points.length - 1 ? 0xf44336 : 0x2196f3,
        emissive: i === 0 ? 0x4caf50 : i === points.length - 1 ? 0xf44336 : 0x2196f3,
        emissiveIntensity: 0.5,
      })
      const marker = new THREE.Mesh(markerGeom, markerMat)
      marker.position.copy(points[i])
      marker.userData = { type: 'step_marker', stepIndex: i }
      group.add(marker)
    }

    this.routeMeshes.set(route.route_id, group)
    return group
  }

  createPeopleGroup(people: PeopleGroup): THREE.Group {
    const group = new THREE.Group()
    group.userData = { type: 'people_group', id: people.id }

    const color = PEOPLE_STATUS_COLORS[people.status] || 0x2196f3
    const displayCount = Math.min(people.count, 10)
    const bodyGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.8, 6)
    const headGeometry = new THREE.SphereGeometry(0.12, 6, 6)
    const bodyMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.7 })
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffdbac, roughness: 0.8 })

    const perPersonGroup = new THREE.Group()
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
    body.position.y = 0.4
    perPersonGroup.add(body)
    const head = new THREE.Mesh(headGeometry, headMaterial)
    head.position.y = 0.92
    perPersonGroup.add(head)

    const instancedBodies = new THREE.InstancedMesh(bodyGeometry, bodyMaterial, displayCount)
    instancedBodies.userData = { type: 'person_body' }
    const instancedHeads = new THREE.InstancedMesh(headGeometry, headMaterial, displayCount)
    instancedHeads.userData = { type: 'person_head' }

    const dummy = new THREE.Object3D()
    const positions = this.arrangePeopleCluster(displayCount)

    for (let i = 0; i < displayCount; i++) {
      dummy.position.set(positions[i].x, 0.4, positions[i].z)
      dummy.updateMatrix()
      instancedBodies.setMatrixAt(i, dummy.matrix)

      dummy.position.set(positions[i].x, 0.92, positions[i].z)
      dummy.updateMatrix()
      instancedHeads.setMatrixAt(i, dummy.matrix)
    }

    instancedBodies.instanceMatrix.needsUpdate = true
    instancedHeads.instanceMatrix.needsUpdate = true
    group.add(instancedBodies)
    group.add(instancedHeads)

    const labelSprite = this.createPeopleLabel(people.name, people.count)
    labelSprite.position.y = 1.5
    group.add(labelSprite)

    group.position.set(people.position_x, people.position_y, people.position_z)
    this.peopleMeshes.set(people.id, group)

    return group
  }

  private arrangePeopleCluster(count: number): Array<{ x: number; z: number }> {
    const positions: Array<{ x: number; z: number }> = []
    const spacing = 0.6

    if (count <= 1) {
      positions.push({ x: 0, z: 0 })
      return positions
    }

    const cols = Math.ceil(Math.sqrt(count))
    const rows = Math.ceil(count / cols)

    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / cols)
      const col = i % cols
      const offsetX = (cols - 1) * spacing * 0.5
      const offsetZ = (rows - 1) * spacing * 0.5
      positions.push({
        x: col * spacing - offsetX,
        z: row * spacing - offsetZ,
      })
    }

    return positions
  }

  private createPeopleLabel(name: string, count: number): THREE.Sprite {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    canvas.width = 128
    canvas.height = 48

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
    ctx.roundRect(0, 0, 128, 48, 6)
    ctx.fill()

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 16px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${count}`, 64, 24)

    const texture = new THREE.CanvasTexture(canvas)
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false })
    const sprite = new THREE.Sprite(material)
    sprite.scale.set(4, 1.5, 1)
    return sprite
  }

  updatePeoplePosition(mesh: THREE.Object3D, people: PeopleGroup, newPosition: THREE.Vector3): void {
    mesh.position.copy(newPosition)

    const color = PEOPLE_STATUS_COLORS[people.status] || 0x2196f3
    mesh.traverse((child) => {
      if (child instanceof THREE.InstancedMesh && child.userData.type === 'person_body') {
        const mat = child.material as THREE.MeshStandardMaterial
        mat.color.setHex(color)
        mat.needsUpdate = true
      }
    })
  }

  animateEvacuation(deltaTime: number): void {
    this.dashOffset += deltaTime * 0.3

    this.routeMeshes.forEach((group) => {
      const dashes = group.children.find((c) => c.userData.type === 'route_dashes') as THREE.InstancedMesh | undefined
      if (!dashes) return

      const curve = dashes.userData.curve as THREE.CatmullRomCurve3
      const dashCount = dashes.userData.dashCount as number
      const dummy = new THREE.Object3D()

      for (let i = 0; i < dashCount; i++) {
        let t = ((i / dashCount) + this.dashOffset) % 1
        const pos = curve.getPointAt(t)
        dummy.position.copy(pos)
        dummy.updateMatrix()
        dashes.setMatrixAt(i, dummy.matrix)
      }
      dashes.instanceMatrix.needsUpdate = true
    })

    this.animationStates.forEach((state, peopleId) => {
      const mesh = this.peopleMeshes.get(peopleId)
      if (!mesh) return

      state.progress += deltaTime * state.speed * 0.05

      if (state.progress >= 1) {
        state.progress = 0
        state.currentStepIndex++
        if (state.currentStepIndex >= state.steps.length - 1) {
          state.currentStepIndex = 0
        }
      }

      const from = state.steps[state.currentStepIndex]
      const to = state.steps[Math.min(state.currentStepIndex + 1, state.steps.length - 1)]
      const currentPos = new THREE.Vector3().lerpVectors(from, to, state.progress)
      mesh.position.copy(currentPos)
    })
  }

  startEvacuationAnimation(peopleId: number, route: EvacuationRoute): void {
    if (route.steps.length < 2) return

    const steps = route.steps.map(
      (step) => new THREE.Vector3(step.position_x, step.position_y, step.position_z)
    )

    this.animationStates.set(peopleId, {
      routeId: route.route_id,
      peopleId,
      currentStepIndex: 0,
      progress: 0,
      speed: 1,
      steps,
    })
  }

  stopEvacuationAnimation(peopleId: number): void {
    this.animationStates.delete(peopleId)
  }

  getRouteMesh(id: string): THREE.Group | undefined {
    return this.routeMeshes.get(id)
  }

  getPeopleMesh(id: number): THREE.Group | undefined {
    return this.peopleMeshes.get(id)
  }

  removeRouteMesh(id: string): void {
    this.routeMeshes.delete(id)
  }

  removePeopleMesh(id: number): void {
    this.peopleMeshes.delete(id)
    this.animationStates.delete(id)
  }

  disposeMesh(group: THREE.Group): void {
    group.traverse((child) => {
      if ((child as any).geometry) {
        ;(child as any).geometry.dispose()
      }
      if ((child as any).material) {
        if ((child as any).material.map) {
          ;(child as any).material.map.dispose()
        }
        ;(child as any).material.dispose()
      }
    })
  }
}

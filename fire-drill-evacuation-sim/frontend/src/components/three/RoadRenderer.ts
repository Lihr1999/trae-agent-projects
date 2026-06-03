import * as THREE from 'three'
import type { Road } from '../../types'

export class RoadRenderer {
  private roadMeshes: Map<number, THREE.Group> = new Map()

  createRoadMesh(road: Road): THREE.Group {
    const group = new THREE.Group()
    group.userData = { type: 'road', id: road.id }

    const start = new THREE.Vector3(road.start_x, road.start_y, road.start_z)
    const end = new THREE.Vector3(road.end_x, road.end_y, road.end_z)
    const direction = new THREE.Vector3().subVectors(end, start)
    const length = direction.length()
    const roadWidth = Math.max(road.width, 2)

    direction.normalize()
    const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)

    const surfaceGeometry = new THREE.PlaneGeometry(length, roadWidth)
    const surfaceMaterial = new THREE.MeshStandardMaterial({
      color: 0x555555,
      roughness: 0.9,
      metalness: 0.0,
    })
    const surface = new THREE.Mesh(surfaceGeometry, surfaceMaterial)
    surface.rotation.x = -Math.PI / 2
    surface.position.copy(midPoint)
    surface.position.y = 0.05
    surface.receiveShadow = true
    surface.userData = { type: 'road', id: road.id }

    const angle = Math.atan2(direction.x, direction.z)
    surface.rotation.z = -angle

    group.add(surface)

    const sidewalkGeomL = new THREE.PlaneGeometry(length, 0.5)
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.8 })
    const sidewalkL = new THREE.Mesh(sidewalkGeomL, sidewalkMat)
    sidewalkL.rotation.x = -Math.PI / 2
    sidewalkL.rotation.z = -angle
    sidewalkL.position.copy(midPoint)
    sidewalkL.position.y = 0.06

    const perpX = -Math.sin(angle) * (roadWidth / 2 + 0.25)
    const perpZ = Math.cos(angle) * (roadWidth / 2 + 0.25)
    sidewalkL.position.x += perpX
    sidewalkL.position.z += perpZ
    group.add(sidewalkL)

    const sidewalkR = new THREE.Mesh(sidewalkGeomL.clone(), sidewalkMat.clone())
    sidewalkR.rotation.x = -Math.PI / 2
    sidewalkR.rotation.z = -angle
    sidewalkR.position.copy(midPoint)
    sidewalkR.position.y = 0.06
    sidewalkR.position.x -= perpX
    sidewalkR.position.z -= perpZ
    group.add(sidewalkR)

    const centerLinePoints: THREE.Vector3[] = []
    const dashLength = 2
    const gapLength = 2
    let dist = 0
    while (dist < length) {
      const t1 = dist / length
      const t2 = Math.min((dist + dashLength) / length, 1)
      centerLinePoints.push(new THREE.Vector3().lerpVectors(start, end, t1).setY(0.08))
      centerLinePoints.push(new THREE.Vector3().lerpVectors(start, end, t2).setY(0.08))
      dist += dashLength + gapLength
    }
    if (centerLinePoints.length >= 2) {
      const centerLineGeom = new THREE.BufferGeometry().setFromPoints(centerLinePoints)
      const centerLineMat = new THREE.LineDashedMaterial({
        color: 0xffffff,
        dashSize: 0.5,
        gapSize: 0.5,
        transparent: true,
        opacity: 0.6,
      })
      const centerLine = new THREE.LineSegments(centerLineGeom, centerLineMat)
      centerLine.computeLineDistances()
      group.add(centerLine)
    }

    if (road.status === 'blocked') {
      const overlayGeometry = new THREE.PlaneGeometry(length, roadWidth)
      const overlayMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.35,
        roughness: 0.5,
      })
      const overlay = new THREE.Mesh(overlayGeometry, overlayMaterial)
      overlay.rotation.x = -Math.PI / 2
      overlay.rotation.z = -angle
      overlay.position.copy(midPoint)
      overlay.position.y = 0.1
      overlay.userData = { type: 'road_overlay' }
      group.add(overlay)
    }

    this.roadMeshes.set(road.id, group)
    return group
  }

  updateRoadStatus(mesh: THREE.Object3D, road: Road): void {
    let overlay = mesh.children.find((c) => c.userData.type === 'road_overlay') as THREE.Mesh | undefined

    if (road.status === 'blocked') {
      if (!overlay) {
        const start = new THREE.Vector3(road.start_x, road.start_y, road.start_z)
        const end = new THREE.Vector3(road.end_x, road.end_y, road.end_z)
        const direction = new THREE.Vector3().subVectors(end, start)
        const length = direction.length()
        const roadWidth = Math.max(road.width, 2)
        direction.normalize()
        const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
        const angle = Math.atan2(direction.x, direction.z)

        const overlayGeometry = new THREE.PlaneGeometry(length, roadWidth)
        const overlayMaterial = new THREE.MeshStandardMaterial({
          color: 0xff0000,
          transparent: true,
          opacity: 0.35,
          roughness: 0.5,
        })
        overlay = new THREE.Mesh(overlayGeometry, overlayMaterial)
        overlay.rotation.x = -Math.PI / 2
        overlay.rotation.z = -angle
        overlay.position.copy(midPoint)
        overlay.position.y = 0.1
        overlay.userData = { type: 'road_overlay' }
        mesh.add(overlay)
      }
    } else {
      if (overlay) {
        mesh.remove(overlay)
        overlay.geometry.dispose()
        ;(overlay.material as THREE.Material).dispose()
      }
    }
  }

  getRoadMesh(id: number): THREE.Group | undefined {
    return this.roadMeshes.get(id)
  }

  removeRoadMesh(id: number): void {
    this.roadMeshes.delete(id)
  }

  disposeMesh(group: THREE.Group): void {
    group.traverse((child) => {
      if ((child as any).geometry) {
        ;(child as any).geometry.dispose()
      }
      if ((child as any).material) {
        if (Array.isArray((child as any).material)) {
          ;(child as any).material.forEach((m: THREE.Material) => m.dispose())
        } else {
          ;(child as any).material.dispose()
        }
      }
    })
  }
}

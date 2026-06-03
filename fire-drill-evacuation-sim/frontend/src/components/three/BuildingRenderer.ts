import * as THREE from 'three'
import type { Building, Exit } from '../../types'

const RISK_COLORS: Record<string, number> = {
  low: 0x4caf50,
  medium: 0xffc107,
  high: 0xff9800,
  critical: 0xf44336,
}

const EXIT_STATUS_COLORS: Record<string, number> = {
  normal: 0x4caf50,
  congested: 0xffc107,
  blocked: 0xf44336,
}

export class BuildingRenderer {
  private buildingMeshes: Map<number, THREE.Group> = new Map()

  createBuildingMesh(building: Building, exits: Exit[] = []): THREE.Group {
    const group = new THREE.Group()
    group.userData = { type: 'building', id: building.id }

    const color = RISK_COLORS[building.risk_level] || 0x888888
    const width = Math.max(building.size_x, 1)
    const height = Math.max(building.size_y, 1)
    const depth = Math.max(building.size_z, 1)

    const geometry = new THREE.BoxGeometry(width, height, depth)
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.6,
      metalness: 0.1,
      transparent: false,
      opacity: 1,
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.userData = { type: 'building', id: building.id }
    group.add(mesh)

    const edgeGeometry = new THREE.EdgesGeometry(geometry)
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 })
    const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial)
    group.add(edges)

    this.addFloorLines(group, width, height, depth)

    const relatedExits = exits.filter((e) => e.building_id === building.id)
    for (const exit of relatedExits) {
      const exitMarker = this.createExitMarker(exit, width, height, depth)
      group.add(exitMarker)
    }

    const label = this.createBuildingLabel(building.name, building.risk_level)
    label.position.set(0, height / 2 + 2, 0)
    group.add(label)

    if (building.status === 'evacuating') {
      material.transparent = true
      material.opacity = 0.6
    }

    if (building.status === 'fire') {
      material.emissive = new THREE.Color(0xff2200)
      material.emissiveIntensity = 0.5
    }

    group.position.set(building.position_x, building.position_y + height / 2, building.position_z)

    this.buildingMeshes.set(building.id, group)
    return group
  }

  private addFloorLines(group: THREE.Group, width: number, height: number, depth: number): void {
    const floorHeight = 3
    const floorCount = Math.max(1, Math.floor(height / floorHeight))
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x555555, transparent: true, opacity: 0.5 })

    for (let i = 1; i < floorCount; i++) {
      const y = -height / 2 + i * floorHeight
      const points = [
        new THREE.Vector3(-width / 2, y, -depth / 2),
        new THREE.Vector3(width / 2, y, -depth / 2),
        new THREE.Vector3(width / 2, y, depth / 2),
        new THREE.Vector3(-width / 2, y, depth / 2),
        new THREE.Vector3(-width / 2, y, -depth / 2),
      ]
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(points)
      const line = new THREE.Line(lineGeometry, lineMaterial)
      group.add(line)
    }
  }

  private createExitMarker(exit: Exit, buildingWidth: number, buildingHeight: number, buildingDepth: number): THREE.Mesh {
    const exitColor = EXIT_STATUS_COLORS[exit.status] || 0x4caf50
    const exitWidth = Math.max(exit.width, 0.5)
    const exitGeometry = new THREE.BoxGeometry(exitWidth, 2, 0.3)
    const exitMaterial = new THREE.MeshStandardMaterial({
      color: exitColor,
      emissive: exitColor,
      emissiveIntensity: 0.3,
    })
    const exitMesh = new THREE.Mesh(exitGeometry, exitMaterial)
    const localX = exit.position_x
    const localY = exit.position_y - (buildingHeight / 2)
    const localZ = exit.position_z
    exitMesh.position.set(localX, localY + 1, localZ)
    exitMesh.userData = { type: 'exit', id: exit.id }
    return exitMesh
  }

  createBuildingLabel(name: string, riskLevel: string): THREE.Sprite {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    canvas.width = 256
    canvas.height = 64

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.roundRect(0, 0, 256, 64, 8)
    ctx.fill()

    const riskColorMap: Record<string, string> = {
      low: '#4caf50',
      medium: '#ffc107',
      high: '#ff9800',
      critical: '#f44336',
    }
    const indicatorColor = riskColorMap[riskLevel] || '#888888'
    ctx.fillStyle = indicatorColor
    ctx.beginPath()
    ctx.arc(24, 32, 8, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 20px Arial'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    const displayName = name.length > 10 ? name.substring(0, 9) + '…' : name
    ctx.fillText(displayName, 40, 32)

    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    })
    const sprite = new THREE.Sprite(material)
    sprite.scale.set(8, 2, 1)
    sprite.userData = { type: 'label' }
    return sprite
  }

  updateBuildingStatus(mesh: THREE.Object3D, building: Building): void {
    const boxMesh = mesh.children.find((c) => c instanceof THREE.Mesh && c.userData.type === 'building') as THREE.Mesh | undefined
    if (!boxMesh) return

    const material = boxMesh.material as THREE.MeshStandardMaterial
    const color = RISK_COLORS[building.risk_level] || 0x888888
    material.color.setHex(color)

    material.transparent = false
    material.opacity = 1
    material.emissive = new THREE.Color(0x000000)
    material.emissiveIntensity = 0

    if (building.status === 'evacuating') {
      material.transparent = true
      material.opacity = 0.6
    }

    if (building.status === 'fire') {
      material.emissive = new THREE.Color(0xff2200)
      material.emissiveIntensity = 0.5
    }

    if (building.status === 'damaged') {
      material.transparent = true
      material.opacity = 0.7
      material.emissive = new THREE.Color(0x331100)
      material.emissiveIntensity = 0.2
    }

    material.needsUpdate = true
  }

  highlightBuilding(mesh: THREE.Object3D, highlight: boolean): void {
    const boxMesh = mesh.children.find((c) => c instanceof THREE.Mesh && c.userData.type === 'building') as THREE.Mesh | undefined
    if (!boxMesh) return

    const material = boxMesh.material as THREE.MeshStandardMaterial

    if (highlight) {
      material.emissive = new THREE.Color(0x4488ff)
      material.emissiveIntensity = 0.4
    } else {
      const userData = mesh.userData
      if (userData.status === 'fire') {
        material.emissive = new THREE.Color(0xff2200)
        material.emissiveIntensity = 0.5
      } else if (userData.status === 'damaged') {
        material.emissive = new THREE.Color(0x331100)
        material.emissiveIntensity = 0.2
      } else {
        material.emissive = new THREE.Color(0x000000)
        material.emissiveIntensity = 0
      }
    }
    material.needsUpdate = true
  }

  getBuildingMesh(id: number): THREE.Group | undefined {
    return this.buildingMeshes.get(id)
  }

  removeBuildingMesh(id: number): void {
    this.buildingMeshes.delete(id)
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

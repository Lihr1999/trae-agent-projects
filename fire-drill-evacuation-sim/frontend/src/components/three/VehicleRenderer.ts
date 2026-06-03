import * as THREE from 'three'
import type { RescueVehicle } from '../../types'

const VEHICLE_COLORS: Record<string, number> = {
  fire_truck: 0xcc0000,
  ambulance: 0xeeeeee,
  command_car: 0x1565c0,
}

const VEHICLE_SIZES: Record<string, { bodyW: number; bodyH: number; bodyD: number; cabinW: number; cabinH: number; cabinD: number }> = {
  fire_truck: { bodyW: 2.5, bodyH: 1.8, bodyD: 6, cabinW: 2.3, cabinH: 1.5, cabinD: 2 },
  ambulance: { bodyW: 2.2, bodyH: 2.0, bodyD: 5, cabinW: 2.0, cabinH: 1.4, cabinD: 1.8 },
  command_car: { bodyW: 1.8, bodyH: 1.0, bodyD: 3.5, cabinW: 1.7, cabinH: 0.9, cabinD: 1.5 },
}

const LIGHT_COLORS: Record<string, number> = {
  fire_truck: 0xff0000,
  ambulance: 0x0000ff,
  command_car: 0x0066ff,
}

export class VehicleRenderer {
  private vehicleMeshes: Map<number, THREE.Group> = new Map()
  private lightPhase: number = 0

  createVehicleMesh(vehicle: RescueVehicle): THREE.Group {
    const group = new THREE.Group()
    group.userData = { type: 'vehicle', id: vehicle.id, vehicleType: vehicle.vehicle_type }

    const color = VEHICLE_COLORS[vehicle.vehicle_type] || 0x888888
    const sizes = VEHICLE_SIZES[vehicle.vehicle_type] || VEHICLE_SIZES.command_car

    const bodyGeometry = new THREE.BoxGeometry(sizes.bodyW, sizes.bodyH, sizes.bodyD)
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.4,
      metalness: 0.3,
    })
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
    body.position.y = sizes.bodyH / 2 + 0.3
    body.castShadow = true
    body.userData = { type: 'vehicle_body' }
    group.add(body)

    const cabinGeometry = new THREE.BoxGeometry(sizes.cabinW, sizes.cabinH, sizes.cabinD)
    const cabinMaterial = new THREE.MeshStandardMaterial({
      color: 0x88ccff,
      roughness: 0.2,
      metalness: 0.5,
      transparent: true,
      opacity: 0.7,
    })
    const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial)
    cabin.position.y = sizes.bodyH + sizes.cabinH / 2 + 0.3
    cabin.position.z = sizes.bodyD / 2 - sizes.cabinD / 2
    cabin.castShadow = true
    cabin.userData = { type: 'vehicle_cabin' }
    group.add(cabin)

    if (vehicle.vehicle_type === 'fire_truck') {
      const ladderGeom = new THREE.BoxGeometry(0.15, 0.15, 4)
      const ladderMat = new THREE.MeshStandardMaterial({ color: 0xcc0000, metalness: 0.6 })
      const ladder = new THREE.Mesh(ladderGeom, ladderMat)
      ladder.position.set(0, sizes.bodyH + 0.5, -0.5)
      ladder.rotation.x = -0.3
      ladder.userData = { type: 'ladder' }
      group.add(ladder)
    }

    if (vehicle.vehicle_type === 'ambulance') {
      const crossGeom = new THREE.PlaneGeometry(0.8, 0.8)
      const crossCanvas = document.createElement('canvas')
      const crossCtx = crossCanvas.getContext('2d')!
      crossCanvas.width = 64
      crossCanvas.height = 64
      crossCtx.fillStyle = '#ffffff'
      crossCtx.fillRect(0, 0, 64, 64)
      crossCtx.fillStyle = '#cc0000'
      crossCtx.fillRect(24, 4, 16, 56)
      crossCtx.fillRect(4, 24, 56, 16)
      const crossTexture = new THREE.CanvasTexture(crossCanvas)
      const crossMat = new THREE.MeshBasicMaterial({ map: crossTexture, transparent: true })
      const crossPlane = new THREE.Mesh(crossGeom, crossMat)
      crossPlane.position.set(sizes.bodyW / 2 + 0.01, sizes.bodyH / 2 + 0.3, 0)
      crossPlane.rotation.y = Math.PI / 2
      crossPlane.userData = { type: 'cross_mark' }
      group.add(crossPlane)
    }

    const wheelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 12)
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 })

    const wheelPositions = [
      { x: sizes.bodyW / 2 + 0.1, z: sizes.bodyD / 2 - 0.8 },
      { x: -sizes.bodyW / 2 - 0.1, z: sizes.bodyD / 2 - 0.8 },
      { x: sizes.bodyW / 2 + 0.1, z: -sizes.bodyD / 2 + 0.8 },
      { x: -sizes.bodyW / 2 - 0.1, z: -sizes.bodyD / 2 + 0.8 },
    ]

    for (const wp of wheelPositions) {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial)
      wheel.position.set(wp.x, 0.3, wp.z)
      wheel.rotation.z = Math.PI / 2
      wheel.userData = { type: 'wheel' }
      group.add(wheel)
    }

    const lightColor = LIGHT_COLORS[vehicle.vehicle_type] || 0x0000ff
    const lightGeom = new THREE.BoxGeometry(0.3, 0.2, 0.3)
    const lightMat = new THREE.MeshStandardMaterial({
      color: lightColor,
      emissive: lightColor,
      emissiveIntensity: 0.8,
    })
    const lightBar = new THREE.Mesh(lightGeom, lightMat)
    lightBar.position.set(0, sizes.bodyH + sizes.cabinH + 0.4, sizes.bodyD / 2 - sizes.cabinD / 2)
    lightBar.userData = { type: 'vehicle_light', baseColor: lightColor }
    group.add(lightBar)

    const pointLight = new THREE.PointLight(lightColor, 0, 8)
    pointLight.position.copy(lightBar.position)
    pointLight.userData = { type: 'vehicle_point_light' }
    group.add(pointLight)

    group.position.set(vehicle.position_x, vehicle.position_y, vehicle.position_z)
    this.vehicleMeshes.set(vehicle.id, group)
    return group
  }

  updateVehiclePosition(mesh: THREE.Object3D, vehicle: RescueVehicle, newPosition: THREE.Vector3): void {
    const direction = new THREE.Vector3().subVectors(newPosition, mesh.position)
    if (direction.length() > 0.01) {
      const angle = Math.atan2(direction.x, direction.z)
      mesh.rotation.y = angle
    }
    mesh.position.copy(newPosition)
  }

  animateVehicle(mesh: THREE.Object3D, deltaTime: number): void {
    this.lightPhase += deltaTime * 8

    const lightMesh = mesh.children.find((c) => c.userData.type === 'vehicle_light') as THREE.Mesh | undefined
    const pointLight = mesh.children.find((c) => c.userData.type === 'vehicle_point_light') as THREE.PointLight | undefined

    if (lightMesh) {
      const mat = lightMesh.material as THREE.MeshStandardMaterial
      const flash = Math.sin(this.lightPhase) > 0
      if (flash) {
        mat.emissiveIntensity = 2.0
        if (pointLight) pointLight.intensity = 2
      } else {
        mat.emissiveIntensity = 0.2
        if (pointLight) pointLight.intensity = 0
      }
      mat.needsUpdate = true
    }

    const vehicleData = mesh.userData
    if (vehicleData.status === 'en_route' || vehicleData.status === 'dispatched') {
      const bodyMesh = mesh.children.find((c) => c.userData.type === 'vehicle_body') as THREE.Mesh | undefined
      if (bodyMesh) {
        const mat = bodyMesh.material as THREE.MeshStandardMaterial
        const pulse = Math.sin(this.lightPhase * 0.5) * 0.1 + 0.4
        mat.emissive = new THREE.Color(0xffffff)
        mat.emissiveIntensity = pulse * 0.05
        mat.needsUpdate = true
      }
    }
  }

  updateAllVehicles(deltaTime: number): void {
    this.vehicleMeshes.forEach((mesh) => {
      this.animateVehicle(mesh, deltaTime)
    })
  }

  getVehicleMesh(id: number): THREE.Group | undefined {
    return this.vehicleMeshes.get(id)
  }

  removeVehicleMesh(id: number): void {
    this.vehicleMeshes.delete(id)
  }

  disposeMesh(group: THREE.Group): void {
    group.traverse((child) => {
      if ((child as any).geometry) {
        ;(child as any).geometry.dispose()
      }
      if ((child as any).material) {
        const mat = (child as any).material
        if (mat.map) mat.map.dispose()
        mat.dispose()
      }
    })
  }
}

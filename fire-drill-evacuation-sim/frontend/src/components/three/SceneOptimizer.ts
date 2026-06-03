import * as THREE from 'three'

interface LODLevel {
  distance: number
  object: THREE.Object3D
}

interface LODObject {
  container: THREE.Object3D
  levels: LODLevel[]
  currentLevel: number
}

interface ParticlePool {
  geometry: THREE.BufferGeometry
  material: THREE.PointsMaterial
  active: Set<THREE.Points>
  inactive: THREE.Points[]
  maxPoolSize: number
}

export class SceneOptimizer {
  private lodObjects: Map<string, LODObject> = new Map()
  private frustum: THREE.Frustum = new THREE.Frustum()
  private projScreenMatrix: THREE.Matrix4 = new THREE.Matrix4()
  private frameCount: number = 0
  private lastFpsTime: number = 0
  private currentFps: number = 0
  private particlePools: Map<string, ParticlePool> = new Map()

  addLODObject(id: string, container: THREE.Object3D, levels: LODLevel[]): void {
    levels.sort((a, b) => a.distance - b.distance)

    const lodObj: LODObject = {
      container,
      levels,
      currentLevel: -1,
    }

    for (let i = 1; i < levels.length; i++) {
      levels[i].object.visible = false
    }
    if (levels.length > 0) {
      levels[0].object.visible = true
      lodObj.currentLevel = 0
    }

    this.lodObjects.set(id, lodObj)
  }

  updateLOD(camera: THREE.PerspectiveCamera): void {
    const cameraPosition = camera.position.clone()

    this.lodObjects.forEach((lodObj) => {
      const objectPos = new THREE.Vector3()
      lodObj.container.getWorldPosition(objectPos)
      const distance = cameraPosition.distanceTo(objectPos)

      let targetLevel = 0
      for (let i = lodObj.levels.length - 1; i >= 0; i--) {
        if (distance >= lodObj.levels[i].distance) {
          targetLevel = i
          break
        }
      }

      if (targetLevel !== lodObj.currentLevel) {
        if (lodObj.currentLevel >= 0 && lodObj.currentLevel < lodObj.levels.length) {
          lodObj.levels[lodObj.currentLevel].object.visible = false
        }
        if (targetLevel >= 0 && targetLevel < lodObj.levels.length) {
          lodObj.levels[targetLevel].object.visible = true
        }
        lodObj.currentLevel = targetLevel
      }
    })
  }

  updateFrustumCulling(camera: THREE.PerspectiveCamera, objects: THREE.Object3D[]): void {
    this.projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    this.frustum.setFromProjectionMatrix(this.projScreenMatrix)

    for (const obj of objects) {
      if (!obj.userData.boundingSphere) {
        const sphere = new THREE.Sphere()
        new THREE.Box3().setFromObject(obj).getBoundingSphere(sphere)
        obj.userData.boundingSphere = sphere
      }

      const sphere = obj.userData.boundingSphere as THREE.Sphere
      obj.visible = this.frustum.intersectsSphere(sphere)
    }
  }

  createParticlePool(
    poolId: string,
    maxCount: number,
    geometry: THREE.BufferGeometry,
    material: THREE.PointsMaterial
  ): void {
    const pool: ParticlePool = {
      geometry,
      material,
      active: new Set(),
      inactive: [],
      maxPoolSize: maxCount,
    }

    for (let i = 0; i < Math.min(maxCount, 20); i++) {
      const points = new THREE.Points(geometry, material)
      points.visible = false
      pool.inactive.push(points)
    }

    this.particlePools.set(poolId, pool)
  }

  acquireParticle(poolId: string): THREE.Points | null {
    const pool = this.particlePools.get(poolId)
    if (!pool) return null

    let points: THREE.Points
    if (pool.inactive.length > 0) {
      points = pool.inactive.pop()!
    } else if (pool.active.size < pool.maxPoolSize) {
      points = new THREE.Points(pool.geometry.clone(), pool.material.clone())
    } else {
      return null
    }

    points.visible = true
    pool.active.add(points)
    return points
  }

  releaseParticle(poolId: string, points: THREE.Points): void {
    const pool = this.particlePools.get(poolId)
    if (!pool) return

    if (pool.active.has(points)) {
      pool.active.delete(points)
      points.visible = false
      pool.inactive.push(points)
    }
  }

  updateFPS(): void {
    this.frameCount++
    const now = performance.now()
    const elapsed = now - this.lastFpsTime

    if (elapsed >= 1000) {
      this.currentFps = Math.round((this.frameCount * 1000) / elapsed)
      this.frameCount = 0
      this.lastFpsTime = now
    }
  }

  getFPS(): number {
    return this.currentFps
  }

  removeLODObject(id: string): void {
    this.lodObjects.delete(id)
  }

  dispose(): void {
    this.lodObjects.clear()
    this.particlePools.forEach((pool) => {
      pool.active.forEach((p) => {
        p.geometry.dispose()
        ;(p.material as THREE.Material).dispose()
      })
      pool.inactive.forEach((p) => {
        p.geometry.dispose()
        ;(p.material as THREE.Material).dispose()
      })
      pool.active.clear()
      pool.inactive = []
    })
    this.particlePools.clear()
  }
}

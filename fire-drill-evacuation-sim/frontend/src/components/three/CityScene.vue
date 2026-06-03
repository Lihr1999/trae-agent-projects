<template>
  <div ref="sceneContainer" class="city-scene-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, toRefs } from 'vue'
import * as THREE from 'three'
import { SceneManager } from './SceneManager'
import { BuildingRenderer } from './BuildingRenderer'
import { RoadRenderer } from './RoadRenderer'
import { FireRenderer } from './FireRenderer'
import { EvacuationRenderer } from './EvacuationRenderer'
import { VehicleRenderer } from './VehicleRenderer'
import { CameraController, type CameraMode } from './CameraController'
import { SceneOptimizer } from './SceneOptimizer'
import type { Building, Road, FireIncident, Exit, RescueVehicle, PeopleGroup, EvacuationRoute } from '../../types'

const props = defineProps<{
  buildings: Building[]
  roads: Road[]
  fires: FireIncident[]
  exits: Exit[]
  vehicles: RescueVehicle[]
  peopleGroups: PeopleGroup[]
  evacuationRoutes: EvacuationRoute[]
}>()

const emit = defineEmits<{
  'building-click': [building: Building]
  'road-click': [road: Road]
  'exit-click': [exit: Exit]
  'vehicle-click': [vehicle: RescueVehicle]
}>()

const sceneContainer = ref<HTMLElement | null>(null)

let sceneManager: SceneManager | null = null
let buildingRenderer: BuildingRenderer | null = null
let roadRenderer: RoadRenderer | null = null
let fireRenderer: FireRenderer | null = null
let evacuationRenderer: EvacuationRenderer | null = null
let vehicleRenderer: VehicleRenderer | null = null
let cameraController: CameraController | null = null
let sceneOptimizer: SceneOptimizer | null = null

let currentBuildings: Building[] = []
let currentRoads: Road[] = []
let currentFires: FireIncident[] = []
let currentExits: Exit[] = []
let currentVehicles: RescueVehicle[] = []
let currentPeopleGroups: PeopleGroup[] = []
let currentEvacuationRoutes: EvacuationRoute[] = []

let hoveredObject: THREE.Object3D | null = null

const updateCallback = (delta: number) => {
  if (fireRenderer) fireRenderer.update(delta)
  if (evacuationRenderer) evacuationRenderer.animateEvacuation(delta)
  if (vehicleRenderer) vehicleRenderer.updateAllVehicles(delta)
  if (cameraController) cameraController.update(delta)
  if (sceneOptimizer) {
    sceneOptimizer.updateFPS()
    if (sceneManager) {
      sceneOptimizer.updateLOD(sceneManager.camera)
    }
  }
}

function initScene() {
  if (!sceneContainer.value) return

  sceneManager = new SceneManager()
  sceneManager.init(sceneContainer.value)

  buildingRenderer = new BuildingRenderer()
  roadRenderer = new RoadRenderer()
  fireRenderer = new FireRenderer()
  evacuationRenderer = new EvacuationRenderer()
  vehicleRenderer = new VehicleRenderer()
  sceneOptimizer = new SceneOptimizer()

  cameraController = new CameraController(
    sceneManager.camera,
    sceneManager.controls,
    sceneManager.renderer.domElement
  )

  sceneManager.onUpdate(updateCallback)

  sceneManager.renderer.domElement.addEventListener('click', onClick)
  sceneManager.renderer.domElement.addEventListener('mousemove', onHover)

  addAllObjects()
}

function addAllObjects() {
  if (!sceneManager) return

  for (const building of currentBuildings) {
    const mesh = buildingRenderer!.createBuildingMesh(building, currentExits)
    sceneManager.addObject(mesh)
  }

  for (const road of currentRoads) {
    const mesh = roadRenderer!.createRoadMesh(road)
    sceneManager.addObject(mesh)
  }

  for (const fire of currentFires) {
    const mesh = fireRenderer!.createFireEffect(fire)
    sceneManager.addObject(mesh)
  }

  for (const vehicle of currentVehicles) {
    const mesh = vehicleRenderer!.createVehicleMesh(vehicle)
    sceneManager.addObject(mesh)
  }

  for (const people of currentPeopleGroups) {
    const mesh = evacuationRenderer!.createPeopleGroup(people)
    sceneManager.addObject(mesh)
  }

  for (const route of currentEvacuationRoutes) {
    const mesh = evacuationRenderer!.createEvacuationRoute(route)
    sceneManager.addObject(mesh)
  }
}

function onClick(event: MouseEvent) {
  if (!sceneManager) return

  const clickables: THREE.Object3D[] = []
  sceneManager.scene.traverse((obj) => {
    if (obj.userData.type === 'building' || obj.userData.type === 'road' ||
        obj.userData.type === 'exit' || obj.userData.type === 'vehicle') {
      clickables.push(obj)
    }
  })

  const intersects = sceneManager.getIntersectedObjects(event, clickables)
  if (intersects.length === 0) return

  let target = intersects[0].object
  while (target.parent && !target.userData.type) {
    target = target.parent
  }

  const type = target.userData.type
  const id = target.userData.id

  if (type === 'building') {
    const building = currentBuildings.find((b) => b.id === id)
    if (building) emit('building-click', building)
  } else if (type === 'road') {
    const road = currentRoads.find((r) => r.id === id)
    if (road) emit('road-click', road)
  } else if (type === 'exit') {
    const exit = currentExits.find((e) => e.id === id)
    if (exit) emit('exit-click', exit)
  } else if (type === 'vehicle') {
    const vehicle = currentVehicles.find((v) => v.id === id)
    if (vehicle) emit('vehicle-click', vehicle)
  }
}

function onHover(event: MouseEvent) {
  if (!sceneManager || !buildingRenderer) return

  const clickables: THREE.Object3D[] = []
  sceneManager.scene.traverse((obj) => {
    if (obj.userData.type === 'building') {
      clickables.push(obj)
    }
  })

  const intersects = sceneManager.getIntersectedObjects(event, clickables)

  if (hoveredObject) {
    let parentGroup = hoveredObject
    while (parentGroup.parent && parentGroup.parent.userData.type !== 'scene') {
      parentGroup = parentGroup.parent
    }
    if (parentGroup.userData.type === 'building') {
      buildingRenderer.highlightBuilding(parentGroup, false)
    }
    hoveredObject = null
  }

  if (intersects.length > 0) {
    let target = intersects[0].object
    while (target.parent && target.userData.type !== 'building') {
      target = target.parent
    }
    if (target.userData.type === 'building') {
      buildingRenderer.highlightBuilding(target, true)
      hoveredObject = target
      sceneManager.renderer.domElement.style.cursor = 'pointer'
    }
  } else {
    sceneManager.renderer.domElement.style.cursor = 'default'
  }
}

watch(() => props.buildings, (newBuildings, oldBuildings) => {
  if (!sceneManager || !buildingRenderer) return

  const oldMap = new Map((oldBuildings || []).map((b) => [b.id, b]))
  const newMap = new Map(newBuildings.map((b) => [b.id, b]))

  for (const [id, oldBuilding] of oldMap) {
    if (!newMap.has(id)) {
      const mesh = buildingRenderer.getBuildingMesh(id)
      if (mesh) {
        sceneManager.removeObject(mesh)
        buildingRenderer.disposeMesh(mesh)
        buildingRenderer.removeBuildingMesh(id)
      }
    }
  }

  for (const [id, newBuilding] of newMap) {
    if (!oldMap.has(id)) {
      const mesh = buildingRenderer.createBuildingMesh(newBuilding, currentExits)
      sceneManager.addObject(mesh)
    } else {
      const oldBuilding = oldMap.get(id)!
      if (
        oldBuilding.status !== newBuilding.status ||
        oldBuilding.risk_level !== newBuilding.risk_level
      ) {
        const mesh = buildingRenderer.getBuildingMesh(id)
        if (mesh) {
          mesh.userData.status = newBuilding.status
          buildingRenderer.updateBuildingStatus(mesh, newBuilding)
        }
      }
    }
  }

  currentBuildings = [...newBuildings]
}, { deep: true })

watch(() => props.roads, (newRoads, oldRoads) => {
  if (!sceneManager || !roadRenderer) return

  const oldMap = new Map((oldRoads || []).map((r) => [r.id, r]))
  const newMap = new Map(newRoads.map((r) => [r.id, r]))

  for (const [id] of oldMap) {
    if (!newMap.has(id)) {
      const mesh = roadRenderer.getRoadMesh(id)
      if (mesh) {
        sceneManager.removeObject(mesh)
        roadRenderer.disposeMesh(mesh)
        roadRenderer.removeRoadMesh(id)
      }
    }
  }

  for (const [id, newRoad] of newMap) {
    if (!oldMap.has(id)) {
      const mesh = roadRenderer.createRoadMesh(newRoad)
      sceneManager.addObject(mesh)
    } else {
      const oldRoad = oldMap.get(id)!
      if (oldRoad.status !== newRoad.status) {
        const mesh = roadRenderer.getRoadMesh(id)
        if (mesh) {
          roadRenderer.updateRoadStatus(mesh, newRoad)
        }
      }
    }
  }

  currentRoads = [...newRoads]
}, { deep: true })

watch(() => props.fires, (newFires, oldFires) => {
  if (!sceneManager || !fireRenderer) return

  const oldMap = new Map((oldFires || []).map((f) => [f.id, f]))
  const newMap = new Map(newFires.map((f) => [f.id, f]))

  for (const [id] of oldMap) {
    if (!newMap.has(id)) {
      const mesh = fireRenderer.getFireEffect(id)
      if (mesh) {
        sceneManager.removeObject(mesh)
        fireRenderer.disposeMesh(mesh)
        fireRenderer.removeFireEffect(id)
      }
    }
  }

  for (const [id, newFire] of newMap) {
    if (!oldMap.has(id)) {
      const mesh = fireRenderer.createFireEffect(newFire)
      sceneManager.addObject(mesh)
    } else {
      const mesh = fireRenderer.getFireEffect(id)
      if (mesh) {
        fireRenderer.updateFireEffect(mesh, newFire)
      }
    }
  }

  currentFires = [...newFires]
}, { deep: true })

watch(() => props.exits, (newExits) => {
  currentExits = [...newExits]
}, { deep: true })

watch(() => props.vehicles, (newVehicles, oldVehicles) => {
  if (!sceneManager || !vehicleRenderer) return

  const oldMap = new Map((oldVehicles || []).map((v) => [v.id, v]))
  const newMap = new Map(newVehicles.map((v) => [v.id, v]))

  for (const [id] of oldMap) {
    if (!newMap.has(id)) {
      const mesh = vehicleRenderer.getVehicleMesh(id)
      if (mesh) {
        sceneManager.removeObject(mesh)
        vehicleRenderer.disposeMesh(mesh)
        vehicleRenderer.removeVehicleMesh(id)
      }
    }
  }

  for (const [id, newVehicle] of newMap) {
    if (!oldMap.has(id)) {
      const mesh = vehicleRenderer.createVehicleMesh(newVehicle)
      sceneManager.addObject(mesh)
    } else {
      const oldVehicle = oldMap.get(id)!
      const mesh = vehicleRenderer.getVehicleMesh(id)
      if (mesh) {
        const newPos = new THREE.Vector3(newVehicle.position_x, newVehicle.position_y, newVehicle.position_z)
        vehicleRenderer.updateVehiclePosition(mesh, oldVehicle, newPos)
        mesh.userData.status = newVehicle.status
      }
    }
  }

  currentVehicles = [...newVehicles]
}, { deep: true })

watch(() => props.peopleGroups, (newPeople, oldPeople) => {
  if (!sceneManager || !evacuationRenderer) return

  const oldMap = new Map((oldPeople || []).map((p) => [p.id, p]))
  const newMap = new Map(newPeople.map((p) => [p.id, p]))

  for (const [id] of oldMap) {
    if (!newMap.has(id)) {
      const mesh = evacuationRenderer.getPeopleMesh(id)
      if (mesh) {
        sceneManager.removeObject(mesh)
        evacuationRenderer.disposeMesh(mesh)
        evacuationRenderer.removePeopleMesh(id)
      }
    }
  }

  for (const [id, newP] of newMap) {
    if (!oldMap.has(id)) {
      const mesh = evacuationRenderer.createPeopleGroup(newP)
      sceneManager.addObject(mesh)
    } else {
      const mesh = evacuationRenderer.getPeopleMesh(id)
      if (mesh) {
        const newPos = new THREE.Vector3(newP.position_x, newP.position_y, newP.position_z)
        evacuationRenderer.updatePeoplePosition(mesh, newP, newPos)
      }
    }
  }

  currentPeopleGroups = [...newPeople]
}, { deep: true })

watch(() => props.evacuationRoutes, (newRoutes, oldRoutes) => {
  if (!sceneManager || !evacuationRenderer) return

  const oldMap = new Map((oldRoutes || []).map((r) => [r.route_id, r]))
  const newMap = new Map(newRoutes.map((r) => [r.route_id, r]))

  for (const [id] of oldMap) {
    if (!newMap.has(id)) {
      const mesh = evacuationRenderer.getRouteMesh(id)
      if (mesh) {
        sceneManager.removeObject(mesh)
        evacuationRenderer.disposeMesh(mesh)
        evacuationRenderer.removeRouteMesh(id)
      }
    }
  }

  for (const [id, newRoute] of newMap) {
    if (!oldMap.has(id)) {
      const mesh = evacuationRenderer.createEvacuationRoute(newRoute)
      sceneManager.addObject(mesh)
    }
  }

  currentEvacuationRoutes = [...newRoutes]
}, { deep: true })

function focusBuilding(id: number) {
  if (!sceneManager || !buildingRenderer) return
  const mesh = buildingRenderer.getBuildingMesh(id)
  if (mesh) {
    sceneManager.focusOn(mesh.position)
  }
}

function focusFire(id: number) {
  if (!sceneManager || !fireRenderer) return
  const mesh = fireRenderer.getFireEffect(id)
  if (mesh) {
    sceneManager.focusOn(mesh.position)
  }
}

function resetView() {
  if (sceneManager) {
    sceneManager.resetCamera()
  }
}

function toggleViewMode() {
  if (!cameraController) return

  const modes: CameraMode[] = ['overview', 'third_person', 'first_person']
  const currentIdx = modes.indexOf(cameraController.mode)
  const nextIdx = (currentIdx + 1) % modes.length
  cameraController.setMode(modes[nextIdx])
}

function getFPS(): number {
  if (!sceneOptimizer) return 0
  return sceneOptimizer.getFPS()
}

onMounted(() => {
  currentBuildings = [...(props.buildings || [])]
  currentRoads = [...(props.roads || [])]
  currentFires = [...(props.fires || [])]
  currentExits = [...(props.exits || [])]
  currentVehicles = [...(props.vehicles || [])]
  currentPeopleGroups = [...(props.peopleGroups || [])]
  currentEvacuationRoutes = [...(props.evacuationRoutes || [])]
  initScene()
})

onUnmounted(() => {
  if (sceneManager) {
    sceneManager.removeUpdateCallback(updateCallback)
    sceneManager.renderer.domElement.removeEventListener('click', onClick)
    sceneManager.renderer.domElement.removeEventListener('mousemove', onHover)
  }
  if (cameraController) cameraController.dispose()
  if (sceneOptimizer) sceneOptimizer.dispose()
  if (sceneManager) sceneManager.dispose()
  sceneManager = null
  buildingRenderer = null
  roadRenderer = null
  fireRenderer = null
  evacuationRenderer = null
  vehicleRenderer = null
  cameraController = null
  sceneOptimizer = null
})

defineExpose({
  focusBuilding,
  focusFire,
  resetView,
  toggleViewMode,
  getFPS,
})
</script>

<style scoped>
.city-scene-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}
</style>

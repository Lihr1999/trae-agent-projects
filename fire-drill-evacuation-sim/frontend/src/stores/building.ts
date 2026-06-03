import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { buildingApi, floorApi, exitApi } from '@/services/api'
import type { Building, Floor, Exit } from '@/types'

export const useBuildingStore = defineStore('building', () => {
  const buildings = ref<Building[]>([])
  const currentBuilding = ref<Building | null>(null)
  const floors = ref<Floor[]>([])
  const exits = ref<Exit[]>([])

  const buildingsByRisk = computed(() => {
    const groups: Record<string, Building[]> = {}
    for (const b of buildings.value) {
      if (!groups[b.risk_level]) groups[b.risk_level] = []
      groups[b.risk_level].push(b)
    }
    return groups
  })

  const criticalBuildings = computed(() =>
    buildings.value.filter((b) => b.risk_level === 'critical' || b.risk_level === 'high')
  )

  async function fetchBuildings() {
    const res = await buildingApi.getAll()
    buildings.value = res.data
  }

  async function fetchBuilding(id: number) {
    const res = await buildingApi.getById(id)
    currentBuilding.value = res.data
  }

  async function createBuilding(data: Partial<Building>) {
    const res = await buildingApi.create(data)
    buildings.value.push(res.data)
    return res.data
  }

  async function updateBuilding(id: number, data: Partial<Building>) {
    const res = await buildingApi.update(id, data)
    const idx = buildings.value.findIndex((b) => b.id === id)
    if (idx !== -1) buildings.value[idx] = res.data
    if (currentBuilding.value?.id === id) currentBuilding.value = res.data
    return res.data
  }

  async function deleteBuilding(id: number) {
    await buildingApi.delete(id)
    buildings.value = buildings.value.filter((b) => b.id !== id)
    if (currentBuilding.value?.id === id) currentBuilding.value = null
  }

  async function fetchFloors(buildingId: number) {
    const res = await floorApi.getByBuilding(buildingId)
    floors.value = res.data
  }

  async function fetchExits(buildingId: number) {
    const res = await exitApi.getAll()
    exits.value = res.data.filter((e) => e.building_id === buildingId)
  }

  async function blockExit(id: number) {
    const res = await exitApi.block(id)
    const idx = exits.value.findIndex((e) => e.id === id)
    if (idx !== -1) exits.value[idx] = res.data
  }

  async function unblockExit(id: number) {
    const res = await exitApi.unblock(id)
    const idx = exits.value.findIndex((e) => e.id === id)
    if (idx !== -1) exits.value[idx] = res.data
  }

  return {
    buildings,
    currentBuilding,
    floors,
    exits,
    buildingsByRisk,
    criticalBuildings,
    fetchBuildings,
    fetchBuilding,
    createBuilding,
    updateBuilding,
    deleteBuilding,
    fetchFloors,
    fetchExits,
    blockExit,
    unblockExit
  }
})

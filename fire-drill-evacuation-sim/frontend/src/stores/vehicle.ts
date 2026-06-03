import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { vehicleApi, dispatchApi } from '@/services/api'
import type { RescueVehicle, DispatchTask } from '@/types'

export const useVehicleStore = defineStore('vehicle', () => {
  const vehicles = ref<RescueVehicle[]>([])
  const availableVehicles = ref<RescueVehicle[]>([])
  const dispatchTasks = ref<DispatchTask[]>([])

  const vehiclesByType = computed(() => {
    const groups: Record<string, RescueVehicle[]> = {}
    for (const v of vehicles.value) {
      if (!groups[v.vehicle_type]) groups[v.vehicle_type] = []
      groups[v.vehicle_type].push(v)
    }
    return groups
  })

  const vehiclesByStatus = computed(() => {
    const groups: Record<string, RescueVehicle[]> = {}
    for (const v of vehicles.value) {
      if (!groups[v.status]) groups[v.status] = []
      groups[v.status].push(v)
    }
    return groups
  })

  async function fetchVehicles() {
    const res = await vehicleApi.getAll()
    vehicles.value = res.data
  }

  async function fetchAvailable() {
    const res = await vehicleApi.getAvailable()
    availableVehicles.value = res.data
  }

  async function createVehicle(data: Partial<RescueVehicle>) {
    const res = await vehicleApi.create(data)
    vehicles.value.push(res.data)
    return res.data
  }

  async function updateVehicle(id: number, data: Partial<RescueVehicle>) {
    const res = await vehicleApi.update(id, data)
    const idx = vehicles.value.findIndex((v) => v.id === id)
    if (idx !== -1) vehicles.value[idx] = res.data
    return res.data
  }

  async function dispatchVehicle(id: number, data: { target_x: number; target_y: number; target_z: number; task_type: string }) {
    const res = await vehicleApi.dispatch(id, data)
    dispatchTasks.value.push(res.data)
    await fetchVehicles()
    return res.data
  }

  async function autoDispatch(fireId: number) {
    const res = await dispatchApi.autoDispatch(fireId)
    await fetchVehicles()
    await fetchTasks()
    return res.data
  }

  async function fetchTasks() {
    const res = await dispatchApi.getTasks()
    dispatchTasks.value = res.data
  }

  return {
    vehicles,
    availableVehicles,
    dispatchTasks,
    vehiclesByType,
    vehiclesByStatus,
    fetchVehicles,
    fetchAvailable,
    createVehicle,
    updateVehicle,
    dispatchVehicle,
    autoDispatch,
    fetchTasks
  }
})

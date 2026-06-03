import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { fireApi } from '@/services/api'
import type { FireIncident, FireSpreadResult } from '@/types'

export const useFireStore = defineStore('fire', () => {
  const fires = ref<FireIncident[]>([])
  const currentFire = ref<FireIncident | null>(null)
  const spreadResult = ref<FireSpreadResult | null>(null)

  const activeFires = computed(() =>
    fires.value.filter((f) => f.status === 'active')
  )

  async function fetchFires() {
    const res = await fireApi.getAll()
    fires.value = res.data
  }

  async function createFire(data: Partial<FireIncident>) {
    const res = await fireApi.create(data)
    fires.value.push(res.data)
    return res.data
  }

  async function updateFire(id: number, data: Partial<FireIncident>) {
    const res = await fireApi.update(id, data)
    const idx = fires.value.findIndex((f) => f.id === id)
    if (idx !== -1) fires.value[idx] = res.data
    if (currentFire.value?.id === id) currentFire.value = res.data
    return res.data
  }

  async function deleteFire(id: number) {
    await fireApi.delete(id)
    fires.value = fires.value.filter((f) => f.id !== id)
    if (currentFire.value?.id === id) currentFire.value = null
  }

  async function calculateSpread(id: number, params: { elapsed_minutes: number; weather_condition?: string }) {
    const res = await fireApi.calculateSpread(id, params)
    spreadResult.value = res.data
    return res.data
  }

  async function containFire(id: number) {
    const res = await fireApi.contain(id)
    const idx = fires.value.findIndex((f) => f.id === id)
    if (idx !== -1) fires.value[idx] = res.data
    if (currentFire.value?.id === id) currentFire.value = res.data
    return res.data
  }

  async function extinguishFire(id: number) {
    const res = await fireApi.extinguish(id)
    const idx = fires.value.findIndex((f) => f.id === id)
    if (idx !== -1) fires.value[idx] = res.data
    if (currentFire.value?.id === id) currentFire.value = res.data
    return res.data
  }

  return {
    fires,
    currentFire,
    spreadResult,
    activeFires,
    fetchFires,
    createFire,
    updateFire,
    deleteFire,
    calculateSpread,
    containFire,
    extinguishFire
  }
})

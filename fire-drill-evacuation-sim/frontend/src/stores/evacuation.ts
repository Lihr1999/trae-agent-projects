import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { evacuationApi } from '@/services/api'
import type { EvacuationRoute } from '@/types'

export const useEvacuationStore = defineStore('evacuation', () => {
  const routes = ref<EvacuationRoute[]>([])
  const isCalculating = ref<boolean>(false)

  const activeRoutes = computed(() =>
    routes.value.filter((r) => r.steps.length > 0)
  )

  async function calculateRoutes(buildingId: number, fireId: number) {
    isCalculating.value = true
    try {
      const res = await evacuationApi.calculateRoutes(buildingId, fireId)
      routes.value = res.data
      return res.data
    } finally {
      isCalculating.value = false
    }
  }

  async function updateRouteOnExitBlocked(exitId: number) {
    const res = await evacuationApi.updateRouteOnExitBlocked(exitId)
    routes.value = res.data
    return res.data
  }

  return {
    routes,
    isCalculating,
    activeRoutes,
    calculateRoutes,
    updateRouteOnExitBlocked
  }
})

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { drillApi } from '@/services/api'

export const useDrillStore = defineStore('drill', () => {
  const status = ref<string>('idle')
  const isRunning = ref<boolean>(false)
  const startTime = ref<string | null>(null)

  async function startDrill() {
    const res = await drillApi.start()
    isRunning.value = true
    status.value = 'running'
    startTime.value = new Date().toISOString()
    return res.data
  }

  async function endDrill() {
    const res = await drillApi.end()
    isRunning.value = false
    status.value = 'completed'
    return res.data
  }

  async function resetDrill(data?: Record<string, any>) {
    const res = await drillApi.reset(data)
    isRunning.value = false
    status.value = 'idle'
    startTime.value = null
    return res.data
  }

  async function fetchStatus() {
    const res = await drillApi.getStatus()
    const data = res.data as any
    status.value = data?.data?.status || 'idle'
    isRunning.value = status.value === 'running'
    startTime.value = data?.data?.start_time || null
    return data
  }

  return {
    status,
    isRunning,
    startTime,
    startDrill,
    endDrill,
    resetDrill,
    fetchStatus
  }
})

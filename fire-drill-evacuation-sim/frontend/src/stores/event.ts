import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { eventApi } from '@/services/api'
import type { EventLog } from '@/types'

export const useEventStore = defineStore('event', () => {
  const events = ref<EventLog[]>([])
  const timeline = ref<EventLog[]>([])

  const eventsByType = computed(() => {
    const groups: Record<string, EventLog[]> = {}
    for (const e of events.value) {
      if (!groups[e.event_type]) groups[e.event_type] = []
      groups[e.event_type].push(e)
    }
    return groups
  })

  const recentEvents = computed(() =>
    [...events.value].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 20)
  )

  async function fetchEvents(params?: { event_type?: string; skip?: number; limit?: number }) {
    const res = await eventApi.getAll(params)
    events.value = res.data
  }

  async function createEvent(data: Partial<EventLog>) {
    const res = await eventApi.create(data)
    events.value.push(res.data)
    return res.data
  }

  async function updateEvent(id: number, data: Partial<EventLog>) {
    const res = await eventApi.update(id, data)
    const idx = events.value.findIndex((e) => e.id === id)
    if (idx !== -1) events.value[idx] = res.data
    return res.data
  }

  async function fetchTimeline() {
    const res = await eventApi.getTimeline()
    timeline.value = res.data
  }

  return {
    events,
    timeline,
    eventsByType,
    recentEvents,
    fetchEvents,
    createEvent,
    updateEvent,
    fetchTimeline
  }
})

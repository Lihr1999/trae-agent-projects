<template>
  <div class="event-timeline">
    <div class="timeline-controls">
      <el-select v-model="filterType" placeholder="筛选事件类型" clearable size="small" class="filter-select" @change="handleFilter">
        <el-option label="火情检测" value="fire_detected" />
        <el-option label="疏散开始" value="evacuation_started" />
        <el-option label="车辆调度" value="vehicle_dispatched" />
        <el-option label="出口封锁" value="exit_blocked" />
        <el-option label="道路封锁" value="road_blocked" />
        <el-option label="车辆到达" value="vehicle_arrived" />
        <el-option label="火情控制" value="fire_contained" />
        <el-option label="火情扑灭" value="fire_extinguished" />
        <el-option label="演习开始" value="drill_start" />
        <el-option label="演习结束" value="drill_end" />
      </el-select>
      <el-input
        v-model="searchText"
        placeholder="搜索事件描述..."
        clearable
        size="small"
        :prefix-icon="Search"
        class="search-input"
        @input="handleSearch"
      />
    </div>

    <div class="timeline-scroll" ref="scrollRef">
      <div class="timeline-track">
        <div
          v-for="event in filteredEvents"
          :key="event.id"
          class="timeline-node"
          :class="`type-${event.event_type}`"
          @click="emit('select-event', event)"
        >
          <div class="node-dot" :style="{ backgroundColor: eventTypeColor(event.event_type) }">
            <span class="node-icon">{{ eventTypeIcon(event.event_type) }}</span>
          </div>
          <div class="node-content">
            <span class="node-time">{{ formatTime(event.timestamp) }}</span>
            <span class="node-desc">{{ event.description || eventTypeLabel(event.event_type) }}</span>
          </div>
        </div>
        <el-empty v-if="filteredEvents.length === 0" description="暂无事件记录" :image-size="40" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Search } from '@element-plus/icons-vue'
import type { EventLog } from '@/types'

const props = defineProps<{
  events: EventLog[]
}>()

const emit = defineEmits<{
  'select-event': [event: EventLog]
  filter: [type: string]
  search: [text: string]
}>()

const filterType = ref('')
const searchText = ref('')
const scrollRef = ref<HTMLElement | null>(null)

const filteredEvents = computed(() => {
  let list = [...props.events]
  if (filterType.value) {
    list = list.filter((e) => e.event_type === filterType.value)
  }
  if (searchText.value) {
    const q = searchText.value.toLowerCase()
    list = list.filter((e) => (e.description || '').toLowerCase().includes(q))
  }
  return list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
})

const eventTypeColor = (type: string) => {
  const map: Record<string, string> = {
    fire_detected: '#e63946',
    evacuation_started: '#f77f00',
    vehicle_dispatched: '#457b9d',
    exit_blocked: '#fcbf49',
    road_blocked: '#6c757d',
    vehicle_arrived: '#2d6a4f',
    fire_contained: '#52b788',
    fire_extinguished: '#2d6a4f',
    drill_start: '#8b5cf6',
    drill_end: '#8b5cf6'
  }
  return map[type] || '#8d99ae'
}

const eventTypeIcon = (type: string) => {
  const map: Record<string, string> = {
    fire_detected: '🔥',
    evacuation_started: '🏃',
    vehicle_dispatched: '🚒',
    exit_blocked: '🚫',
    road_blocked: '⛔',
    vehicle_arrived: '✅',
    fire_contained: '🛡️',
    fire_extinguished: '💧',
    drill_start: '▶️',
    drill_end: '⏹️'
  }
  return map[type] || '📋'
}

const eventTypeLabel = (type: string) => {
  const map: Record<string, string> = {
    fire_detected: '火情检测',
    evacuation_started: '疏散开始',
    vehicle_dispatched: '车辆调度',
    exit_blocked: '出口封锁',
    road_blocked: '道路封锁',
    vehicle_arrived: '车辆到达',
    fire_contained: '火情控制',
    fire_extinguished: '火情扑灭',
    drill_start: '演习开始',
    drill_end: '演习结束'
  }
  return map[type] || type
}

const formatTime = (timestamp: string) => {
  const d = new Date(timestamp)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

const handleFilter = () => {
  emit('filter', filterType.value)
}

const handleSearch = () => {
  emit('search', searchText.value)
}
</script>

<style scoped>
.event-timeline {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  padding: 8px 12px;
}

.timeline-controls {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  flex-shrink: 0;
}

.filter-select {
  width: 160px;
  flex-shrink: 0;
}

.search-input {
  width: 200px;
  flex-shrink: 0;
}

.timeline-scroll {
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
}

.timeline-track {
  display: flex;
  align-items: flex-start;
  gap: 2px;
  min-width: max-content;
  padding: 8px 0;
}

.timeline-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 100px;
  max-width: 140px;
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  transition: background 0.2s;
}

.timeline-node:hover {
  background: var(--bg-hover);
}

.node-dot {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.node-icon {
  font-size: 16px;
  line-height: 1;
}

.node-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  margin-top: 6px;
  text-align: center;
}

.node-time {
  font-size: 11px;
  color: var(--text-muted);
  font-family: monospace;
}

.node-desc {
  font-size: 12px;
  color: var(--text-primary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>

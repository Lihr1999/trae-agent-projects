<template>
  <div class="command-center">
    <StatusBar
      :is-running="drillStore.isRunning"
      :fps="currentFps"
      :drill-name="drillName"
      @start-drill="handleStartDrill"
      @stop-drill="handleStopDrill"
      @reset-drill="handleResetDrill"
      @toggle-view="handleToggleView"
    />

    <div class="command-body">
      <div class="left-panel" :class="{ collapsed: leftCollapsed }">
        <button class="toggle-btn toggle-left" @click="leftCollapsed = !leftCollapsed">
          {{ leftCollapsed ? '▶' : '◀' }}
        </button>
        <div v-show="!leftCollapsed" class="panel-content">
          <BuildingPanel
            :buildings="buildingStore.buildings"
            v-model="selectedBuildingId"
            @select="handleBuildingSelect"
          />
        </div>
      </div>

      <div class="center-area">
        <CityScene
          ref="citySceneRef"
          :buildings="buildingStore.buildings"
          :roads="roads"
          :fires="fireStore.fires"
          :exits="buildingStore.exits"
          :vehicles="vehicleStore.vehicles"
          :people-groups="peopleGroups"
          :evacuation-routes="evacuationStore.routes"
          @building-click="handleBuildingClick"
          @road-click="handleRoadClick"
          @exit-click="handleExitClick"
          @vehicle-click="handleVehicleClick"
        />

        <div v-if="selectedBuilding" class="building-detail-overlay">
          <BuildingDetail
            :building="selectedBuilding"
            :floors="buildingStore.floors"
            :exits="buildingStore.exits"
            @close="handleCloseBuildingDetail"
            @block-exit="handleBlockExit"
            @unblock-exit="handleUnblockExit"
          />
        </div>
      </div>

      <div class="right-panel" :class="{ collapsed: rightCollapsed }">
        <button class="toggle-btn toggle-right" @click="rightCollapsed = !rightCollapsed">
          {{ rightCollapsed ? '◀' : '▶' }}
        </button>
        <div v-show="!rightCollapsed" class="panel-content">
          <el-tabs v-model="rightActiveTab" class="right-tabs">
            <el-tab-pane label="火情" name="fire">
              <FirePanel
                :fires="fireStore.fires"
                v-model="selectedFireId"
                @select="handleFireSelect"
                @create="handleFireCreate"
                @calculate-spread="handleCalculateSpread"
                @contain="handleContainFire"
                @extinguish="handleExtinguishFire"
              />
            </el-tab-pane>
            <el-tab-pane label="调度" name="dispatch">
              <DispatchPanel
                :vehicles="vehicleStore.vehicles"
                :tasks="vehicleStore.dispatchTasks"
                @dispatch="handleDispatch"
                @auto-dispatch="handleAutoDispatch"
                @cancel-task="handleCancelTask"
              />
            </el-tab-pane>
            <el-tab-pane label="疏散" name="evacuation">
              <EvacuationPanel
                :routes="evacuationStore.routes"
                :buildings="buildingStore.buildings"
                @evacuate="handleEvacuateBuilding"
                @evacuate-all="handleEvacuateAll"
                @update-priority="handleUpdatePriority"
              />
            </el-tab-pane>
            <el-tab-pane label="人员" name="people">
              <PeopleDensityPanel
                :people-groups="peopleGroups"
                @add="handleAddPeople"
                @update="handleUpdatePeople"
                @delete="handleDeletePeople"
                @evacuate="handleEvacuatePeople"
              />
            </el-tab-pane>
          </el-tabs>
        </div>
      </div>
    </div>

    <div class="bottom-panel" :class="{ collapsed: bottomCollapsed }">
      <button class="toggle-btn toggle-bottom" @click="bottomCollapsed = !bottomCollapsed">
        {{ bottomCollapsed ? '▲' : '▼' }}
      </button>
      <div v-show="!bottomCollapsed" class="timeline-content">
        <EventTimeline
          :events="eventStore.events"
          @select-event="handleSelectEvent"
          @filter="handleFilterEvent"
          @search="handleSearchEvent"
        />
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useBuildingStore } from '@/stores/building'
import { useFireStore } from '@/stores/fire'
import { useVehicleStore } from '@/stores/vehicle'
import { useEventStore } from '@/stores/event'
import { useDrillStore } from '@/stores/drill'
import { useEvacuationStore } from '@/stores/evacuation'
import { useAuthStore } from '@/stores/auth'
import { roadApi, peopleApi } from '@/services/api'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { Building, Road, PeopleGroup, FireIncident, RescueVehicle, Exit } from '@/types'

import StatusBar from '@/components/common/StatusBar.vue'
import CityScene from '@/components/three/CityScene.vue'
import BuildingPanel from '@/components/building/BuildingPanel.vue'
import BuildingDetail from '@/components/building/BuildingDetail.vue'
import FirePanel from '@/components/fire/FirePanel.vue'
import DispatchPanel from '@/components/dispatch/DispatchPanel.vue'
import EvacuationPanel from '@/components/evacuation/EvacuationPanel.vue'
import PeopleDensityPanel from '@/components/evacuation/PeopleDensityPanel.vue'
import EventTimeline from '@/components/timeline/EventTimeline.vue'

const router = useRouter()
const buildingStore = useBuildingStore()
const fireStore = useFireStore()
const vehicleStore = useVehicleStore()
const eventStore = useEventStore()
const drillStore = useDrillStore()
const evacuationStore = useEvacuationStore()
const authStore = useAuthStore()

const citySceneRef = ref<InstanceType<typeof CityScene> | null>(null)

const leftCollapsed = ref(false)
const rightCollapsed = ref(false)
const bottomCollapsed = ref(false)
const rightActiveTab = ref('fire')
const selectedBuildingId = ref<number | null>(null)
const selectedFireId = ref<number | null>(null)
const selectedBuilding = ref<Building | null>(null)
const currentFps = ref(0)

const roads = ref<Road[]>([])
const peopleGroups = ref<PeopleGroup[]>([])

const drillName = computed(() => {
  if (!drillStore.isRunning) return '待命状态'
  return `消防演练 ${drillStore.startTime ? new Date(drillStore.startTime).toLocaleDateString('zh-CN') : ''}`
})

let pollTimer: ReturnType<typeof setInterval> | null = null
let fpsTimer: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  await loadAllData()
  startFpsPolling()
})

onUnmounted(() => {
  stopPolling()
  stopFpsPolling()
})

async function loadAllData() {
  try {
    const [, roadsRes, peopleRes] = await Promise.all([
      Promise.all([
        buildingStore.fetchBuildings(),
        fireStore.fetchFires(),
        vehicleStore.fetchVehicles(),
        vehicleStore.fetchAvailable(),
        vehicleStore.fetchTasks(),
        eventStore.fetchEvents(),
        drillStore.fetchStatus()
      ]),
      roadApi.getAll().catch(() => ({ data: [] })),
      peopleApi.getAll().catch(() => ({ data: [] }))
    ])
    roads.value = roadsRes.data
    peopleGroups.value = peopleRes.data
  } catch (err: any) {
    ElMessage.error('加载数据失败')
  }
}

function startPolling() {
  if (pollTimer) return
  pollTimer = setInterval(async () => {
    if (!drillStore.isRunning) return
    try {
      await Promise.all([
        buildingStore.fetchBuildings(),
        fireStore.fetchFires(),
        vehicleStore.fetchVehicles(),
        vehicleStore.fetchTasks(),
        eventStore.fetchEvents()
      ])
      const peopleRes = await peopleApi.getAll()
      peopleGroups.value = peopleRes.data
    } catch {}
  }, 5000)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

function startFpsPolling() {
  fpsTimer = setInterval(() => {
    if (citySceneRef.value) {
      currentFps.value = citySceneRef.value.getFPS()
    }
  }, 1000)
}

function stopFpsPolling() {
  if (fpsTimer) {
    clearInterval(fpsTimer)
    fpsTimer = null
  }
}

async function handleStartDrill() {
  try {
    await drillStore.startDrill()
    startPolling()
    await eventStore.createEvent({
      event_type: 'drill_start',
      description: '消防演练正式开始',
      operator_name: authStore.user?.username || '系统'
    })
    ElMessage.success('演练已开始')
  } catch (err: any) {
    ElMessage.error(err.response?.data?.detail || '启动演练失败')
  }
}

async function handleStopDrill() {
  try {
    await ElMessageBox.confirm('确定要结束当前演练吗？', '确认结束演练', { type: 'warning' })
    await drillStore.endDrill()
    stopPolling()
    await eventStore.createEvent({
      event_type: 'drill_end',
      description: '消防演练已结束',
      operator_name: authStore.user?.username || '系统'
    })
    ElMessage.success('演练已结束')
  } catch {}
}

async function handleResetDrill() {
  try {
    await ElMessageBox.confirm('确定要重置演练数据吗？此操作不可恢复。', '警告', { type: 'warning' })
    await drillStore.resetDrill()
    stopPolling()
    selectedBuilding.value = null
    selectedBuildingId.value = null
    selectedFireId.value = null
    await loadAllData()
    ElMessage.success('演练已重置')
  } catch {}
}

function handleToggleView(mode: string) {
  citySceneRef.value?.toggleViewMode()
}

function handleBuildingSelect(building: Building) {
  selectedBuildingId.value = building.id
  citySceneRef.value?.focusBuilding(building.id)
}

function handleBuildingClick(building: Building) {
  selectedBuilding.value = building
  selectedBuildingId.value = building.id
  buildingStore.fetchFloors(building.id)
  buildingStore.fetchExits(building.id)
  citySceneRef.value?.focusBuilding(building.id)
}

function handleRoadClick(road: Road) {
  ElMessage.info(`道路 #${road.id} - 状态: ${road.status === 'clear' ? '畅通' : '阻塞'}`)
}

function handleExitClick(exit: Exit) {
  if (exit.status === 'blocked') {
    ElMessage.warning(`出口 #${exit.id} 已被封锁`)
  } else if (exit.status === 'congested') {
    ElMessage.warning(`出口 #${exit.id} 拥堵中`)
  } else {
    ElMessage.info(`出口 #${exit.id} 正常`)
  }
}

function handleVehicleClick(vehicle: RescueVehicle) {
  const statusMap: Record<string, string> = {
    idle: '待命', dispatched: '已调度', en_route: '前往中', on_site: '到场', returning: '返回中'
  }
  ElMessage.info(`${vehicle.vehicle_number} - ${statusMap[vehicle.status] || vehicle.status}`)
}

function handleCloseBuildingDetail() {
  selectedBuilding.value = null
}

async function handleBlockExit(exitId: number) {
  try {
    await buildingStore.blockExit(exitId)
    await evacuationStore.updateRouteOnExitBlocked(exitId)
    await eventStore.createEvent({
      event_type: 'exit_blocked',
      description: `出口 #${exitId} 已封锁，疏散路线已更新`,
      related_object_id: exitId,
      operator_name: authStore.user?.username || '系统'
    })
    ElMessage.warning(`出口 #${exitId} 已封锁，疏散路线已重新计算`)
  } catch (err: any) {
    ElMessage.error('封锁出口失败')
  }
}

async function handleUnblockExit(exitId: number) {
  try {
    await buildingStore.unblockExit(exitId)
    await eventStore.createEvent({
      event_type: 'exit_blocked',
      description: `出口 #${exitId} 已解除封锁`,
      related_object_id: exitId,
      operator_name: authStore.user?.username || '系统'
    })
    ElMessage.success(`出口 #${exitId} 已解除封锁`)
  } catch (err: any) {
    ElMessage.error('解除封锁失败')
  }
}

function handleFireSelect(fire: FireIncident) {
  selectedFireId.value = fire.id
  citySceneRef.value?.focusFire(fire.id)
}

async function handleFireCreate(data: Partial<FireIncident>) {
  try {
    const fire = await fireStore.createFire(data)
    await fireStore.calculateSpread(fire.id, { elapsed_minutes: 10 })
    await eventStore.createEvent({
      event_type: 'fire_detected',
      description: `新火情 detected at (${fire.position_x}, ${fire.position_y}, ${fire.position_z})，等级 ${fire.fire_level}`,
      related_object_id: fire.id,
      operator_name: authStore.user?.username || '系统'
    })
    selectedFireId.value = fire.id
    rightActiveTab.value = 'fire'
    ElMessage.success('火情已创建')
  } catch (err: any) {
    ElMessage.error('创建火情失败')
  }
}

async function handleCalculateSpread(params: { fireId: number; elapsed_minutes: number; weather_condition: string }) {
  try {
    await fireStore.calculateSpread(params.fireId, {
      elapsed_minutes: params.elapsed_minutes,
      weather_condition: params.weather_condition
    })
    ElMessage.success('扩散计算完成')
  } catch (err: any) {
    ElMessage.error('计算扩散失败')
  }
}

async function handleContainFire(fireId: number) {
  try {
    await fireStore.containFire(fireId)
    await eventStore.createEvent({
      event_type: 'fire_contained',
      description: `火情 #${fireId} 已控制`,
      related_object_id: fireId,
      operator_name: authStore.user?.username || '系统'
    })
    ElMessage.success('火情已控制')
  } catch (err: any) {
    ElMessage.error('控制火情失败')
  }
}

async function handleExtinguishFire(fireId: number) {
  try {
    await fireStore.extinguishFire(fireId)
    await eventStore.createEvent({
      event_type: 'fire_extinguished',
      description: `火情 #${fireId} 已扑灭`,
      related_object_id: fireId,
      operator_name: authStore.user?.username || '系统'
    })
    ElMessage.success('火情已扑灭')
  } catch (err: any) {
    ElMessage.error('扑灭火情失败')
  }
}

async function handleDispatch(params: { vehicleId: number; target: { target_x: number; target_y: number; target_z: number; task_type: string } }) {
  try {
    await vehicleStore.dispatchVehicle(params.vehicleId, params.target)
    await eventStore.createEvent({
      event_type: 'vehicle_dispatched',
      description: `车辆 #${params.vehicleId} 已调度，任务: ${params.target.task_type}`,
      related_object_id: params.vehicleId,
      operator_name: authStore.user?.username || '系统'
    })
    ElMessage.success('车辆调度成功')
  } catch (err: any) {
    ElMessage.error('调度失败')
  }
}

async function handleAutoDispatch() {
  try {
    const activeFire = fireStore.activeFires[0]
    if (!activeFire) {
      ElMessage.warning('没有活跃火情，无法自动调度')
      return
    }
    await vehicleStore.autoDispatch(activeFire.id)
    await eventStore.createEvent({
      event_type: 'vehicle_dispatched',
      description: `自动调度车辆前往火情 #${activeFire.id}`,
      related_object_id: activeFire.id,
      operator_name: '系统'
    })
    ElMessage.success('自动调度完成')
  } catch (err: any) {
    ElMessage.error('自动调度失败')
  }
}

async function handleCancelTask(taskId: number) {
  try {
    await eventStore.createEvent({
      event_type: 'vehicle_dispatched',
      description: `任务 #${taskId} 已取消`,
      related_object_id: taskId,
      operator_name: authStore.user?.username || '系统'
    })
    await vehicleStore.fetchTasks()
    ElMessage.success('任务已取消')
  } catch (err: any) {
    ElMessage.error('取消任务失败')
  }
}

async function handleEvacuateBuilding(buildingId: number) {
  try {
    const activeFire = fireStore.activeFires[0]
    if (activeFire) {
      await evacuationStore.calculateRoutes(buildingId, activeFire.id)
    }
    await peopleApi.evacuate(buildingId)
    await eventStore.createEvent({
      event_type: 'evacuation_started',
      description: `建筑 #${buildingId} 开始疏散`,
      related_object_id: buildingId,
      operator_name: authStore.user?.username || '系统'
    })
    const peopleRes = await peopleApi.getAll()
    peopleGroups.value = peopleRes.data
    ElMessage.success('疏散指令已下达')
  } catch (err: any) {
    ElMessage.error('疏散失败')
  }
}

async function handleEvacuateAll() {
  try {
    const activeFire = fireStore.activeFires[0]
    for (const building of buildingStore.buildings) {
      if (activeFire) {
        await evacuationStore.calculateRoutes(building.id, activeFire.id)
      }
      await peopleApi.evacuate(building.id)
    }
    await eventStore.createEvent({
      event_type: 'evacuation_started',
      description: '全员疏散指令已下达',
      operator_name: authStore.user?.username || '系统'
    })
    const peopleRes = await peopleApi.getAll()
    peopleGroups.value = peopleRes.data
    ElMessage.success('全员疏散指令已下达')
  } catch (err: any) {
    ElMessage.error('全员疏散失败')
  }
}

function handleUpdatePriority(params: { buildingId: number; priority: number }) {
  ElMessage.info(`建筑 #${params.buildingId} 疏散优先级已调整为 ${params.priority}`)
}

async function handleAddPeople(data: Partial<PeopleGroup>) {
  try {
    await peopleApi.create(data)
    const peopleRes = await peopleApi.getAll()
    peopleGroups.value = peopleRes.data
    ElMessage.success('人员组已添加')
  } catch (err: any) {
    ElMessage.error('添加人员组失败')
  }
}

async function handleUpdatePeople(data: PeopleGroup) {
  try {
    await peopleApi.update(data.id, data)
    const peopleRes = await peopleApi.getAll()
    peopleGroups.value = peopleRes.data
  } catch (err: any) {
    ElMessage.error('更新人员组失败')
  }
}

async function handleDeletePeople(id: number) {
  try {
    await peopleApi.delete(id)
    const peopleRes = await peopleApi.getAll()
    peopleGroups.value = peopleRes.data
    ElMessage.success('人员组已删除')
  } catch (err: any) {
    ElMessage.error('删除人员组失败')
  }
}

async function handleEvacuatePeople(id: number) {
  try {
    const group = peopleGroups.value.find(g => g.id === id)
    if (group) {
      const building = buildingStore.buildings.find(b =>
        b.position_x === group.position_x && b.position_z === group.position_z
      )
      if (building) {
        await peopleApi.evacuate(building.id)
      }
    }
    const peopleRes = await peopleApi.getAll()
    peopleGroups.value = peopleRes.data
    ElMessage.success('疏散指令已下达')
  } catch (err: any) {
    ElMessage.error('疏散失败')
  }
}

function handleSelectEvent(event: any) {
  if (event.related_object_id) {
    const fire = fireStore.fires.find(f => f.id === event.related_object_id)
    if (fire) {
      selectedFireId.value = fire.id
      rightActiveTab.value = 'fire'
      citySceneRef.value?.focusFire(fire.id)
    }
  }
}

function handleFilterEvent(_type: string) {}

function handleSearchEvent(_text: string) {}
</script>

<style scoped>
.command-center {
  width: 100%;
  height: 100vh;
  display: grid;
  grid-template-rows: 48px 1fr auto;
  grid-template-columns: 1fr;
  background: var(--bg-primary);
  overflow: hidden;
}

.command-body {
  display: grid;
  grid-template-columns: auto 1fr auto;
  overflow: hidden;
  min-height: 0;
}

.left-panel {
  width: 280px;
  position: relative;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border-color);
  background: var(--bg-secondary);
  transition: width 0.3s ease;
}

.left-panel.collapsed {
  width: 36px;
}

.right-panel {
  width: 320px;
  position: relative;
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--border-color);
  background: var(--bg-secondary);
  transition: width 0.3s ease;
}

.right-panel.collapsed {
  width: 36px;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  min-width: 0;
}

.right-tabs {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.right-tabs :deep(.el-tabs__content) {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.right-tabs :deep(.el-tab-pane) {
  height: 100%;
}

.toggle-btn {
  position: absolute;
  z-index: 10;
  width: 24px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 10px;
  transition: all 0.2s;
}

.toggle-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.toggle-left {
  right: -24px;
  top: 50%;
  transform: translateY(-50%);
  border-radius: 0 4px 4px 0;
}

.toggle-right {
  left: -24px;
  top: 50%;
  transform: translateY(-50%);
  border-radius: 4px 0 0 4px;
}

.center-area {
  position: relative;
  overflow: hidden;
  min-width: 0;
  min-height: 0;
}

.building-detail-overlay {
  position: absolute;
  top: 12px;
  left: 12px;
  width: 340px;
  max-height: calc(100% - 24px);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  z-index: 20;
  animation: slideInLeft 0.25s ease;
}

.bottom-panel {
  height: 200px;
  position: relative;
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--border-color);
  background: var(--bg-secondary);
  transition: height 0.3s ease;
}

.bottom-panel.collapsed {
  height: 36px;
}

.toggle-bottom {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  top: -24px;
  width: 48px;
  height: 24px;
  border-radius: 4px 4px 0 0;
  z-index: 10;
}

.timeline-content {
  flex: 1;
  overflow: hidden;
}
</style>

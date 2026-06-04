<script lang="ts">
  import type { Floor, Rack, Robot, Location, Task } from '../types';
  import WarehouseCanvas from '../components/WarehouseCanvas.svelte';
  import TaskPanel from '../components/TaskPanel.svelte';
  import StatsCard from '../components/StatsCard.svelte';
  import { api } from '../services/api';

  export let currentFloor: Floor | null = null;
  export let racks: Rack[] = [];
  export let robots: Robot[] = [];
  export let locations: Location[] = [];
  export let tasks: Task[] = [];
  export let robotStats: { total: number; idle: number; busy: number; charging: number; error: number };
  export let taskStats: { total: number; pending: number; assigned: number; inProgress: number; completed: number };
  export let isSimulationRunning: boolean;

  let selectedLocation: Location | null = null;
  let selectedSku: any = null;

  async function handleRackMove(rackId: string, x: number, y: number): Promise<void> {
    try {
      await api.updateRack(rackId, { x, y });
    } catch (error) {
      console.error('Failed to move rack:', error);
    }
  }

  function handleLocationSelect(location: Location | null): void {
    selectedLocation = location;
    if (location && location.skuId) {
      api.getSKUs().then((skus) => {
        selectedSku = skus.find((s) => s.id === location.skuId);
      });
    } else {
      selectedSku = null;
    }
  }

  async function startSimulation(): Promise<void> {
    await api.startSimulation();
  }

  async function stopSimulation(): Promise<void> {
    await api.stopSimulation();
  }

  async function generateWaves(): Promise<void> {
    await api.generateWaves();
  }

  async function assignTasks(): Promise<void> {
    await api.assignTasks();
  }
</script>

<div class="warehouse-view">
  <div class="header">
    <div class="title">
      <h2>仓库视图</h2>
      <span class="floor-name">{currentFloor?.name}</span>
    </div>
    <div class="actions">
      <button class="btn btn-primary" on:click={generateWaves}>
        生成波次
      </button>
      <button class="btn btn-secondary" on:click={assignTasks}>
        分配任务
      </button>
      {#if isSimulationRunning}
        <button class="btn btn-danger" on:click={stopSimulation}>
          停止模拟
        </button>
      {:else}
        <button class="btn btn-success" on:click={startSimulation}>
          开始模拟
        </button>
      {/if}
    </div>
  </div>

  <div class="stats-row">
    <StatsCard title="机器人总数" value={robotStats.total} icon="🤖" color="#3b82f6" />
    <StatsCard title="空闲" value={robotStats.idle} icon="✅" color="#22c55e" />
    <StatsCard title="忙碌" value={robotStats.busy} icon="⚙️" color="#f59e0b" />
    <StatsCard title="任务总数" value={taskStats.total} icon="📋" color="#8b5cf6" />
    <StatsCard title="执行中" value={taskStats.inProgress} icon="🔄" color="#06b6d4" />
    <StatsCard title="已完成" value={taskStats.completed} icon="🎉" color="#10b981" />
  </div>

  <div class="main-content">
    <div class="canvas-container">
      <WarehouseCanvas
        racks={racks}
        robots={robots}
        locations={locations}
        floorWidth={currentFloor?.width || 50}
        floorHeight={currentFloor?.height || 40}
        {selectedLocation}
        onLocationSelect={handleLocationSelect}
        onRackMove={handleRackMove}
      />
    </div>

    <div class="side-panels">
      {#if selectedLocation}
        <div class="location-panel">
          <h3>库位信息</h3>
          <div class="info-row">
            <span class="label">库位编号:</span>
            <span class="value">{selectedLocation.code}</span>
          </div>
          <div class="info-row">
            <span class="label">状态:</span>
            <span class="value status-{selectedLocation.status}">{selectedLocation.status}</span>
          </div>
          <div class="info-row">
            <span class="label">库存:</span>
            <span class="value">{selectedLocation.quantity}/{selectedLocation.maxQuantity}</span>
          </div>
          {#if selectedSku}
            <div class="sku-info">
              <h4>商品信息</h4>
              <div class="info-row">
                <span class="label">名称:</span>
                <span class="value">{selectedSku.name}</span>
              </div>
              <div class="info-row">
                <span class="label">编码:</span>
                <span class="value">{selectedSku.code}</span>
              </div>
              <div class="info-row">
                <span class="label">分类:</span>
                <span class="value">{selectedSku.category}</span>
              </div>
            </div>
          {/if}
        </div>
      {/if}

      <TaskPanel {tasks} />
    </div>
  </div>
</div>

<style>
  .warehouse-view {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px;
    overflow: hidden;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .title {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .title h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: #1e293b;
  }

  .floor-name {
    padding: 4px 12px;
    background: #e0e7ff;
    color: #4338ca;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 500;
  }

  .actions {
    display: flex;
    gap: 8px;
  }

  .btn {
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary {
    background: #3b82f6;
    color: white;
  }

  .btn-primary:hover {
    background: #2563eb;
  }

  .btn-secondary {
    background: #6366f1;
    color: white;
  }

  .btn-secondary:hover {
    background: #4f46e5;
  }

  .btn-success {
    background: #22c55e;
    color: white;
  }

  .btn-success:hover {
    background: #16a34a;
  }

  .btn-danger {
    background: #ef4444;
    color: white;
  }

  .btn-danger:hover {
    background: #dc2626;
  }

  .stats-row {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 12px;
  }

  .main-content {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 16px;
    overflow: hidden;
  }

  .canvas-container {
    min-height: 0;
  }

  .side-panels {
    display: flex;
    flex-direction: column;
    gap: 16px;
    overflow-y: auto;
  }

  .location-panel {
    background: white;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .location-panel h3 {
    margin: 0 0 12px;
    font-size: 14px;
    font-weight: 600;
    color: #1e293b;
  }

  .location-panel h4 {
    margin: 12px 0 8px;
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    font-size: 13px;
  }

  .label {
    color: #64748b;
  }

  .value {
    color: #1e293b;
    font-weight: 500;
  }

  .status-occupied {
    color: #22c55e;
  }

  .status-empty {
    color: #6b7280;
  }

  .status-reserved {
    color: #f59e0b;
  }

  .status-blocked {
    color: #ef4444;
  }

  .sku-info {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #e2e8f0;
  }
</style>

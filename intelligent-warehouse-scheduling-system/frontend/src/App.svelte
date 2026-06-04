<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Sidebar from './components/Sidebar.svelte';
  import WarehouseView from './pages/WarehouseView.svelte';
  import WaveManagement from './pages/WaveManagement.svelte';
  import InventoryView from './pages/InventoryView.svelte';
  import ExceptionView from './pages/ExceptionView.svelte';
  import LogView from './pages/LogView.svelte';
  import {
    floors,
    racks,
    locations,
    robots,
    tasks,
    waves,
    exceptions,
    skus,
    orders,
    logs,
    currentFloorId,
    currentFloor,
    currentFloorRacks,
    currentFloorRobots,
    robotStats,
    taskStats,
    isSimulationRunning,
    loading,
    loadAllData,
    setupWebSocketHandlers,
    cleanup,
  } from './stores/warehouseStore';

  let currentPage = 'warehouse';

  function handlePageChange(page: string): void {
    currentPage = page;
  }

  function handleFloorChange(floorId: string): void {
    currentFloorId.set(floorId);
  }

  onMount(async () => {
    await loadAllData();
    setupWebSocketHandlers();
  });

  onDestroy(() => {
    cleanup();
  });
</script>

<div class="app">
  <Sidebar
    floors={$floors}
    currentFloorId={$currentFloorId}
    currentPage={currentPage}
    onFloorChange={handleFloorChange}
    onPageChange={handlePageChange}
  />

  <main class="main-content">
    {#if $loading}
      <div class="loading">
        <div class="spinner" />
        <p>加载中...</p>
      </div>
    {:else if currentPage === 'warehouse'}
      <WarehouseView
        currentFloor={$currentFloor}
        racks={$currentFloorRacks}
        robots={$currentFloorRobots}
        locations={$locations}
        tasks={$tasks}
        robotStats={$robotStats}
        taskStats={$taskStats}
        isSimulationRunning={$isSimulationRunning}
      />
    {:else if currentPage === 'waves'}
      <WaveManagement waves={$waves} orders={$orders} tasks={$tasks} />
    {:else if currentPage === 'inventory'}
      <InventoryView locations={$locations} skus={$skus} racks={$racks} />
    {:else if currentPage === 'exceptions'}
      <ExceptionView exceptions={$exceptions} />
    {:else if currentPage === 'logs'}
      <LogView logs={$logs} />
    {/if}
  </main>
</div>

<style>
  .app {
    display: flex;
    height: 100vh;
    overflow: hidden;
  }

  .main-content {
    flex: 1;
    display: flex;
    background: #f1f5f9;
    overflow: hidden;
  }

  .loading {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
  }

  .spinner {
    width: 48px;
    height: 48px;
    border: 4px solid #e2e8f0;
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .loading p {
    margin: 0;
    color: #64748b;
    font-size: 14px;
  }
</style>

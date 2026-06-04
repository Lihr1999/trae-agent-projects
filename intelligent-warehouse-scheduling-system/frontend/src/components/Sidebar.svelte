<script lang="ts">
  import type { Floor } from '../types';

  export let floors: Floor[] = [];
  export let currentFloorId: string | null = null;
  export let onFloorChange: (floorId: string) => void = () => {};
  export let currentPage: string = 'warehouse';
  export let onPageChange: (page: string) => void = () => {};

  const menuItems = [
    { id: 'warehouse', name: '仓库视图', icon: '🏭' },
    { id: 'waves', name: '波次管理', icon: '📦' },
    { id: 'inventory', name: '库存管理', icon: '📊' },
    { id: 'exceptions', name: '异常事件', icon: '⚠️' },
    { id: 'logs', name: '调度日志', icon: '📋' },
  ];
</script>

<div class="sidebar">
  <div class="logo">
    <h1>智能仓储</h1>
    <p>调度系统</p>
  </div>

  <nav class="menu">
    {#each menuItems as item}
      <button
        class={currentPage === item.id ? 'active' : ''}
        on:click={() => onPageChange(item.id)}
      >
        <span class="icon">{item.icon}</span>
        <span class="text">{item.name}</span>
      </button>
    {/each}
  </nav>

  <div class="floor-selector">
    <h3>楼层选择</h3>
    <div class="floor-buttons">
      {#each floors as floor}
        <button
          class={currentFloorId === floor.id ? 'active' : ''}
          on:click={() => onFloorChange(floor.id)}
        >
          {floor.name}
        </button>
      {/each}
    </div>
  </div>
</div>

<style>
  .sidebar {
    width: 240px;
    background: linear-gradient(180deg, #1e3a5f 0%, #0f172a 100%);
    color: white;
    display: flex;
    flex-direction: column;
    height: 100vh;
  }

  .logo {
    padding: 24px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .logo h1 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
  }

  .logo p {
    margin: 4px 0 0;
    font-size: 12px;
    opacity: 0.7;
  }

  .menu {
    flex: 1;
    padding: 16px 0;
  }

  .menu button {
    width: 100%;
    padding: 12px 24px;
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.7);
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 14px;
  }

  .menu button:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }

  .menu button.active {
    background: #3b82f6;
    color: white;
  }

  .menu .icon {
    font-size: 18px;
  }

  .floor-selector {
    padding: 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .floor-selector h3 {
    margin: 0 0 12px;
    font-size: 12px;
    text-transform: uppercase;
    opacity: 0.7;
  }

  .floor-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .floor-buttons button {
    padding: 8px 16px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    color: white;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 13px;
  }

  .floor-buttons button:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .floor-buttons button.active {
    background: #3b82f6;
    border-color: #3b82f6;
  }
</style>

<script lang="ts">
  import type { Location, SKU, Rack } from '../types';
  import { onMount } from 'svelte';
  import * as echarts from 'echarts';

  export let locations: Location[] = [];
  export let skus: SKU[] = [];
  export let racks: Rack[] = [];

  let chartContainer: HTMLDivElement;
  let chart: echarts.ECharts | null = null;
  let searchQuery = '';
  let statusFilter = '';

  $: filteredLocations = locations.filter((loc) => {
    const sku = skus.find((s) => s.id === loc.skuId);
    const matchesSearch =
      searchQuery === '' ||
      loc.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sku?.name.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === '' || loc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  $: inventoryStats = {
    total: locations.length,
    occupied: locations.filter((l) => l.status === 'occupied').length,
    empty: locations.filter((l) => l.status === 'empty').length,
    reserved: locations.filter((l) => l.status === 'reserved').length,
    utilization: locations.length > 0
      ? Math.round((locations.filter((l) => l.status === 'occupied').length / locations.length) * 100)
      : 0,
  };

  onMount(() => {
    initChart();
  });

  function initChart(): void {
    if (!chartContainer) return;

    chart = echarts.init(chartContainer);
    updateChart();
  }

  function updateChart(): void {
    if (!chart) return;

    const categoryStats: Record<string, number> = {};
    for (const loc of locations) {
      if (loc.status === 'occupied' && loc.skuId) {
        const sku = skus.find((s) => s.id === loc.skuId);
        if (sku) {
          categoryStats[sku.category] = (categoryStats[sku.category] || 0) + loc.quantity;
        }
      }
    }

    chart.setOption({
      tooltip: {
        trigger: 'item',
      },
      legend: {
        orient: 'vertical',
        left: 'left',
      },
      series: [
        {
          name: '库存分布',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2,
          },
          label: {
            show: false,
            position: 'center',
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 20,
              fontWeight: 'bold',
            },
          },
          labelLine: {
            show: false,
          },
          data: Object.entries(categoryStats).map(([name, value]) => ({ name, value })),
        },
      ],
    });
  }

  $: {
    if (chart) {
      updateChart();
    }
  }
</script>

<div class="inventory-view">
  <div class="header">
    <h2>库存管理</h2>
    <div class="filters">
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="搜索库位或商品..."
        class="search-input"
      />
      <select bind:value={statusFilter} class="status-select">
        <option value="">全部状态</option>
        <option value="occupied">已占用</option>
        <option value="empty">空</option>
        <option value="reserved">已预留</option>
      </select>
    </div>
  </div>

  <div class="stats-row">
    <div class="stat-card">
      <div class="stat-value">{inventoryStats.total}</div>
      <div class="stat-label">总库位数</div>
    </div>
    <div class="stat-card occupied">
      <div class="stat-value">{inventoryStats.occupied}</div>
      <div class="stat-label">已占用</div>
    </div>
    <div class="stat-card empty">
      <div class="stat-value">{inventoryStats.empty}</div>
      <div class="stat-label">空闲</div>
    </div>
    <div class="stat-card reserved">
      <div class="stat-value">{inventoryStats.reserved}</div>
      <div class="stat-label">已预留</div>
    </div>
    <div class="stat-card utilization">
      <div class="stat-value">{inventoryStats.utilization}%</div>
      <div class="stat-label">利用率</div>
    </div>
  </div>

  <div class="content">
    <div class="chart-panel">
      <h3>库存分类分布</h3>
      <div bind:this={chartContainer} class="chart-container" />
    </div>

    <div class="location-list">
      <h3>库位列表</h3>
      <div class="list-header">
        <span>库位编号</span>
        <span>货架</span>
        <span>状态</span>
        <span>商品</span>
        <span>库存</span>
      </div>
      <div class="list-body">
        {#each filteredLocations as loc}
          {@const sku = skus.find((s) => s.id === loc.skuId)}
          {@const rack = racks.find((r) => r.id === loc.rackId)}
          <div class="location-row">
            <span class="code">{loc.code}</span>
            <span>{rack?.name}</span>
            <span class="status status-{loc.status}">{loc.status}</span>
            <span class="sku-name">{sku?.name || '-'}</span>
            <span class="quantity">
              {loc.status === 'occupied' ? `${loc.quantity}/${loc.maxQuantity}` : '-'}
            </span>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>

<style>
  .inventory-view {
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

  .header h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: #1e293b;
  }

  .filters {
    display: flex;
    gap: 12px;
  }

  .search-input,
  .status-select {
    padding: 8px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s;
  }

  .search-input:focus,
  .status-select:focus {
    border-color: #3b82f6;
  }

  .stats-row {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 12px;
  }

  .stat-card {
    background: white;
    border-radius: 8px;
    padding: 16px;
    text-align: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .stat-value {
    font-size: 28px;
    font-weight: 700;
    color: #1e293b;
  }

  .stat-label {
    font-size: 13px;
    color: #64748b;
    margin-top: 4px;
  }

  .stat-card.occupied .stat-value {
    color: #22c55e;
  }

  .stat-card.empty .stat-value {
    color: #6b7280;
  }

  .stat-card.reserved .stat-value {
    color: #f59e0b;
  }

  .stat-card.utilization .stat-value {
    color: #3b82f6;
  }

  .content {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    overflow: hidden;
  }

  .chart-panel {
    background: white;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
  }

  .chart-panel h3 {
    margin: 0 0 12px;
    font-size: 14px;
    font-weight: 600;
    color: #1e293b;
  }

  .chart-container {
    flex: 1;
    min-height: 300px;
  }

  .location-list {
    background: white;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .location-list h3 {
    margin: 0 0 12px;
    font-size: 14px;
    font-weight: 600;
    color: #1e293b;
  }

  .list-header {
    display: grid;
    grid-template-columns: 120px 80px 80px 1fr 100px;
    padding: 8px 0;
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
    border-bottom: 2px solid #e2e8f0;
  }

  .list-body {
    flex: 1;
    overflow-y: auto;
  }

  .location-row {
    display: grid;
    grid-template-columns: 120px 80px 80px 1fr 100px;
    padding: 10px 0;
    border-bottom: 1px solid #f1f5f9;
    font-size: 13px;
    align-items: center;
  }

  .code {
    font-weight: 600;
    color: #1e293b;
  }

  .status {
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 500;
    justify-self: start;
  }

  .status-occupied {
    background: #dcfce7;
    color: #166534;
  }

  .status-empty {
    background: #f3f4f6;
    color: #4b5563;
  }

  .status-reserved {
    background: #fef3c7;
    color: #92400e;
  }

  .sku-name {
    color: #64748b;
  }

  .quantity {
    color: #1e293b;
    font-weight: 500;
  }
</style>

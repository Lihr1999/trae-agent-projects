<script lang="ts">
  import type { Wave, Order, Task } from '../types';
  import { api } from '../services/api';

  export let waves: Wave[] = [];
  export let orders: Order[] = [];
  export let tasks: Task[] = [];

  let selectedWave: Wave | null = null;

  const statusColors: Record<string, string> = {
    pending: '#6b7280',
    processing: '#3b82f6',
    completed: '#22c55e',
    cancelled: '#ef4444',
  };

  const statusLabels: Record<string, string> = {
    pending: '待处理',
    processing: '处理中',
    completed: '已完成',
    cancelled: '已取消',
  };

  const priorityLabels: Record<string, string> = {
    low: '低',
    medium: '中',
    high: '高',
  };

  $: waveOrders = selectedWave
    ? orders.filter((o) => selectedWave.orderIds.includes(o.id))
    : [];

  $: waveTasks = selectedWave
    ? tasks.filter((t) => t.waveId === selectedWave.id)
    : [];

  async function generateWaves(): Promise<void> {
    await api.generateWaves();
  }

  async function handleWaveClick(wave: Wave): Promise<void> {
    selectedWave = wave;
  }
</script>

<div class="wave-management">
  <div class="header">
    <h2>波次管理</h2>
    <button class="btn btn-primary" on:click={generateWaves}>
      生成波次
    </button>
  </div>

  <div class="content">
    <div class="wave-list">
      <div class="list-header">
        <span>波次编号</span>
        <span>状态</span>
        <span>优先级</span>
        <span>订单数</span>
        <span>创建时间</span>
      </div>
      <div class="list-body">
        {#each waves as wave}
          <div
            class="wave-item {selectedWave?.id === wave.id ? 'selected' : ''}"
            on:click={() => handleWaveClick(wave)}
          >
            <span class="wave-no">{wave.waveNo}</span>
            <span class="status" style="background: {statusColors[wave.status]}">
              {statusLabels[wave.status]}
            </span>
            <span class="priority">{priorityLabels[wave.priority]}</span>
            <span>{wave.orderIds.length}</span>
            <span class="time">{new Date(wave.createdAt).toLocaleString()}</span>
          </div>
        {/each}
      </div>
    </div>

    {#if selectedWave}
      <div class="wave-detail">
        <h3>波次详情 - {selectedWave.waveNo}</h3>

        <div class="detail-section">
          <h4>订单列表 ({waveOrders.length})</h4>
          <div class="order-list">
            {#each waveOrders as order}
              <div class="order-item">
                <div class="order-header">
                  <span class="order-no">{order.orderNo}</span>
                  <span class="priority">{order.priority}</span>
                  <span class="status" style="background: {statusColors[order.status]}">
                    {statusLabels[order.status]}
                  </span>
                </div>
                <div class="order-items">
                  {#each order.items as item}
                    <span class="item-tag">{item.skuName} x{item.quantity}</span>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        </div>

        <div class="detail-section">
          <h4>任务列表 ({waveTasks.length})</h4>
          <div class="task-list">
            {#each waveTasks as task}
              <div class="task-item">
                <span class="task-id">{task.id.slice(0, 8)}</span>
                <span class="task-type">{task.type}</span>
                <span class="status" style="background: {statusColors[task.status]}">
                  {statusLabels[task.status]}
                </span>
                <span>数量: {task.quantity}</span>
              </div>
            {/each}
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .wave-management {
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

  .content {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    overflow: hidden;
  }

  .wave-list {
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .list-header {
    display: grid;
    grid-template-columns: 1fr 100px 80px 80px 160px;
    padding: 12px 16px;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
  }

  .list-body {
    flex: 1;
    overflow-y: auto;
  }

  .wave-item {
    display: grid;
    grid-template-columns: 1fr 100px 80px 80px 160px;
    padding: 12px 16px;
    border-bottom: 1px solid #f1f5f9;
    cursor: pointer;
    transition: background 0.2s;
    align-items: center;
  }

  .wave-item:hover {
    background: #f8fafc;
  }

  .wave-item.selected {
    background: #eff6ff;
  }

  .wave-no {
    font-weight: 600;
    color: #1e293b;
  }

  .status {
    padding: 2px 8px;
    color: white;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 500;
    justify-self: center;
  }

  .priority {
    font-size: 12px;
    color: #64748b;
  }

  .time {
    font-size: 12px;
    color: #94a3b8;
  }

  .wave-detail {
    background: white;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    overflow-y: auto;
  }

  .wave-detail h3 {
    margin: 0 0 16px;
    font-size: 16px;
    font-weight: 600;
    color: #1e293b;
  }

  .detail-section {
    margin-bottom: 20px;
  }

  .detail-section h4 {
    margin: 0 0 12px;
    font-size: 14px;
    font-weight: 600;
    color: #64748b;
  }

  .order-list,
  .task-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .order-item {
    padding: 12px;
    background: #f8fafc;
    border-radius: 6px;
  }

  .order-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .order-no {
    font-weight: 600;
    color: #1e293b;
  }

  .order-items {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .item-tag {
    padding: 2px 8px;
    background: #e0e7ff;
    color: #4338ca;
    border-radius: 4px;
    font-size: 11px;
  }

  .task-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px;
    background: #f8fafc;
    border-radius: 6px;
    font-size: 13px;
  }

  .task-id {
    font-family: monospace;
    color: #64748b;
  }

  .task-type {
    padding: 2px 8px;
    background: #e0e7ff;
    color: #4338ca;
    border-radius: 4px;
    font-size: 11px;
  }
</style>

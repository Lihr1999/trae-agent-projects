<script lang="ts">
  import type { Task } from '../types';

  export let tasks: Task[] = [];

  const statusColors: Record<string, string> = {
    pending: '#6b7280',
    assigned: '#3b82f6',
    in_progress: '#f59e0b',
    completed: '#22c55e',
    cancelled: '#ef4444',
    failed: '#7c3aed',
  };

  const statusLabels: Record<string, string> = {
    pending: '待分配',
    assigned: '已分配',
    in_progress: '执行中',
    completed: '已完成',
    cancelled: '已取消',
    failed: '失败',
  };

  const typeLabels: Record<string, string> = {
    pick: '拣货',
    put: '上架',
    move: '移库',
    charge: '充电',
  };
</script>

<div class="task-panel">
  <div class="header">
    <h3>任务看板</h3>
    <span class="count">{tasks.length} 个任务</span>
  </div>

  <div class="task-list">
    {#if tasks.length === 0}
      <div class="empty">暂无任务</div>
    {:else}
      {#each tasks.slice(0, 10) as task}
        <div class="task-item">
          <div class="task-header">
            <span class="task-id">{task.id.slice(0, 8)}</span>
            <span class="task-type">{typeLabels[task.type]}</span>
            <span class="status" style="background: {statusColors[task.status]}">
              {statusLabels[task.status]}
            </span>
          </div>
          <div class="task-details">
            <span>优先级: {task.priority}</span>
            <span>数量: {task.quantity}</span>
            {#if task.path}
              <span>路径长度: {task.path.length}</span>
            {/if}
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .task-panel {
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }

  .header {
    padding: 16px;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .header h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #1e293b;
  }

  .count {
    font-size: 12px;
    color: #64748b;
  }

  .task-list {
    max-height: 400px;
    overflow-y: auto;
  }

  .empty {
    padding: 32px;
    text-align: center;
    color: #94a3b8;
    font-size: 14px;
  }

  .task-item {
    padding: 12px 16px;
    border-bottom: 1px solid #f1f5f9;
  }

  .task-item:last-child {
    border-bottom: none;
  }

  .task-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .task-id {
    font-family: monospace;
    font-size: 12px;
    color: #64748b;
  }

  .task-type {
    padding: 2px 8px;
    background: #e0e7ff;
    color: #4338ca;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 500;
  }

  .status {
    padding: 2px 8px;
    color: white;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 500;
    margin-left: auto;
  }

  .task-details {
    display: flex;
    gap: 16px;
    font-size: 12px;
    color: #64748b;
  }
</style>

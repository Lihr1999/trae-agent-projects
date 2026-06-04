<script lang="ts">
  import type { Exception } from '../types';
  import { api } from '../services/api';

  export let exceptions: Exception[] = [];

  let statusFilter = '';
  let severityFilter = '';

  const severityColors: Record<string, string> = {
    low: '#22c55e',
    medium: '#f59e0b',
    high: '#ef4444',
    critical: '#7c3aed',
  };

  const severityLabels: Record<string, string> = {
    low: '低',
    medium: '中',
    high: '高',
    critical: '严重',
  };

  const statusLabels: Record<string, string> = {
    open: '待处理',
    in_progress: '处理中',
    resolved: '已解决',
    closed: '已关闭',
  };

  $: filteredExceptions = exceptions.filter((e) => {
    const matchesStatus = statusFilter === '' || e.status === statusFilter;
    const matchesSeverity = severityFilter === '' || e.severity === severityFilter;
    return matchesStatus && matchesSeverity;
  });

  async function handleException(exception: Exception): Promise<void> {
    await api.updateException(exception.id, {
      status: 'in_progress',
    });
  }

  async function resolveException(exception: Exception): Promise<void> {
    await api.updateException(exception.id, {
      status: 'resolved',
      resolvedAt: new Date().toISOString(),
      resolution: '已处理',
    });
  }
</script>

<div class="exception-view">
  <div class="header">
    <h2>异常事件</h2>
    <div class="filters">
      <select bind:value={severityFilter} class="filter-select">
        <option value="">全部级别</option>
        <option value="critical">严重</option>
        <option value="high">高</option>
        <option value="medium">中</option>
        <option value="low">低</option>
      </select>
      <select bind:value={statusFilter} class="filter-select">
        <option value="">全部状态</option>
        <option value="open">待处理</option>
        <option value="in_progress">处理中</option>
        <option value="resolved">已解决</option>
        <option value="closed">已关闭</option>
      </select>
    </div>
  </div>

  <div class="stats-row">
    <div class="stat-card critical">
      <div class="stat-value">{exceptions.filter((e) => e.severity === 'critical').length}</div>
      <div class="stat-label">严重</div>
    </div>
    <div class="stat-card high">
      <div class="stat-value">{exceptions.filter((e) => e.severity === 'high').length}</div>
      <div class="stat-label">高</div>
    </div>
    <div class="stat-card medium">
      <div class="stat-value">{exceptions.filter((e) => e.severity === 'medium').length}</div>
      <div class="stat-label">中</div>
    </div>
    <div class="stat-card low">
      <div class="stat-value">{exceptions.filter((e) => e.severity === 'low').length}</div>
      <div class="stat-label">低</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">{exceptions.filter((e) => e.status === 'open').length}</div>
      <div class="stat-label">待处理</div>
    </div>
  </div>

  <div class="exception-list">
    <div class="list-header">
      <span>级别</span>
      <span>类型</span>
      <span>消息</span>
      <span>状态</span>
      <span>时间</span>
      <span>操作</span>
    </div>
    <div class="list-body">
      {#each filteredExceptions as exception}
        <div class="exception-item">
          <span class="severity" style="background: {severityColors[exception.severity]}">
            {severityLabels[exception.severity]}
          </span>
          <span class="type">{exception.type}</span>
          <span class="message">{exception.message}</span>
          <span class="status status-{exception.status}">{statusLabels[exception.status]}</span>
          <span class="time">{new Date(exception.createdAt).toLocaleString()}</span>
          <span class="actions">
            {#if exception.status === 'open'}
              <button class="btn btn-small" on:click={() => handleException(exception)}>
                处理
              </button>
            {/if}
            {#if exception.status === 'in_progress'}
              <button class="btn btn-small btn-success" on:click={() => resolveException(exception)}>
                解决
              </button>
            {/if}
          </span>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .exception-view {
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

  .filter-select {
    padding: 8px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 14px;
    outline: none;
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

  .stat-card.critical .stat-value {
    color: #7c3aed;
  }

  .stat-card.high .stat-value {
    color: #ef4444;
  }

  .stat-card.medium .stat-value {
    color: #f59e0b;
  }

  .stat-card.low .stat-value {
    color: #22c55e;
  }

  .exception-list {
    flex: 1;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .list-header {
    display: grid;
    grid-template-columns: 80px 120px 1fr 100px 160px 120px;
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

  .exception-item {
    display: grid;
    grid-template-columns: 80px 120px 1fr 100px 160px 120px;
    padding: 12px 16px;
    border-bottom: 1px solid #f1f5f9;
    font-size: 13px;
    align-items: center;
  }

  .severity {
    padding: 2px 8px;
    color: white;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 500;
    justify-self: start;
  }

  .type {
    color: #64748b;
    font-family: monospace;
  }

  .message {
    color: #1e293b;
  }

  .status {
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 500;
    justify-self: start;
  }

  .status-open {
    background: #fee2e2;
    color: #991b1b;
  }

  .status-in_progress {
    background: #fef3c7;
    color: #92400e;
  }

  .status-resolved {
    background: #dcfce7;
    color: #166534;
  }

  .status-closed {
    background: #f3f4f6;
    color: #4b5563;
  }

  .time {
    color: #94a3b8;
  }

  .actions {
    display: flex;
    gap: 8px;
  }

  .btn {
    padding: 6px 12px;
    border: none;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-small {
    background: #3b82f6;
    color: white;
  }

  .btn-small:hover {
    background: #2563eb;
  }

  .btn-success {
    background: #22c55e;
  }

  .btn-success:hover {
    background: #16a34a;
  }
</style>

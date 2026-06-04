<script lang="ts">
  import type { LogEntry } from '../types';

  export let logs: LogEntry[] = [];

  let typeFilter = '';
  let levelFilter = '';

  const typeLabels: Record<string, string> = {
    system: '系统',
    task: '任务',
    robot: '机器人',
    user: '用户',
    exception: '异常',
  };

  const levelColors: Record<string, string> = {
    info: '#3b82f6',
    warning: '#f59e0b',
    error: '#ef4444',
    debug: '#6b7280',
  };

  $: filteredLogs = logs.filter((log) => {
    const matchesType = typeFilter === '' || log.type === typeFilter;
    const matchesLevel = levelFilter === '' || log.level === levelFilter;
    return matchesType && matchesLevel;
  });
</script>

<div class="log-view">
  <div class="header">
    <h2>调度日志</h2>
    <div class="filters">
      <select bind:value={typeFilter} class="filter-select">
        <option value="">全部类型</option>
        <option value="system">系统</option>
        <option value="task">任务</option>
        <option value="robot">机器人</option>
        <option value="exception">异常</option>
      </select>
      <select bind:value={levelFilter} class="filter-select">
        <option value="">全部级别</option>
        <option value="info">信息</option>
        <option value="warning">警告</option>
        <option value="error">错误</option>
        <option value="debug">调试</option>
      </select>
    </div>
  </div>

  <div class="log-list">
    <div class="list-header">
      <span>时间</span>
      <span>类型</span>
      <span>级别</span>
      <span>消息</span>
    </div>
    <div class="list-body">
      {#each filteredLogs as log}
        <div class="log-item">
          <span class="time">{new Date(log.createdAt).toLocaleString()}</span>
          <span class="type">{typeLabels[log.type] || log.type}</span>
          <span class="level" style="background: {levelColors[log.level]}">
            {log.level}
          </span>
          <span class="message">{log.message}</span>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .log-view {
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

  .log-list {
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
    grid-template-columns: 180px 80px 80px 1fr;
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
    font-family: monospace;
  }

  .log-item {
    display: grid;
    grid-template-columns: 180px 80px 80px 1fr;
    padding: 10px 16px;
    border-bottom: 1px solid #f1f5f9;
    font-size: 13px;
    align-items: center;
  }

  .log-item:hover {
    background: #f8fafc;
  }

  .time {
    color: #64748b;
    font-size: 12px;
  }

  .type {
    color: #64748b;
  }

  .level {
    padding: 2px 8px;
    color: white;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 500;
    justify-self: start;
  }

  .message {
    color: #1e293b;
    word-break: break-all;
  }
</style>

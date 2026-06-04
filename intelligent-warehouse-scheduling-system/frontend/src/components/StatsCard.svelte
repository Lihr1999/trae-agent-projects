<script lang="ts">
  export let title: string;
  export let value: string | number;
  export let icon: string;
  export let color: string = '#3b82f6';
</script>

<div class="stats-card">
  <div class="icon" style="background: {color}">
    {icon}
  </div>
  <div class="content">
    <div class="value">{value}</div>
    <div class="title">{title}</div>
  </div>
</div>

<style>
  .stats-card {
    background: white;
    border-radius: 8px;
    padding: 16px;
    display: flex;
    align-items: center;
    gap: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .icon {
    width: 48px;
    height: 48px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
  }

  .content {
    flex: 1;
  }

  .value {
    font-size: 24px;
    font-weight: 700;
    color: #1e293b;
  }

  .title {
    font-size: 12px;
    color: #64748b;
    margin-top: 2px;
  }
</style>

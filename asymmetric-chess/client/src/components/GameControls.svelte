<script>
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();

  export let aiThinking = false;
  export let gameOver = null;
  export let showSearchTree = false;

  function handleReset() { dispatch('reset'); }
  function handleAiMove() { dispatch('aiMove'); }
  function handleToggleSearchTree() { dispatch('toggleSearchTree'); }
</script>

<div class="controls-section">
  <h3>游戏控制</h3>

  <div class="control-buttons">
    <button
      class="control-btn primary"
      on:click={handleAiMove}
      disabled={aiThinking || (gameOver && gameOver.over)}
    >
      {#if aiThinking}
        <span class="thinking-dots">
          AI思考中<span>.</span><span>.</span><span>.</span>
        </span>
      {:else}
        🤖 AI走棋
      {/if}
    </button>

    <button class="control-btn" on:click={handleReset}>
      🔄 重置游戏
    </button>

    <button
      class="control-btn {showSearchTree ? 'active' : ''}"
      on:click={handleToggleSearchTree}
    >
      🌳 {showSearchTree ? '隐藏' : '显示'}搜索树
    </button>
  </div>

  {#if aiThinking}
    <div class="thinking-animation">
      <div class="thinking-bar">
        <div class="thinking-progress"></div>
      </div>
      <span class="thinking-text">AI正在使用Alpha-Beta剪枝搜索最优着法...</span>
    </div>
  {/if}
</div>

<style>
  .controls-section {
    background: rgba(255,255,255,0.05);
    border-radius: 12px;
    padding: 16px;
  }

  .controls-section h3 {
    font-size: 16px;
    margin-bottom: 12px;
    color: rgba(255,255,255,0.9);
  }

  .control-buttons {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .control-btn {
    padding: 12px 16px;
    background: linear-gradient(135deg, #2c3e50, #34495e);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    color: white;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.3s;
    text-align: left;
  }

  .control-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, #34495e, #3d566e);
    transform: translateX(4px);
  }

  .control-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .control-btn.primary {
    background: linear-gradient(135deg, #9b59b6, #8e44ad);
    border-color: #9b59b6;
  }

  .control-btn.primary:hover:not(:disabled) {
    background: linear-gradient(135deg, #8e44ad, #9b59b6);
  }

  .control-btn.active {
    background: linear-gradient(135deg, #27ae60, #2ecc71);
    border-color: #27ae60;
  }

  .thinking-dots {
    display: inline-flex;
    align-items: center;
    gap: 2px;
  }

  .thinking-dots span {
    animation: dotPulse 1.5s infinite;
  }

  .thinking-dots span:nth-child(2) { animation-delay: 0.3s; }
  .thinking-dots span:nth-child(3) { animation-delay: 0.6s; }

  @keyframes dotPulse {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 1; }
  }

  .thinking-animation {
    margin-top: 12px;
    padding: 10px;
    background: rgba(155, 89, 182, 0.2);
    border-radius: 6px;
    border: 1px solid rgba(155, 89, 182, 0.3);
  }

  .thinking-bar {
    height: 4px;
    background: rgba(255,255,255,0.1);
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 6px;
  }

  .thinking-progress {
    height: 100%;
    background: linear-gradient(90deg, #9b59b6, #8e44ad);
    border-radius: 2px;
    animation: thinkingProgress 2s ease-in-out infinite;
  }

  @keyframes thinkingProgress {
    0% { width: 0%; }
    50% { width: 100%; }
    100% { width: 0%; }
  }

  .thinking-text {
    font-size: 11px;
    color: rgba(155, 89, 182, 0.9);
  }
</style>

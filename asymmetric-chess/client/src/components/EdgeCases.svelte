<script>
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();

  export let result = null;
  export let show = false;

  const EDGE_CASES = [
    {
      type: 'threefold',
      name: '三维重复局面',
      icon: '🔄',
      description: '演示三次重复局面导致的死循环',
      color: '#f39c12'
    },
    {
      type: 'perpetual-check',
      name: '长将规则',
      icon: '⚔️',
      description: '长将规则在非对称棋类中可能失效',
      color: '#e74c3c'
    },
    {
      type: 'zobrist-collision',
      name: 'Zobrist碰撞',
      icon: '💥',
      description: 'Zobrist哈希碰撞引发的置换表错误',
      color: '#9b59b6'
    },
    {
      type: 'depth-exhaustion',
      name: '深度耗尽',
      icon: '🌑',
      description: '搜索深度耗尽时的盲目弃子行为',
      color: '#3498db'
    }
  ];

  function handleTrigger(type) {
    dispatch('trigger', { type });
  }

  function handleClose() {
    dispatch('close');
  }

  function getResultColor(result) {
    if (!result) return '#888';
    const colorMap = {
      threefold: '#f39c12',
      'perpetual-check': '#e74c3c',
      'zobrist-collision': '#9b59b6',
      'depth-exhaustion': '#3498db'
    };
    return colorMap[result.caseType] || '#888';
  }
</script>

<div class="edge-cases-section">
  <h3>🔍 边界情况展示</h3>

  <div class="edge-case-buttons">
    {#each EDGE_CASES as ec}
      <button
        class="edge-case-btn"
        style="--accent: {ec.color}"
        onclick={() => handleTrigger(ec.type)}
        title={ec.description}
      >
        <span class="edge-icon">{ec.icon}</span>
        <span class="edge-name">{ec.name}</span>
      </button>
    {/each}
  </div>

  {#if show && result}
    <div class="edge-result-panel" style="--accent: {getResultColor(result)}">
      <button class="close-btn" onclick={handleClose}>✕</button>

      {#if result.caseType === 'threefold'}
        <div class="result-content">
          <h4>🔄 三维重复局面分析</h4>
          <div class="result-status {result.threefoldDetected ? 'detected' : 'not-detected'}">
            {result.threefoldDetected ? '⚠️ 检测到重复局面死循环!' : '未检测到重复'}
          </div>

          {#if result.positionCounts}
            <div class="position-stats">
              <h5>局面出现次数:</h5>
              {#each Object.entries(result.positionCounts).slice(0, 5) as [pos, count]}
                <div class="pos-row">
                  <span class="pos-hash">{pos.slice(0, 30)}...</span>
                  <span class="pos-count">{count}次</span>
                </div>
              {/each}
            </div>
          {/if}

          <div class="note">
            💡 当同一局面出现3次时，规则引擎应判为和棋。
            但在非对称棋类中，由于棋子能力差异，重复局面可能带来不同的实际价值。
          </div>
        </div>
      {:else if result.caseType === 'perpetual-check'}
        <div class="result-content">
          <h4>⚔️ 长将规则分析</h4>
          <div class="result-status {result.perpetualDetected ? 'detected' : 'not-detected'}">
            {result.perpetualDetected ? '⚠️ 长将循环已检测!' : '未形成长将循环'}
          </div>

          {#if result.checkSequence}
            <div class="check-sequence">
              <h5>将军序列:</h5>
              {#each result.checkSequence as item}
                <div class="check-row">
                  第{item.move + 1}步: {item.inCheck ? '✅ 将军' : '❌ 无将军'}
                </div>
              {/each}
            </div>
          {/if}

          <div class="note">
            💡 {result.ruleNote}
            由于双方棋子的移动模式不对称，传统的长将判定可能产生误判。
          </div>
        </div>
      {:else if result.caseType === 'zobrist-collision'}
        <div class="result-content">
          <h4>💥 Zobrist哈希碰撞分析</h4>
          <div class="hash-display">
            <div class="hash-row">
              <span class="hash-label">当前哈希:</span>
              <span class="hash-value">{result.hash}</span>
            </div>
            {#if result.storedScore !== undefined}
              <div class="hash-row">
                <span class="hash-label">存储分数:</span>
                <span class="hash-value">{result.storedScore}</span>
              </div>
              <div class="hash-row">
                <span class="hash-label">实际分数:</span>
                <span class="hash-value">{result.actualScore}</span>
              </div>
              {#if result.storedScore !== result.actualScore}
                <div class="collision-warning">
                  ⚠️ 分数不一致! 可能存在哈希碰撞
                </div>
              {/if}
            {/if}
          </div>

          <div class="note">
            💡 {result.collisionRiskNote}。
            当两个不同局面产生相同哈希时，置换表会返回错误的评估分数。
          </div>
        </div>
      {:else if result.caseType === 'depth-exhaustion'}
        <div class="result-content">
          <h4>🌑 搜索深度耗尽分析</h4>

          <div class="depth-comparison">
            <div class="depth-col">
              <h5>浅层搜索 (深度1)</h5>
              {#if result.shallowMove}
                <div class="move-info">
                  <div>位置: [{result.shallowMove.from} → {result.shallowMove.to}]</div>
                  <div class="score {result.shallowScore > 0 ? 'positive' : 'negative'}">
                    分数: {result.shallowScore?.toFixed(1)}
                  </div>
                </div>
              {/if}
            </div>
            <div class="depth-col">
              <h5>深层搜索 (深度4)</h5>
              {#if result.deepMove}
                <div class="move-info">
                  <div>位置: [{result.deepMove.from} → {result.deepMove.to}]</div>
                  <div class="score {result.deepScore > 0 ? 'positive' : 'negative'}">
                    分数: {result.deepScore?.toFixed(1)}
                  </div>
                </div>
              {/if}
            </div>
          </div>

          {#if result.disagreement}
            <div class="disagreement-warning">
              ⚠️ 深浅层选择不一致! 浅层AI可能做出短视决定
            </div>
          {/if}

          <div class="note">
            💡 {result.blindSacrificeNote}。
            当搜索深度不足以看清长远后果时，AI可能为获得短期物质优势而放弃战略位置。
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .edge-cases-section {
    background: rgba(255,255,255,0.05);
    border-radius: 12px;
    padding: 16px;
  }

  .edge-cases-section h3 {
    font-size: 16px;
    margin-bottom: 12px;
    color: rgba(255,255,255,0.9);
  }

  .edge-case-buttons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .edge-case-btn {
    padding: 12px 8px;
    background: rgba(255,255,255,0.05);
    border: 2px solid var(--accent);
    border-radius: 8px;
    color: white;
    cursor: pointer;
    transition: all 0.3s;
    text-align: center;
    font-size: 12px;
  }

  .edge-case-btn:hover {
    background: var(--accent);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px var(--accent);
  }

  .edge-icon {
    display: block;
    font-size: 20px;
    margin-bottom: 4px;
  }

  .edge-name {
    display: block;
    font-weight: bold;
  }

  .edge-result-panel {
    margin-top: 12px;
    padding: 14px;
    background: rgba(255,255,255,0.08);
    border-radius: 8px;
    border-left: 4px solid var(--accent);
    position: relative;
    animation: resultSlide 0.4s ease;
  }

  @keyframes resultSlide {
    from { opacity: 0; transform: translateX(10px); }
    to { opacity: 1; transform: translateX(0); }
  }

  .close-btn {
    position: absolute;
    top: 8px;
    right: 8px;
    background: none;
    border: none;
    color: rgba(255,255,255,0.5);
    cursor: pointer;
    font-size: 14px;
    padding: 4px;
  }

  .close-btn:hover {
    color: white;
  }

  .result-content h4 {
    font-size: 14px;
    margin-bottom: 10px;
    color: rgba(255,255,255,0.9);
  }

  .result-status {
    padding: 8px;
    border-radius: 6px;
    font-weight: bold;
    margin-bottom: 10px;
    text-align: center;
  }

  .result-status.detected {
    background: rgba(231, 76, 60, 0.2);
    color: #e74c3c;
    animation: detectPulse 1s infinite;
  }

  .result-status.not-detected {
    background: rgba(46, 204, 113, 0.2);
    color: #2ecc71;
  }

  @keyframes detectPulse {
    0%, 100% { box-shadow: 0 0 0 rgba(231, 76, 60, 0.3); }
    50% { box-shadow: 0 0 10px rgba(231, 76, 60, 0.5); }
  }

  .position-stats, .check-sequence, .hash-display {
    margin-bottom: 10px;
  }

  .position-stats h5, .check-sequence h5 {
    font-size: 11px;
    color: rgba(255,255,255,0.6);
    margin-bottom: 6px;
  }

  .pos-row, .check-row, .hash-row {
    display: flex;
    justify-content: space-between;
    padding: 4px 8px;
    background: rgba(255,255,255,0.05);
    border-radius: 4px;
    margin-bottom: 2px;
    font-size: 10px;
  }

  .pos-hash {
    color: rgba(255,255,255,0.5);
    font-family: monospace;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .pos-count, .hash-value {
    color: rgba(255,255,255,0.8);
    font-weight: bold;
  }

  .hash-label {
    color: rgba(255,255,255,0.5);
  }

  .collision-warning {
    margin-top: 8px;
    padding: 8px;
    background: rgba(231, 76, 60, 0.2);
    border-radius: 4px;
    color: #e74c3c;
    font-size: 11px;
    animation: detectPulse 1s infinite;
  }

  .depth-comparison {
    display: flex;
    gap: 10px;
    margin-bottom: 10px;
  }

  .depth-col {
    flex: 1;
    background: rgba(255,255,255,0.05);
    border-radius: 6px;
    padding: 8px;
  }

  .depth-col h5 {
    font-size: 11px;
    color: rgba(255,255,255,0.6);
    margin-bottom: 6px;
  }

  .move-info {
    font-size: 10px;
    color: rgba(255,255,255,0.8);
  }

  .score.positive { color: #2ecc71; }
  .score.negative { color: #e74c3c; }

  .disagreement-warning {
    margin-top: 8px;
    padding: 8px;
    background: rgba(52, 152, 219, 0.2);
    border-radius: 4px;
    color: #3498db;
    font-size: 11px;
    animation: detectPulse 1s infinite;
  }

  .note {
    margin-top: 10px;
    padding: 8px;
    background: rgba(241, 196, 15, 0.1);
    border-radius: 4px;
    font-size: 11px;
    color: rgba(241, 196, 15, 0.9);
    line-height: 1.5;
  }
</style>

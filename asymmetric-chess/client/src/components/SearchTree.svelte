<script>
  export let data = null;

  $: depthLayers = data ? data.map(layer => ({
    depth: layer.depth,
    moves: layer.moves,
    bestMove: layer.bestMove
  })) : [];

  $: totalNodes = data ? data.reduce((sum, l) => sum + (l.moves?.length || 0), 0) : 0;

  function moveToCoord(move) {
    if (!move) return '?';
    const files = 'abcdefgh';
    return `${files[move.from[1]]}${move.from[0] + 1}→${files[move.to[1]]}${move.to[0] + 1}`;
  }

  function getScoreColor(score) {
    if (!score) return '#888';
    if (score > 50) return '#2ecc71';
    if (score > 0) return '#27ae60';
    if (score > -50) return '#e67e22';
    return '#e74c3c';
  }
</script>

<div class="search-tree-section">
  <h3>🌳 博弈树搜索路径</h3>

  <div class="search-summary">
    <span>深度: {data?.length || 0} 层</span>
    <span>节点: {totalNodes}</span>
  </div>

  {#if data && data.length > 0}
    <div class="search-layers">
      {#each data as layer, i}
        <div class="search-layer" style="--layer-delay: {i * 100}ms;">
          <div class="layer-header">
            <span class="layer-depth">深度 {layer.depth}</span>
            {#if layer.bestMove}
              <span class="layer-best">
                最佳: {moveToCoord(layer.bestMove)}
              </span>
            {/if}
          </div>

          <div class="layer-moves">
            {#each layer.moves as move, j}
              <div
                class="move-node {data[i+1]?.bestMove && move.to[0] === data[i+1].bestMove.from[0]
                  && move.to[1] === data[i+1].bestMove.from[1] ? 'on-path' : ''}"
                style="--node-delay: {j * 50}ms;"
              >
                <div class="move-coord">{moveToCoord({from: move.from, to: move.to})}</div>
                <div class="move-score" style="color: {getScoreColor(move.score)}">
                  {move.score?.toFixed(0) || '?'}
                </div>
                {#if move.special}
                  <div class="move-special">{move.special}</div>
                {/if}
                {#if move.path && move.path.length > 0}
                  <div class="move-variations">
                    {#each move.path.slice(0, 3) as pv}
                      <span class="variation-dot" style="background: {getScoreColor(pv.score)}"></span>
                    {/each}
                  </div>
                {/if}
              </div>
            {/each}
          </div>

          {#if i < data.length - 1}
            <div class="tree-branches">
              {#each layer.moves as move, j}
                <div class="branch-line" style="--branch-x: {j * 60}px;"></div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>

    <div class="search-legend">
      <div class="legend-item">
        <span class="legend-dot on-path"></span> 最优路径
      </div>
      <div class="legend-item">
        <span class="legend-dot pruned"></span> 剪枝节点
      </div>
    </div>
  {/if}
</div>

<style>
  .search-tree-section {
    background: rgba(255,255,255,0.05);
    border-radius: 12px;
    padding: 16px;
    max-height: 500px;
    overflow-y: auto;
  }

  .search-tree-section h3 {
    font-size: 16px;
    margin-bottom: 12px;
    color: rgba(255,255,255,0.9);
  }

  .search-summary {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: rgba(255,255,255,0.5);
    margin-bottom: 12px;
    padding: 8px;
    background: rgba(255,255,255,0.05);
    border-radius: 6px;
  }

  .search-layers {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .search-layer {
    background: rgba(255,255,255,0.03);
    border-radius: 8px;
    padding: 10px;
    animation: layerSlide 0.4s ease both;
    animation-delay: var(--layer-delay, 0ms);
  }

  @keyframes layerSlide {
    from { opacity: 0; transform: translateX(-20px); }
    to { opacity: 1; transform: translateX(0); }
  }

  .layer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    font-size: 12px;
  }

  .layer-depth {
    font-weight: bold;
    color: #f39c12;
  }

  .layer-best {
    color: #2ecc71;
    font-size: 11px;
  }

  .layer-moves {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .move-node {
    background: rgba(255,255,255,0.08);
    border-radius: 6px;
    padding: 6px 8px;
    font-size: 11px;
    min-width: 80px;
    animation: nodeAppear 0.3s ease both;
    animation-delay: var(--node-delay, 0ms);
    border: 1px solid rgba(255,255,255,0.1);
    transition: all 0.3s;
  }

  .move-node:hover {
    background: rgba(255,255,255,0.15);
    transform: scale(1.05);
  }

  .move-node.on-path {
    border-color: #2ecc71;
    background: rgba(46, 204, 113, 0.15);
    animation: pathPulse 2s infinite;
  }

  @keyframes pathPulse {
    0%, 100% { box-shadow: 0 0 0 rgba(46, 204, 113, 0.3); }
    50% { box-shadow: 0 0 8px rgba(46, 204, 113, 0.5); }
  }

  @keyframes nodeAppear {
    from { opacity: 0; transform: scale(0.8); }
    to { opacity: 1; transform: scale(1); }
  }

  .move-coord {
    font-family: monospace;
    color: rgba(255,255,255,0.9);
  }

  .move-score {
    font-weight: bold;
    font-size: 10px;
    margin-top: 2px;
  }

  .move-special {
    font-size: 9px;
    color: #f39c12;
    margin-top: 2px;
  }

  .move-variations {
    display: flex;
    gap: 2px;
    margin-top: 4px;
  }

  .variation-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }

  .search-legend {
    display: flex;
    gap: 16px;
    margin-top: 12px;
    padding-top: 10px;
    border-top: 1px solid rgba(255,255,255,0.1);
    font-size: 11px;
    color: rgba(255,255,255,0.6);
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .legend-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }

  .legend-dot.on-path {
    background: #2ecc71;
  }

  .legend-dot.pruned {
    background: rgba(255,255,255,0.2);
  }
</style>

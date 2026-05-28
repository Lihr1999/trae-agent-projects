<script>
  import { onMount, onDestroy, tick } from 'svelte';
  import Board from './components/Board.svelte';
  import GameControls from './components/GameControls.svelte';
  import SearchTree from './components/SearchTree.svelte';
  import EdgeCases from './components/EdgeCases.svelte';

  const API_BASE = 'http://localhost:3001/api';

  let board = [];
  let currentPlayer = 'north';
  let moveCount = 0;
  let stateHash = '';
  let history = [];
  let inCheck = false;
  let gameOver = null;
  let evaluation = 0;
  let selectedPiece = null;
  let legalMoves = [];
  let lastMove = null;
  let aiThinking = false;
  let aiResult = null;
  let searchTreeData = null;
  let showSearchTree = false;
  let showEdgeCases = false;
  let edgeCaseResult = null;
  let capturedPieces = { north: [], south: [] };
  let invalidMoveError = null;
  let moveProgress = [];
  let particles = [];
  let animationInterval = null;
  let flippingPiece = null;
  let gameId = null;
  let presets = [];
  let activePreset = null;

  async function fetchGameState() {
    try {
      const res = await fetch(`${API_BASE}/game/state`);
      const data = await res.json();
      board = data.board;
      currentPlayer = data.currentPlayer;
      moveCount = data.moveCount;
      stateHash = data.stateHash;
      history = data.history;
      inCheck = data.inCheck;
      gameOver = data.gameOver;
      evaluation = data.evaluation;
    } catch (e) { console.error(e); }
  }

  async function loadPreset(presetId) {
    console.log('Loading preset:', presetId);
    try {
      const res = await fetch(`${API_BASE}/preset/${presetId}`);
      console.log('Preset response status:', res.status);
      const preset = await res.json();
      console.log('Preset data:', preset);
      board = preset.board;
      currentPlayer = preset.currentPlayer;
      moveCount = preset.moveCount;
      activePreset = preset.name;
      selectedPiece = null;
      legalMoves = [];
      history = [];
      gameOver = null;
      inCheck = false;
      lastMove = null;
      moveProgress = [];
      await tick();
      console.log('Preset loaded successfully');
    } catch (e) {
      console.error('Error loading preset:', e);
    }
  }

  async function loadPresets() {
    try {
      const res = await fetch(`${API_BASE}/preset/`);
      const data = await res.json();
      presets = data.presets;
    } catch (e) { console.error(e); }
  }

  async function handleSquareClick(x, y) {
    if (gameOver && gameOver.over) return;
    if (aiThinking) return;

    const piece = board[x][y];

    if (selectedPiece) {
      const validMove = legalMoves.find(m => m.to[0] === x && m.to[1] === y);
      if (validMove) {
        await makeMove(selectedPiece.from, [x, y]);
        selectedPiece = null;
        legalMoves = [];
        return;
      }

      if (piece && piece.side === currentPlayer) {
        await fetchLegalMoves(x, y);
        selectedPiece = { from: [x, y], type: piece.type, side: piece.side };
        return;
      }

      selectedPiece = null;
      legalMoves = [];
    } else if (piece && piece.side === currentPlayer) {
      await fetchLegalMoves(x, y);
      selectedPiece = { from: [x, y], type: piece.type, side: piece.side };
    }
  }

  async function fetchLegalMoves(x, y) {
    try {
      const res = await fetch(`${API_BASE}/game/moves/${x}/${y}`);
      const data = await res.json();
      legalMoves = data.moves || [];
    } catch (e) { legalMoves = []; }
  }

  async function makeMove(from, to) {
    moveProgress = [];
    for (let i = 0; i <= 8; i++) {
      moveProgress.push({ active: false });
    }
    await tick();

    try {
      const res = await fetch(`${API_BASE}/game/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to })
      });

      if (!res.ok) {
        const err = await res.json();
        showInvalidMoveError(from, to);
        return;
      }

      const data = await res.json();

      if (data.captured) {
        createCaptureParticles(to[0], to[1], data.captured.side);
        capturedPieces[data.captured.side === 'north' ? 'south' : 'north'].push(data.captured);
      }

      if (data.special && data.special.type === 'promotion') {
        flippingPiece = {
          x: to[0], y: to[1],
          from: data.special.from,
          to: data.special.to,
          side: currentPlayer
        };
      }

      board = data.newState.board;
      currentPlayer = data.newState.currentPlayer;
      moveCount = data.newState.moveCount;
      stateHash = data.newState.stateHash;
      inCheck = data.newState.inCheck;
      gameOver = data.newState.gameOver;
      evaluation = data.newState.evaluation;
      history = [...history, { from, to, pieceType: board[to[0]]?.[to[1]]?.type }];
      lastMove = { from, to };

      for (let i = 0; i < moveProgress.length; i++) {
        moveProgress[i].active = true;
        await new Promise(r => setTimeout(r, 30));
      }

      await tick();

      if (flippingPiece) {
        setTimeout(() => { flippingPiece = null; }, 800);
      }

    } catch (e) {
      console.error(e);
      showInvalidMoveError(from, to);
    }
  }

  function showInvalidMoveError(from, to) {
    invalidMoveError = { from, to, time: Date.now() };
    setTimeout(() => { invalidMoveError = null; }, 1500);
  }

  function createCaptureParticles(x, y, side) {
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      particles.push({
        id: Math.random().toString(36),
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        color: side === 'north' ? '#e74c3c' : '#3498db',
        size: 4 + Math.random() * 4
      });
    }
  }

  async function aiMove() {
    if (aiThinking) return;
    aiThinking = true;
    searchTreeData = null;

    try {
      const res = await fetch(`${API_BASE}/ai/move-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ depth: 4, timeLimit: 5000 })
      });
      const data = await res.json();
      aiResult = data;
      searchTreeData = data.searchTree;
      showSearchTree = true;

      if (data.captured) {
        createCaptureParticles(data.move.to[0], data.move.to[1], data.captured.side);
        capturedPieces[data.captured.side === 'north' ? 'south' : 'north'].push(data.captured);
      }

      board = data.newState.board;
      currentPlayer = data.newState.currentPlayer;
      moveCount = data.newState.moveCount;
      stateHash = data.newState.stateHash;
      inCheck = data.newState.inCheck;
      gameOver = data.newState.gameOver;
      evaluation = data.newState.evaluation;
      lastMove = data.move;
    } catch (e) {
      console.error(e);
    }

    aiThinking = false;
  }

  async function resetGame() {
    try {
      await fetch(`${API_BASE}/game/reset`, { method: 'POST' });
      await fetchGameState();
      selectedPiece = null;
      legalMoves = [];
      lastMove = null;
      history = [];
      capturedPieces = { north: [], south: [] };
      gameOver = null;
      aiResult = null;
      searchTreeData = null;
    } catch (e) { console.error(e); }
  }

  async function handleEdgeCase(type) {
    try {
      const res = await fetch(`${API_BASE}/ai/edge-case/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ board, side: currentPlayer, moves: history.slice(-6) })
      });
      edgeCaseResult = await res.json();
      showEdgeCases = true;
    } catch (e) { console.error(e); }
  }

  onMount(async () => {
    await fetchGameState();
    await loadPresets();

    animationInterval = setInterval(() => {
      particles = particles
        .map(p => ({
          ...p,
          x: p.x + p.vx * 0.02,
          y: p.y + p.vy * 0.02,
          vy: p.vy + 0.1,
          life: p.life - 0.02
        }))
        .filter(p => p.life > 0);
    }, 30);
  });

  onDestroy(() => {
    if (animationInterval) {
      clearInterval(animationInterval);
    }
  });

  $: currentPlayerName = currentPlayer === 'north' ? '北方 (红方)' : '南方 (蓝方)';
</script>

<svelte:head>
  <title>非对称棋类 AI对弈系统</title>
</svelte:head>

<div class="app-container">
  <header class="header">
    <h1>🎯 非对称棋类 · AI对弈系统</h1>
    <div class="status-bar">
      <span class="player-badge {currentPlayer}">{currentPlayerName}</span>
      <span class="move-count">回合: {moveCount}</span>
      <span class="evaluation">评估: {evaluation > 0 ? '+' : ''}{evaluation}</span>
      {#if inCheck}
        <span class="check-warning">⚠️ 将军!</span>
      {/if}
    </div>
  </header>

  <main class="main-content">
    <div class="left-panel">
      <div class="preset-section">
        <h3>场景预设</h3>
        <div class="preset-buttons">
          {#each presets as preset}
            <button class="preset-btn {activePreset === preset.name ? 'active' : ''}"
                    on:click={() => loadPreset(preset.id)}>
              {preset.name}
            </button>
          {/each}
        </div>
      </div>

      <GameControls
        on:reset={resetGame}
        on:aiMove={aiMove}
        aiThinking={aiThinking}
        gameOver={gameOver}
        on:toggleSearchTree={() => showSearchTree = !showSearchTree}
        showSearchTree={showSearchTree}
      />

      {#if showSearchTree && searchTreeData}
        <SearchTree data={searchTreeData} />
      {/if}
    </div>

    <div class="center-panel">
      <Board
        board={board}
        selectedPiece={selectedPiece}
        legalMoves={legalMoves}
        lastMove={lastMove}
        flippingPiece={flippingPiece}
        invalidMoveError={invalidMoveError}
        moveProgress={moveProgress}
        particles={particles}
        on:squareClick={(e) => handleSquareClick(e.detail.x, e.detail.y)}
      />

      {#if gameOver && gameOver.over}
        <div class="game-over-banner">
          {#if gameOver.result === 'checkmate'}
            <h2>🏆 将死! {gameOver.winner === 'north' ? '北方' : '南方'} 获胜!</h2>
          {:else if gameOver.result === 'stalemate'}
            <h2>🤝 逼和! 游戏平局</h2>
          {/if}
          <button class="reset-btn" on:click={resetGame}>再来一局</button>
        </div>
      {/if}
    </div>

    <div class="right-panel">
      <div class="captured-section">
        <h3>吃子记录</h3>
        <div class="captured-row">
          <div class="captured-col">
            <h4>南方被吃</h4>
            <div class="captured-pieces">
              {#each capturedPieces.north as p}
                <span class="captured-piece south">{p.type}</span>
              {/each}
            </div>
          </div>
          <div class="captured-col">
            <h4>北方被吃</h4>
            <div class="captured-pieces">
              {#each capturedPieces.south as p}
                <span class="captured-piece north">{p.type}</span>
              {/each}
            </div>
          </div>
        </div>
      </div>

      <EdgeCases
        on:trigger={(e) => handleEdgeCase(e.detail.type)}
        result={edgeCaseResult}
        show={showEdgeCases}
        on:close={() => showEdgeCases = false}
      />
    </div>
  </main>

  {#if aiResult && aiResult.stats}
    <div class="ai-stats-panel">
      <h4>AI 搜索统计</h4>
      <div class="stat-grid">
        <span>节点数: {aiResult.stats.nodesExplored}</span>
        <span>最大深度: {aiResult.stats.maxDepth}</span>
        <span>剪枝次数: {aiResult.stats.cutoffs}</span>
        <span>置换表命中: {aiResult.stats.transpositionHits}</span>
        <span>耗时: {aiResult.stats.timeMs}ms</span>
        <span>评估分: {aiResult.score}</span>
      </div>
    </div>
  {/if}
</div>

<style>
  .app-container {
    max-width: 1600px;
    margin: 0 auto;
    padding: 16px;
    min-height: 100vh;
  }

  .header {
    text-align: center;
    padding: 16px 0;
    border-bottom: 2px solid rgba(255,255,255,0.1);
    margin-bottom: 20px;
  }

  .header h1 {
    font-size: 28px;
    background: linear-gradient(135deg, #e74c3c, #3498db);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .status-bar {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 20px;
    margin-top: 10px;
    flex-wrap: wrap;
  }

  .player-badge {
    padding: 6px 16px;
    border-radius: 20px;
    font-weight: bold;
    font-size: 14px;
  }

  .player-badge.north {
    background: linear-gradient(135deg, #c0392b, #e74c3c);
    color: white;
    box-shadow: 0 0 20px rgba(231, 76, 60, 0.5);
  }

  .player-badge.south {
    background: linear-gradient(135deg, #2980b9, #3498db);
    color: white;
    box-shadow: 0 0 20px rgba(52, 152, 219, 0.5);
  }

  .move-count, .evaluation {
    font-size: 14px;
    color: rgba(255,255,255,0.7);
  }

  .check-warning {
    color: #f1c40f;
    font-weight: bold;
    animation: pulse 1s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .main-content {
    display: grid;
    grid-template-columns: 280px 1fr 300px;
    gap: 20px;
    align-items: start;
  }

  .left-panel, .right-panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .center-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .preset-section {
    background: rgba(255,255,255,0.05);
    border-radius: 12px;
    padding: 16px;
  }

  .preset-section h3 {
    font-size: 16px;
    margin-bottom: 12px;
    color: rgba(255,255,255,0.9);
  }

  .preset-buttons {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .preset-btn {
    padding: 10px 12px;
    background: linear-gradient(135deg, #2c3e50, #34495e);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    color: white;
    cursor: pointer;
    font-size: 13px;
    transition: all 0.3s;
  }

  .preset-btn:hover {
    background: linear-gradient(135deg, #34495e, #3d566e);
    border-color: rgba(52, 152, 219, 0.5);
    transform: translateX(4px);
  }

  .preset-btn.active {
    background: linear-gradient(135deg, #2980b9, #3498db);
    border-color: #3498db;
  }

  .captured-section {
    background: rgba(255,255,255,0.05);
    border-radius: 12px;
    padding: 16px;
  }

  .captured-section h3 {
    font-size: 16px;
    margin-bottom: 12px;
    color: rgba(255,255,255,0.9);
  }

  .captured-row {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .captured-col h4 {
    font-size: 12px;
    color: rgba(255,255,255,0.6);
    margin-bottom: 6px;
  }

  .captured-pieces {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    min-height: 30px;
  }

  .captured-piece {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    font-size: 12px;
    font-weight: bold;
  }

  .captured-piece.north { background: rgba(231, 76, 60, 0.3); color: #e74c3c; }
  .captured-piece.south { background: rgba(52, 152, 219, 0.3); color: #3498db; }

  .game-over-banner {
    margin-top: 20px;
    padding: 20px;
    background: linear-gradient(135deg, rgba(241, 196, 15, 0.2), rgba(231, 76, 60, 0.2));
    border-radius: 12px;
    text-align: center;
    border: 2px solid #f1c40f;
  }

  .game-over-banner h2 {
    font-size: 24px;
    margin-bottom: 12px;
    color: #f1c40f;
  }

  .reset-btn {
    padding: 10px 24px;
    background: linear-gradient(135deg, #27ae60, #2ecc71);
    border: none;
    border-radius: 8px;
    color: white;
    font-size: 14px;
    cursor: pointer;
  }

  .ai-stats-panel {
    margin-top: 20px;
    padding: 16px;
    background: rgba(255,255,255,0.05);
    border-radius: 12px;
  }

  .ai-stats-panel h4 {
    font-size: 14px;
    margin-bottom: 10px;
    color: rgba(255,255,255,0.9);
  }

  .stat-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    font-size: 12px;
    color: rgba(255,255,255,0.7);
  }

  @media (max-width: 1200px) {
    .main-content {
      grid-template-columns: 1fr;
    }
  }
</style>

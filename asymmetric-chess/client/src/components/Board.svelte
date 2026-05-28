<script>
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();

  export let board = [];
  export let selectedPiece = null;
  export let legalMoves = [];
  export let lastMove = null;
  export let flippingPiece = null;
  export let invalidMoveError = null;
  export let moveProgress = [];
  export let particles = [];

  const PIECE_SYMBOLS = {
    R: { chinese: '车', symbol: '♖' },
    N: { chinese: '骑', symbol: '♘' },
    B: { chinese: '谋', symbol: '♗' },
    K: { chinese: '帅', symbol: '♔' },
    Q: { chinese: '炮', symbol: '♕' },
    P: { chinese: '兵', symbol: '♙' },
    v: { chinese: '锋', symbol: '♜' },
    a: { chinese: '刺', symbol: '♞' },
    h: { chinese: '弓', symbol: '♝' },
    k: { chinese: '首', symbol: '♚' },
    s: { chinese: '祭', symbol: '♛' },
    w: { chinese: '卒', symbol: '♟' }
  };

  function handleSquareClick(x, y) {
    dispatch('squareClick', { x, y });
  }

  function isLegalMoveTarget(x, y) {
    return legalMoves.some(m => m.to[0] === x && m.to[1] === y);
  }

  function isSelected(x, y) {
    return selectedPiece && selectedPiece.from[0] === x && selectedPiece.from[1] === y;
  }

  function isLastMove(x, y) {
    if (!lastMove) return false;
    return (lastMove.from[0] === x && lastMove.from[1] === y) ||
           (lastMove.to[0] === x && lastMove.to[1] === y);
  }

  function isInvalidSquare(x, y) {
    if (!invalidMoveError) return false;
    return (invalidMoveError.from[0] === x && invalidMoveError.from[1] === y) ||
           (invalidMoveError.to[0] === x && invalidMoveError.to[1] === y);
  }
</script>

<div class="board-container">
  <div class="board" style="--cell-size: 64px;">
    {#each board as row, x}
      {#each row as cell, y}
        {@const piece = cell}
        {@const isLight = (x + y) % 2 === 0}
        {@const legalTarget = isLegalMoveTarget(x, y)}
        {@const selected = isSelected(x, y)}
        {@const lastMoveSquare = isLastMove(x, y)}
        {@const invalid = isInvalidSquare(x, y)}
        {@const flipping = flippingPiece && flippingPiece.x === x && flippingPiece.y === y}
        {@const showProgress = moveProgress.length > 0 && moveProgress[y]?.active}

        <div
          class="square {isLight ? 'light' : 'dark'} {selected ? 'selected' : ''}
                 {lastMoveSquare ? 'last-move' : ''} {invalid ? 'invalid' : ''}
                 {showProgress ? 'progress' : ''} {legalTarget ? 'legal-target' : ''}"
          on:click={() => handleSquareClick(x, y)}
          style="--delay: {(x * 8 + y) * 20}ms;"
        >
          {#if legalTarget}
            <div class="move-indicator {piece ? 'capture' : ''}"></div>
          {/if}

          {#if piece}
            <div
              class="piece {piece.side} {flipping ? 'flipping' : ''}"
              style="--piece-color: {piece.side === 'north' ? '#c0392b' : '#2980b9'}"
            >
              <span class="piece-symbol">{PIECE_SYMBOLS[piece.type]?.symbol || piece.type}</span>
              <span class="piece-chinese">{PIECE_SYMBOLS[piece.type]?.chinese || ''}</span>
            </div>
          {/if}

          {#if flipping}
            <div class="flip-overlay">
              <div class="flip-inner">
                <div class="flip-front">
                  <span class="piece-symbol">{PIECE_SYMBOLS[flipping.from]?.symbol}</span>
                </div>
                <div class="flip-back">
                  <span class="piece-symbol">{PIECE_SYMBOLS[flipping.to]?.symbol}</span>
                </div>
              </div>
            </div>
          {/if}

          <span class="coord-label x-label">{x + 1}</span>
          {#if x === 7}
            <span class="coord-label y-label">{String.fromCharCode(97 + y)}</span>
          {/if}
        </div>
      {/each}
    {/each}

    {#each particles as p}
      <div
        class="particle"
        style="
          --x: {p.x};
          --y: {p.y};
          --vx: {p.vx};
          --vy: {p.vy};
          --life: {p.life};
          --color: {p.color};
          --size: {p.size}px;
        "
      />
    {/each}
  </div>
</div>

<style>
  .board-container {
    perspective: 1000px;
    padding: 10px;
  }

  .board {
    display: grid;
    grid-template-columns: repeat(8, var(--cell-size));
    grid-template-rows: repeat(8, var(--cell-size));
    gap: 2px;
    background: #1a1a2e;
    padding: 4px;
    border-radius: 8px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
    position: relative;
  }

  .square {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    overflow: hidden;
  }

  .square.light { background: #f0d9b5; }
  .square.dark { background: #b58863; }

  .square:hover {
    filter: brightness(1.1);
  }

  .square.selected {
    box-shadow: inset 0 0 0 4px #f1c40f;
    animation: selectedPulse 1.5s infinite;
  }

  @keyframes selectedPulse {
    0%, 100% { box-shadow: inset 0 0 0 4px #f1c40f; }
    50% { box-shadow: inset 0 0 0 6px #f39c12; }
  }

  .square.last-move {
    box-shadow: inset 0 0 0 3px rgba(52, 152, 219, 0.7);
  }

  .square.invalid {
    animation: invalidShake 0.5s ease;
    box-shadow: inset 0 0 0 4px #e74c3c;
  }

  @keyframes invalidShake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-8px); }
    40% { transform: translateX(8px); }
    60% { transform: translateX(-5px); }
    80% { transform: translateX(5px); }
  }

  .square.progress {
    animation: progressGlow 0.3s ease;
  }

  @keyframes progressGlow {
    0% { box-shadow: inset 0 0 0 0 #2ecc71; }
    50% { box-shadow: inset 0 0 0 3px #2ecc71; }
    100% { box-shadow: inset 0 0 0 0 #2ecc71; }
  }

  .square.legal-target {
    cursor: pointer;
  }

  .move-indicator {
    position: absolute;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: rgba(46, 204, 113, 0.6);
    animation: indicatorPulse 1.5s infinite;
    pointer-events: none;
    z-index: 5;
  }

  .move-indicator.capture {
    width: calc(var(--cell-size) - 8px);
    height: calc(var(--cell-size) - 8px);
    background: transparent;
    border: 4px solid rgba(231, 76, 60, 0.8);
    border-radius: 50%;
    animation: capturePulse 1s infinite;
  }

  @keyframes indicatorPulse {
    0%, 100% { opacity: 0.6; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.1); }
  }

  @keyframes capturePulse {
    0%, 100% { border-color: rgba(231, 76, 60, 0.6); transform: scale(1); }
    50% { border-color: rgba(231, 76, 60, 1); transform: scale(1.05); }
  }

  .piece {
    font-size: 36px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 3;
    transition: transform 0.3s ease;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
    user-select: none;
  }

  .piece:hover {
    transform: scale(1.1);
  }

  .piece.north {
    color: #c0392b;
    filter: drop-shadow(0 2px 4px rgba(192, 57, 43, 0.5));
  }

  .piece.south {
    color: #2980b9;
    filter: drop-shadow(0 2px 4px rgba(41, 128, 185, 0.5));
  }

  .piece-symbol {
    font-size: 36px;
    line-height: 1;
  }

  .piece-chinese {
    font-size: 10px;
    opacity: 0.7;
    margin-top: 2px;
  }

  .piece.flipping {
    animation: flip3d 0.8s ease;
  }

  @keyframes flip3d {
    0% { transform: rotateY(0deg) scale(1); }
    50% { transform: rotateY(180deg) scale(1.2); }
    100% { transform: rotateY(360deg) scale(1); }
  }

  .flip-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    perspective: 500px;
    z-index: 10;
  }

  .flip-inner {
    position: relative;
    width: 100%;
    height: 100%;
    transform-style: preserve-3d;
    animation: flipPromote 1s ease forwards;
  }

  @keyframes flipPromote {
    0% { transform: rotateY(0deg); }
    100% { transform: rotateY(360deg); }
  }

  .flip-front, .flip-back {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    backface-visibility: hidden;
    font-size: 36px;
  }

  .flip-front { transform: rotateY(0deg); }
  .flip-back { transform: rotateY(180deg); }

  .coord-label {
    position: absolute;
    font-size: 9px;
    opacity: 0.5;
    pointer-events: none;
  }

  .x-label {
    left: 2px;
    top: 2px;
  }

  .y-label {
    right: 2px;
    bottom: 2px;
  }

  .particle {
    position: absolute;
    width: var(--size);
    height: var(--size);
    background: var(--color);
    border-radius: 50%;
    pointer-events: none;
    left: calc(var(--x) * var(--cell-size) + var(--cell-size) / 2);
    top: calc(var(--y) * var(--cell-size) + var(--cell-size) / 2);
    transform: translate(-50%, -50%);
    opacity: var(--life);
    animation: particleFade 1.5s ease-out forwards;
    box-shadow: 0 0 8px var(--color);
    z-index: 100;
  }

  @keyframes particleFade {
    0% {
      transform: translate(-50%, -50%) scale(1) translate(0, 0);
      opacity: 1;
    }
    100% {
      transform: translate(
        calc(-50% + var(--vx) * 30px),
        calc(-50% + var(--vy) * 30px + 20px)
      ) scale(0);
      opacity: 0;
    }
  }
</style>

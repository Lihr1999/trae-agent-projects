const {
  createInitialBoard,
  cloneBoard,
  getLegalMoves,
  makeMove,
  evaluateBoard,
  isGameOver,
  getPieceInfo,
  boardToKey
} = require('./rules');
const { computeHash } = require('./zobrist');

const TRANSPOSITION_TABLE = new Map();

const SEARCH_STATS = {
  nodesExplored: 0,
  maxDepth: 0,
  cutoffs: 0,
  transpositionHits: 0,
  startTime: 0,
  searchPath: []
};

function resetStats() {
  SEARCH_STATS.nodesExplored = 0;
  SEARCH_STATS.maxDepth = 0;
  SEARCH_STATS.cutoffs = 0;
  SEARCH_STATS.transpositionHits = 0;
  SEARCH_STATS.startTime = Date.now();
  SEARCH_STATS.searchPath = [];
}

function orderMoves(moves, board, side) {
  const scored = moves.map(m => {
    let score = 0;
    if (m.capture) {
      const captured = board[m.to[0]][m.to[1]];
      if (captured) {
        const capInfo = getPieceInfo(captured);
        const moverInfo = getPieceInfo(board[m.from[0]][m.from[1]]);
        score += (capInfo?.value || 100) - (moverInfo?.value || 100) / 10;
      }
    }
    if (m.doubleMove) score += 10;
    if (m.promotion) score += 800;
    return { move: m, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.map(s => s.move);
}

function quiescenceSearch(board, alpha, beta, side, depth, path) {
  SEARCH_STATS.nodesExplored++;

  const standPat = evaluateBoard(board) * (side === 'north' ? 1 : -1);

  if (depth <= 0) return standPat;

  if (standPat >= beta) return beta;
  if (alpha < standPat) alpha = standPat;

  const moves = getLegalMoves(board, side);
  const captureMoves = moves.filter(m => m.capture);

  for (const move of captureMoves) {
    const { board: newBoard } = makeMove(board, move);
    const newSide = side === 'north' ? 'south' : 'north';
    const score = -quiescenceSearch(newBoard, -beta, -alpha, newSide, depth - 1, [...path, move]);
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }

  return alpha;
}

function alphaBeta(board, depth, alpha, beta, side, path, useTT = true) {
  SEARCH_STATS.nodesExplored++;
  SEARCH_STATS.maxDepth = Math.max(SEARCH_STATS.maxDepth, path.length);

  if (useTT) {
    const hash = computeHash(board, side);
    const entry = TRANSPOSITION_TABLE.get(hash);
    if (entry && entry.depth >= depth) {
      SEARCH_STATS.transpositionHits++;
      if (entry.flag === 'exact') return entry.score;
      if (entry.flag === 'lower' && entry.score > alpha) alpha = entry.score;
      if (entry.flag === 'upper' && entry.score < beta) beta = entry.score;
      if (alpha >= beta) return entry.score;
    }
  }

  const gameState = isGameOver(board, side);
  if (gameState.over) {
    if (gameState.result === 'checkmate') {
      return (gameState.winner === 'north' ? 1 : -1) * 100000 - (100 - path.length);
    }
    return 0;
  }

  if (depth <= 0) {
    return quiescenceSearch(board, alpha, beta, side, 3, path);
  }

  const originalAlpha = alpha;
  const moves = orderMoves(getLegalMoves(board, side), board, side);

  if (moves.length === 0) {
    return evaluateBoard(board) * (side === 'north' ? 1 : -1);
  }

  let bestMove = moves[0];
  let bestScore = -Infinity;
  const hash = computeHash(board, side);

  for (const move of moves) {
    const { board: newBoard, special } = makeMove(board, move);
    const newSide = side === 'north' ? 'south' : 'north';

    if (SEARCH_STATS.searchPath.length < 50) {
      SEARCH_STATS.searchPath.push({
        from: move.from,
        to: move.to,
        depth: depth,
        score: null,
        special: special ? special.type : null
      });
    }

    let score;
    if (special && special.type === 'promotion') {
      score = -alphaBeta(newBoard, depth - 1, -beta, -alpha, newSide, [...path, move], useTT);
    } else {
      score = -alphaBeta(newBoard, depth - 1, -beta, -alpha, newSide, [...path, move], useTT);
    }

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }

    if (score > alpha) {
      alpha = score;
    }

    if (alpha >= beta) {
      SEARCH_STATS.cutoffs++;
      break;
    }
  }

  if (useTT) {
    let flag = 'exact';
    if (bestScore <= originalAlpha) flag = 'upper';
    else if (bestScore >= beta) flag = 'lower';

    TRANSPOSITION_TABLE.set(hash, {
      depth,
      score: bestScore,
      flag,
      bestMove: bestMove ? { from: bestMove.from, to: bestMove.to } : null
    });
  }

  return bestScore;
}

function iterativeDeepening(board, side, maxDepth = 4, timeLimit = 5000) {
  resetStats();
  let bestMove = null;
  let bestScore = 0;
  const searchPathTree = [];

  const moves = orderMoves(getLegalMoves(board, side), board, side);
  if (moves.length === 0) return { move: null, score: 0, stats: { ...SEARCH_STATS }, searchTree: searchPathTree };

  bestMove = moves[0];

  for (let depth = 1; depth <= maxDepth; depth++) {
    let alpha = -Infinity;
    let beta = Infinity;
    let currentBestMove = null;
    let currentBestScore = -Infinity;
    const depthTree = [];

    const orderedMoves = bestMove ? [bestMove, ...moves.filter(m =>
      !(m.from[0] === bestMove.from[0] && m.from[1] === bestMove.from[1] &&
        m.to[0] === bestMove.to[0] && m.to[1] === bestMove.to[1])
    )] : moves;

    for (const move of orderedMoves) {
      if (Date.now() - SEARCH_STATS.startTime > timeLimit) break;

      const { board: newBoard, special } = makeMove(board, move);
      const newSide = side === 'north' ? 'south' : 'north';

      SEARCH_STATS.searchPath = [];

      const score = -alphaBeta(newBoard, depth - 1, -beta, -alpha, newSide, [move], true);

      const moveEntry = {
        from: move.from,
        to: move.to,
        score,
        depth,
        path: SEARCH_STATS.searchPath.slice(0, 20),
        special: special ? special.type : null
      };
      depthTree.push(moveEntry);

      if (score > currentBestScore) {
        currentBestScore = score;
        currentBestMove = move;
      }

      if (score > alpha) alpha = score;
    }

    if (currentBestMove) {
      bestMove = currentBestMove;
      bestScore = currentBestScore;
      searchPathTree.push({
        depth,
        moves: depthTree,
        bestMove: currentBestMove ? { from: currentBestMove.from, to: currentBestMove.to } : null
      });
    }

    if (Date.now() - SEARCH_STATS.startTime > timeLimit) break;
  }

  return {
    move: bestMove,
    score: bestScore,
    stats: {
      nodesExplored: SEARCH_STATS.nodesExplored,
      maxDepth: SEARCH_STATS.maxDepth,
      cutoffs: SEARCH_STATS.cutoffs,
      transpositionHits: SEARCH_STATS.transpositionHits,
      timeMs: Date.now() - SEARCH_STATS.startTime
    },
    searchTree: searchPathTree
  };
}

function getBestMove(board, side, depth = 4) {
  return iterativeDeepening(board, side, depth);
}

function clearTranspositionTable() {
  TRANSPOSITION_TABLE.clear();
}

function getTranspositionTableSize() {
  return TRANSPOSITION_TABLE.size;
}

function checkZobristCollision(board, side) {
  const hash = computeHash(board, side);
  const entry = TRANSPOSITION_TABLE.get(hash);
  if (entry && entry.bestMove) {
    const testBoard = cloneBoard(board);
    const piece = testBoard[entry.bestMove.from[0]][entry.bestMove.from[1]];
    const key = boardToKey(board);
    return { hasCollision: false, hash, storedScore: entry.score, actualScore: evaluateBoard(board), key };
  }
  return { hasCollision: false, hash, score: evaluateBoard(board) };
}

module.exports = {
  alphaBeta,
  iterativeDeepening,
  getBestMove,
  clearTranspositionTable,
  getTranspositionTableSize,
  checkZobristCollision,
  SEARCH_STATS,
  resetStats
};

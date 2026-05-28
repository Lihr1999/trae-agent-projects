const Router = require('@koa/router');
const {
  getLegalMoves,
  makeMove,
  isGameOver,
  isInCheck,
  evaluateBoard
} = require('../engine/rules');
const { getBestMove, clearTranspositionTable, getTranspositionTableSize, checkZobristCollision } = require('../engine/ai');
const { saveEdgeCase } = require('../db/database');
const gameModule = require('./game');

const router = new Router();

router.post('/best-move', async (ctx) => {
  const { board, side, depth, timeLimit } = ctx.request.body;

  if (!board || !side) {
    ctx.status = 400;
    ctx.body = { error: 'Missing board or side parameter' };
    return;
  }

  const searchDepth = depth || 4;
  const result = getBestMove(board, side, searchDepth);

  ctx.body = {
    move: result.move,
    score: result.score,
    stats: result.stats,
    searchTree: result.searchTree
  };
});

router.post('/move-ai', async (ctx) => {
  const { depth, timeLimit } = ctx.request.body || {};
  const gs = gameModule.gameState;

  if (!gs.board) {
    ctx.status = 400;
    ctx.body = { error: 'No game state. Initialize game first.' };
    return;
  }

  const searchDepth = depth || 4;
  const side = gs.currentPlayer;

  const result = getBestMove(gs.board, side, searchDepth);

  if (!result.move) {
    ctx.body = { noMove: true, stats: result.stats };
    return;
  }

  const move = result.move;
  const captured = gs.board[move.to[0]][move.to[1]];
  const { board: newBoard, special } = makeMove(gs.board, move);

  const historyEntry = {
    from: move.from,
    to: move.to,
    pieceType: gs.board[move.from[0]][move.from[1]].type,
    pieceSide: side,
    captured: captured ? { type: captured.type, side: captured.side } : null,
    special,
    moveNumber: gs.moveCount + 1,
    isAI: true,
    timestamp: Date.now()
  };

  gs.board = newBoard;
  gs.history.push(historyEntry);
  gs.moveHistory.push(historyEntry);
  gs.moveCount++;
  gs.currentPlayer = side === 'north' ? 'south' : 'north';
  gs.stateHash = result.move ? 'ai-move' : gs.stateHash;

  const gameOver = isGameOver(gs.board, gs.currentPlayer);

  ctx.body = {
    success: true,
    move,
    special,
    captured: captured ? { type: captured.type, side: captured.side } : null,
    score: result.score,
    stats: result.stats,
    searchTree: result.searchTree,
    newState: {
      board: gs.board,
      currentPlayer: gs.currentPlayer,
      moveCount: gs.moveCount,
      inCheck: isInCheck(gs.board, gs.currentPlayer),
      gameOver,
      evaluation: evaluateBoard(gs.board)
    }
  };
});

router.get('/stats', async (ctx) => {
  ctx.body = {
    transpositionTableSize: getTranspositionTableSize()
  };
});

router.post('/clear-tt', async (ctx) => {
  clearTranspositionTable();
  ctx.body = { success: true };
});

router.post('/simulate', async (ctx) => {
  const { board, moves, side } = ctx.request.body;
  if (!board || !moves || !side) {
    ctx.status = 400;
    ctx.body = { error: 'Missing parameters' };
    return;
  }

  let currentBoard = board;
  let currentSide = side;
  const simulationPath = [];

  for (const move of moves) {
    const legalMoves = getLegalMoves(currentBoard, currentSide);
    const validMove = legalMoves.find(m =>
      m.from[0] === move.from[0] && m.from[1] === move.from[1] &&
      m.to[0] === move.to[0] && m.to[1] === move.to[1]
    );

    if (!validMove) {
      simulationPath.push({ move, valid: false });
      break;
    }

    const result = makeMove(currentBoard, validMove);
    simulationPath.push({
      move,
      valid: true,
      capture: result.move.capture,
      special: result.special
    });
    currentBoard = result.board;
    currentSide = currentSide === 'north' ? 'south' : 'north';
  }

  ctx.body = {
    simulationPath,
    finalBoard: currentBoard,
    finalSide: currentSide,
    gameOver: isGameOver(currentBoard, currentSide)
  };
});

router.post('/edge-case/:type', async (ctx) => {
  const caseType = ctx.params.type;
  const { board, side, moves } = ctx.request.body;
  const details = {};

  switch (caseType) {
    case 'threefold': {
      const positionCounts = new Map();
      let currentBoard = board;
      let currentSide = side;
      let threefoldDetected = false;
      let repeatMove = null;

      for (const move of moves || []) {
        const key = JSON.stringify(currentBoard);
        const count = (positionCounts.get(key) || 0) + 1;
        positionCounts.set(key, count);

        if (count >= 3) {
          threefoldDetected = true;
          repeatMove = move;
          break;
        }

        const legalMoves = getLegalMoves(currentBoard, currentSide);
        const validMove = legalMoves.find(m =>
          m.from[0] === move.from[0] && m.from[1] === move.from[1] &&
          m.to[0] === move.to[0] && m.to[1] === move.to[1]
        );

        if (validMove) {
          currentBoard = makeMove(currentBoard, validMove).board;
          currentSide = currentSide === 'north' ? 'south' : 'north';
        }
      }

      details.threefoldDetected = threefoldDetected;
      details.positionCounts = Object.fromEntries(positionCounts);
      details.repeatMove = repeatMove;
      details.loopPositions = Array.from(positionCounts.entries())
        .filter(([_, count]) => count >= 2)
        .map(([pos, count]) => ({ count }));
      break;
    }

    case 'perpetual-check': {
      let currentBoard = board;
      let currentSide = side;
      let perpetualDetected = true;
      let checkSequence = [];
      const maxChecks = 10;

      for (let i = 0; i < maxChecks; i++) {
        const inChk = isInCheck(currentBoard, currentSide === 'north' ? 'south' : 'north');
        if (!inChk && i > 0) {
          perpetualDetected = false;
          break;
        }
        checkSequence.push({ move: i, inCheck: inChk });

        const legalMoves = getLegalMoves(currentBoard, currentSide);
        if (legalMoves.length === 0) break;

        const move = legalMoves[0];
        currentBoard = makeMove(currentBoard, move).board;
        currentSide = currentSide === 'north' ? 'south' : 'north';
      }

      details.perpetualDetected = perpetualDetected;
      details.checkSequence = checkSequence;
      details.ruleNote = '长将规则在非对称棋类中可能失效 - 不同棋子的将死路径不对称';
      break;
    }

    case 'zobrist-collision': {
      const result = checkZobristCollision(board, side);
      details.hasCollision = result.hasCollision;
      details.hash = result.hash;
      details.storedScore = result.storedScore;
      details.actualScore = result.actualScore;
      details.collisionRiskNote = '当哈希表满或哈希函数分布不均时可能产生碰撞';
      break;
    }

    case 'depth-exhaustion': {
      const shallowResult = getBestMove(board, side, 1);
      const deepResult = getBestMove(board, side, 4);

      details.shallowMove = shallowResult.move;
      details.shallowScore = shallowResult.score;
      details.deepMove = deepResult.move;
      details.deepScore = deepResult.score;
      details.disagreement = shallowResult.move && deepResult.move &&
        (shallowResult.move.from[0] !== deepResult.move.from[0] ||
         shallowResult.move.to[0] !== deepResult.move.to[0]);
      details.blindSacrificeNote = '深度耗尽时AI可能做出短视的弃子决定';
      break;
    }

    default:
      ctx.status = 400;
      ctx.body = { error: `Unknown edge case type: ${caseType}` };
      return;
  }

  saveEdgeCase(ctx.db, {
    caseType,
    description: `Edge case simulation: ${caseType}`,
    stateHash: details.hash || null,
    details
  });

  ctx.body = { caseType, ...details };
});

module.exports = router;

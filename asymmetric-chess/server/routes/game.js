const Router = require('koa-router');
const {
  createInitialBoard,
  getLegalMoves,
  makeMove,
  isGameOver,
  isInCheck,
  getPieceInfo,
  evaluateBoard,
  boardToKey
} = require('../engine/rules');
const { computeHash } = require('../engine/zobrist');
const { saveGame, getGame, updateGame, saveMove, getMoveHistory, saveEdgeCase } = require('../db/database');

const router = new Router();

let gameState = {
  board: createInitialBoard(),
  currentPlayer: 'north',
  moveCount: 0,
  stateHash: '',
  history: [],
  gameId: null,
  moveHistory: []
};

gameState.stateHash = computeHash(gameState.board, gameState.currentPlayer);

function syncGameState() {
  gameState.stateHash = computeHash(gameState.board, gameState.currentPlayer);
}

router.get('/state', async (ctx) => {
  ctx.body = {
    board: gameState.board,
    currentPlayer: gameState.currentPlayer,
    moveCount: gameState.moveCount,
    stateHash: gameState.stateHash,
    history: gameState.history,
    inCheck: isInCheck(gameState.board, gameState.currentPlayer),
    gameOver: isGameOver(gameState.board, gameState.currentPlayer),
    evaluation: evaluateBoard(gameState.board)
  };
});

router.post('/reset', async (ctx) => {
  gameState = {
    board: createInitialBoard(),
    currentPlayer: 'north',
    moveCount: 0,
    stateHash: '',
    history: [],
    gameId: null,
    moveHistory: []
  };
  syncGameState();
  ctx.body = { success: true, message: 'Game reset' };
});

router.post('/move', async (ctx) => {
  const { from, to } = ctx.request.body;

  if (!from || !to || !Array.isArray(from) || !Array.isArray(to)) {
    ctx.status = 400;
    ctx.body = { error: 'Invalid move format. Expected {from: [x,y], to: [x,y]}' };
    return;
  }

  const piece = gameState.board[from[0]][from[1]];
  if (!piece) {
    ctx.status = 400;
    ctx.body = { error: 'No piece at source position', invalid: true };
    return;
  }

  if (piece.side !== gameState.currentPlayer) {
    ctx.status = 400;
    ctx.body = { error: `Not your turn. Current player: ${gameState.currentPlayer}`, invalid: true };
    return;
  }

  const legalMoves = getLegalMoves(gameState.board, gameState.currentPlayer);
  const validMove = legalMoves.find(m =>
    m.from[0] === from[0] && m.from[1] === from[1] &&
    m.to[0] === to[0] && m.to[1] === to[1]
  );

  if (!validMove) {
    ctx.status = 400;
    ctx.body = {
      error: 'Invalid move',
      invalid: true,
      from,
      to,
      legalMoves: legalMoves.filter(m => m.from[0] === from[0] && m.from[1] === from[1])
    };
    return;
  }

  const { board: newBoard, special } = makeMove(gameState.board, validMove);
  const capturedPiece = gameState.board[to[0]][to[1]];

  const historyEntry = {
    from,
    to,
    pieceType: piece.type,
    pieceSide: piece.side,
    captured: capturedPiece ? { type: capturedPiece.type, side: capturedPiece.side } : null,
    special,
    moveNumber: gameState.moveCount + 1,
    timestamp: Date.now()
  };

  gameState.board = newBoard;
  gameState.history.push(historyEntry);
  gameState.moveHistory.push(historyEntry);
  gameState.moveCount++;
  gameState.currentPlayer = gameState.currentPlayer === 'north' ? 'south' : 'north';
  syncGameState();

  const gameOver = isGameOver(gameState.board, gameState.currentPlayer);

  ctx.body = {
    success: true,
    move: validMove,
    special,
    captured: capturedPiece ? { type: capturedPiece.type, side: capturedPiece.side } : null,
    newState: {
      board: gameState.board,
      currentPlayer: gameState.currentPlayer,
      moveCount: gameState.moveCount,
      stateHash: gameState.stateHash,
      inCheck: isInCheck(gameState.board, gameState.currentPlayer),
      gameOver,
      evaluation: evaluateBoard(gameState.board)
    }
  };
});

router.get('/moves/:x/:y', async (ctx) => {
  const x = parseInt(ctx.params.x);
  const y = parseInt(ctx.params.y);

  const piece = gameState.board[x][y];
  if (!piece) {
    ctx.body = { moves: [] };
    return;
  }

  if (piece.side !== gameState.currentPlayer) {
    ctx.body = { moves: [], error: 'Not your turn' };
    return;
  }

  const legalMoves = getLegalMoves(gameState.board, gameState.currentPlayer);
  const pieceMoves = legalMoves.filter(m => m.from[0] === x && m.from[1] === y);

  ctx.body = { moves: pieceMoves, piece: piece.type };
});

router.get('/all-legal-moves', async (ctx) => {
  const legalMoves = getLegalMoves(gameState.board, gameState.currentPlayer);
  ctx.body = { moves: legalMoves, count: legalMoves.length };
});

router.get('/history', async (ctx) => {
  ctx.body = { history: gameState.history };
});

router.get('/check', async (ctx) => {
  ctx.body = {
    inCheck: isInCheck(gameState.board, gameState.currentPlayer),
    player: gameState.currentPlayer
  };
});

router.get('/game-over', async (ctx) => {
  ctx.body = isGameOver(gameState.board, gameState.currentPlayer);
});

router.post('/save', async (ctx) => {
  const { name } = ctx.request.body || {};
  const gameId = saveGame(ctx.db, {
    name: name || `Game ${Date.now()}`,
    stateHash: gameState.stateHash,
    boardState: gameState.board,
    currentPlayer: gameState.currentPlayer,
    moveCount: gameState.moveCount
  });
  gameState.gameId = gameId;
  ctx.body = { success: true, gameId };
});

router.get('/load/:id', async (ctx) => {
  const game = getGame(ctx.db, ctx.params.id);
  if (!game) {
    ctx.status = 404;
    ctx.body = { error: 'Game not found' };
    return;
  }
  gameState.board = JSON.parse(game.board_state);
  gameState.currentPlayer = game.current_player;
  gameState.moveCount = game.move_count;
  gameState.gameId = game.id;
  syncGameState();
  ctx.body = { success: true, game };
});

router.get('/move-history/:gameId', async (ctx) => {
  const history = getMoveHistory(ctx.db, ctx.params.gameId);
  ctx.body = { history };
});

module.exports = { router, gameState };

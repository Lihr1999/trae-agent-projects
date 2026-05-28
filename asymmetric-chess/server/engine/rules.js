const PIECE_TYPES = {
  north: {
    R: { name: '战车', chinese: '车', value: 500 },
    N: { name: '骑兵', chinese: '骑', value: 320, canMultiJump: true },
    B: { name: '谋士', chinese: '谋', value: 330 },
    K: { name: '统帅', chinese: '帅', value: 20000 },
    Q: { name: '火炮', chinese: '炮', value: 450, cannonCapture: true },
    P: { name: '步兵', chinese: '兵', value: 100, promoteTo: ['N', 'B'] }
  },
  south: {
    v: { name: '先锋', chinese: '锋', value: 400, maxRange: 3 },
    a: { name: '刺客', chinese: '刺', value: 340, knightPlus: true },
    h: { name: '弓手', chinese: '弓', value: 310, maxRange: 3, cannonCapture: true },
    k: { name: '首领', chinese: '首', value: 20000 },
    s: { name: '祭司', chinese: '祭', value: 420, maxRange: 2 },
    w: { name: '战士', chinese: '卒', value: 110, canDoubleMove: true, promoteTo: ['a', 's'] }
  }
};

const KNIGHT_OFFSETS = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2],
  [1, -2], [1, 2], [2, -1], [2, 1]
];

const KING_OFFSETS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1]
];

const DIRS = {
  orthogonal: [[-1, 0], [1, 0], [0, -1], [0, 1]],
  diagonal: [[-1, -1], [-1, 1], [1, -1], [1, 1]]
};

const BOARD_SIZE = 8;

function createInitialBoard() {
  const board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));

  board[0][0] = { type: 'R', side: 'north' };
  board[0][1] = { type: 'N', side: 'north' };
  board[0][2] = { type: 'B', side: 'north' };
  board[0][3] = { type: 'K', side: 'north' };
  board[0][4] = { type: 'Q', side: 'north' };
  board[0][5] = { type: 'B', side: 'north' };
  board[0][6] = { type: 'N', side: 'north' };
  board[0][7] = { type: 'R', side: 'north' };
  for (let i = 0; i < BOARD_SIZE; i++) {
    board[1][i] = { type: 'P', side: 'north' };
  }

  board[7][0] = { type: 'v', side: 'south' };
  board[7][1] = { type: 'a', side: 'south' };
  board[7][2] = { type: 'h', side: 'south' };
  board[7][3] = { type: 'k', side: 'south' };
  board[7][4] = { type: 's', side: 'south' };
  board[7][5] = { type: 'h', side: 'south' };
  board[7][6] = { type: 'a', side: 'south' };
  board[7][7] = { type: 'v', side: 'south' };
  for (let i = 0; i < BOARD_SIZE; i++) {
    board[6][i] = { type: 'w', side: 'south' };
  }

  return board;
}

function cloneBoard(board) {
  return board.map(row => row.map(cell => cell ? { ...cell } : null));
}

function inBounds(x, y) {
  return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

function isEmpty(board, x, y) {
  return inBounds(x, y) && board[x][y] === null;
}

function isEnemy(board, x, y, side) {
  return inBounds(x, y) && board[x][y] !== null && board[x][y].side !== side;
}

function isFriendly(board, x, y, side) {
  return inBounds(x, y) && board[x][y] !== null && board[x][y].side === side;
}

function getPieceInfo(piece) {
  if (!piece) return null;
  return PIECE_TYPES[piece.side][piece.type];
}

function getSlidingMoves(board, x, y, directions, side, maxRange = Infinity) {
  const moves = [];
  for (const [dx, dy] of directions) {
    let count = 0;
    let nx = x + dx, ny = y + dy;
    while (inBounds(nx, ny) && count < maxRange) {
      if (board[nx][ny] === null) {
        moves.push({ from: [x, y], to: [nx, ny] });
      } else {
        if (board[nx][ny].side !== side) {
          moves.push({ from: [x, y], to: [nx, ny], capture: true });
        }
        break;
      }
      nx += dx;
      ny += dy;
      count++;
    }
  }
  return moves;
}

function getCannonMoves(board, x, y, directions, side, maxRange = Infinity) {
  const moves = [];
  for (const [dx, dy] of directions) {
    let count = 0;
    let nx = x + dx, ny = y + dy;
    let jumped = false;

    while (inBounds(nx, ny) && count < maxRange) {
      if (!jumped) {
        if (board[nx][ny] === null) {
          moves.push({ from: [x, y], to: [nx, ny] });
        } else {
          jumped = true;
        }
      } else {
        if (board[nx][ny] !== null) {
          if (board[nx][ny].side !== side) {
            moves.push({ from: [x, y], to: [nx, ny], capture: true, cannon: true });
          }
          break;
        }
      }
      nx += dx;
      ny += dy;
      count++;
    }
  }
  return moves;
}

function getKnightMoves(board, x, y, side) {
  const moves = [];
  for (const [dx, dy] of KNIGHT_OFFSETS) {
    const nx = x + dx, ny = y + dy;
    if (inBounds(nx, ny)) {
      if (board[nx][ny] === null) {
        moves.push({ from: [x, y], to: [nx, ny], knightJump: true });
      } else if (board[nx][ny].side !== side) {
        moves.push({ from: [x, y], to: [nx, ny], capture: true, knightJump: true });
      }
    }
  }
  return moves;
}

function getKingMoves(board, x, y, side) {
  const moves = [];
  for (const [dx, dy] of KING_OFFSETS) {
    const nx = x + dx, ny = y + dy;
    if (inBounds(nx, ny)) {
      if (board[nx][ny] === null) {
        moves.push({ from: [x, y], to: [nx, ny] });
      } else if (board[nx][ny].side !== side) {
        moves.push({ from: [x, y], to: [nx, ny], capture: true });
      }
    }
  }
  return moves;
}

function getPawnMoves(board, x, y, piece) {
  const moves = [];
  const side = piece.side;
  const forward = side === 'north' ? 1 : -1;
  const info = getPieceInfo(piece);

  const nx = x + forward;
  if (inBounds(nx, y) && board[nx][y] === null) {
    moves.push({ from: [x, y], to: [nx, y] });

    if (info.canDoubleMove) {
      const startRow = side === 'north' ? 1 : 6;
      if (x === startRow) {
        const nx2 = x + 2 * forward;
        if (board[nx2][y] === null) {
          moves.push({ from: [x, y], to: [nx2, y], doubleMove: true });
        }
      }
    }
  }

  for (const dy of [-1, 1]) {
    const cx = x + forward;
    const cy = y + dy;
    if (inBounds(cx, cy) && board[cx][cy] !== null && board[cx][cy].side !== side) {
      moves.push({ from: [x, y], to: [cx, cy], capture: true });
    }
  }

  return moves;
}

function getPieceMoves(board, x, y) {
  const piece = board[x][y];
  if (!piece) return [];

  const info = getPieceInfo(piece);
  const side = piece.side;
  let moves = [];

  switch (piece.type) {
    case 'R':
      moves = getSlidingMoves(board, x, y, DIRS.orthogonal, side);
      break;
    case 'N': {
      const knightMoves = getKnightMoves(board, x, y, side);
      moves = knightMoves;
      break;
    }
    case 'B':
      moves = getSlidingMoves(board, x, y, DIRS.diagonal, side);
      break;
    case 'K':
      moves = getKingMoves(board, x, y, side);
      break;
    case 'Q':
      moves = getCannonMoves(board, x, y, DIRS.orthogonal, side);
      break;
    case 'P':
      moves = getPawnMoves(board, x, y, piece);
      break;
    case 'v':
      moves = getSlidingMoves(board, x, y, DIRS.orthogonal, side, info.maxRange);
      break;
    case 'a': {
      const knightMoves = getKnightMoves(board, x, y, side);
      moves = knightMoves;
      if (info.knightPlus) {
        for (const [dx, dy] of DIRS.diagonal) {
          const nx = x + dx, ny = y + dy;
          if (inBounds(nx, ny)) {
            if (board[nx][ny] === null) {
              moves.push({ from: [x, y], to: [nx, ny] });
            } else if (board[nx][ny].side !== side) {
              moves.push({ from: [x, y], to: [nx, ny], capture: true });
            }
          }
        }
      }
      break;
    }
    case 'h':
      moves = getCannonMoves(board, x, y, DIRS.diagonal, side, info.maxRange);
      break;
    case 'k':
      moves = getKingMoves(board, x, y, side);
      break;
    case 's':
      moves = getSlidingMoves(board, x, y, [...DIRS.orthogonal, ...DIRS.diagonal], side, info.maxRange);
      break;
    case 'w':
      moves = getPawnMoves(board, x, y, piece);
      break;
  }

  return moves;
}

function getAllMoves(board, side) {
  const allMoves = [];
  for (let x = 0; x < BOARD_SIZE; x++) {
    for (let y = 0; y < BOARD_SIZE; y++) {
      const piece = board[x][y];
      if (piece && piece.side === side) {
        const moves = getPieceMoves(board, x, y);
        allMoves.push(...moves);
      }
    }
  }
  return allMoves;
}

function makeMove(board, move) {
  const newBoard = cloneBoard(board);
  const piece = newBoard[move.from[0]][move.from[1]];
  if (!piece) return { board: newBoard, move };

  const info = getPieceInfo(piece);

  if (move.capture) {
    newBoard[move.to[0]][move.to[1]] = piece;
  } else {
    newBoard[move.to[0]][move.to[1]] = piece;
  }
  newBoard[move.from[0]][move.from[1]] = null;

  let special = null;
  if (info && info.promoteTo) {
    const promoteRow = piece.side === 'north' ? 7 : 0;
    if (move.to[0] === promoteRow) {
      const promoteChoice = info.promoteTo[0];
      newBoard[move.to[0]][move.to[1]] = { type: promoteChoice, side: piece.side };
      special = { type: 'promotion', from: piece.type, to: promoteChoice };
    }
  }

  return { board: newBoard, move, special };
}

function findKing(board, side) {
  const kingType = side === 'north' ? 'K' : 'k';
  for (let x = 0; x < BOARD_SIZE; x++) {
    for (let y = 0; y < BOARD_SIZE; y++) {
      if (board[x][y] && board[x][y].type === kingType && board[x][y].side === side) {
        return [x, y];
      }
    }
  }
  return null;
}

function isSquareAttacked(board, x, y, attackerSide) {
  const moves = getAllMoves(board, attackerSide);
  return moves.some(m => m.to[0] === x && m.to[1] === y);
}

function isInCheck(board, side) {
  const kingPos = findKing(board, side);
  if (!kingPos) return false;
  const attackerSide = side === 'north' ? 'south' : 'north';
  return isSquareAttacked(board, kingPos[0], kingPos[1], attackerSide);
}

function getLegalMoves(board, side) {
  const allMoves = getAllMoves(board, side);
  return allMoves.filter(move => {
    const { board: newBoard } = makeMove(board, move);
    return !isInCheck(newBoard, side);
  });
}

function isGameOver(board, side) {
  const legalMoves = getLegalMoves(board, side);
  if (legalMoves.length === 0) {
    if (isInCheck(board, side)) {
      return { over: true, result: 'checkmate', winner: side === 'north' ? 'south' : 'north' };
    }
    return { over: true, result: 'stalemate', winner: null };
  }
  return { over: false };
}

function evaluateBoard(board) {
  let score = 0;
  const centerBonus = [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 0],
    [0, 1, 2, 2, 2, 2, 1, 0],
    [0, 1, 2, 3, 3, 2, 1, 0],
    [0, 1, 2, 3, 3, 2, 1, 0],
    [0, 1, 2, 2, 2, 2, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 0],
    [0, 0, 0, 0, 0, 0, 0, 0]
  ];

  for (let x = 0; x < BOARD_SIZE; x++) {
    for (let y = 0; y < BOARD_SIZE; y++) {
      const piece = board[x][y];
      if (!piece) continue;
      const info = getPieceInfo(piece);
      if (!info) continue;
      const posBonus = centerBonus[x][y];
      const val = info.value + posBonus * 5;
      score += piece.side === 'north' ? val : -val;
    }
  }
  return score;
}

function boardToKey(board) {
  let key = '';
  for (let x = 0; x < BOARD_SIZE; x++) {
    for (let y = 0; y < BOARD_SIZE; y++) {
      const piece = board[x][y];
      key += piece ? piece.type : '.';
    }
  }
  return key;
}

module.exports = {
  PIECE_TYPES,
  BOARD_SIZE,
  createInitialBoard,
  cloneBoard,
  inBounds,
  isEmpty,
  isEnemy,
  isFriendly,
  getPieceInfo,
  getPieceMoves,
  getAllMoves,
  makeMove,
  findKing,
  isSquareAttacked,
  isInCheck,
  getLegalMoves,
  isGameOver,
  evaluateBoard,
  boardToKey
};

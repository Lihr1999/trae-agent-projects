const { BOARD_SIZE } = require('./rules');

function xorshift64(seed) {
  let state = seed || 0xDEADBEEF12345678n;
  return function () {
    state ^= state << 13n;
    state ^= state >> 7n;
    state ^= state << 17n;
    return state;
  };
}

const PIECE_TYPES_ALL = ['R', 'N', 'B', 'K', 'Q', 'P', 'v', 'a', 'h', 'k', 's', 'w'];
const SIDES = ['north', 'south'];

function generateZobristTable(seed) {
  const rand = xorshift64(BigInt(seed || 12345));
  const table = {};

  for (const side of SIDES) {
    table[side] = {};
    for (const type of PIECE_TYPES_ALL) {
      table[side][type] = [];
      for (let x = 0; x < BOARD_SIZE; x++) {
        const row = [];
        for (let y = 0; y < BOARD_SIZE; y++) {
          row.push(rand().toString(16));
        }
        table[side][type].push(row);
      }
    }
  }

  table.sideToMove = {
    north: rand().toString(16),
    south: rand().toString(16)
  };

  return table;
}

const ZOBRIST_TABLE = generateZobristTable(42);

function computeHash(board, sideToMove) {
  let hash = 0n;

  for (let x = 0; x < BOARD_SIZE; x++) {
    for (let y = 0; y < BOARD_SIZE; y++) {
      const piece = board[x][y];
      if (piece) {
        const hexVal = ZOBRIST_TABLE[piece.side][piece.type][x][y];
        hash ^= BigInt('0x' + hexVal);
      }
    }
  }

  if (sideToMove) {
    hash ^= BigInt('0x' + ZOBRIST_TABLE.sideToMove[sideToMove]);
  }

  return hash.toString(16);
}

function computeHashIncremental(currentHash, board, move, sideToMove) {
  let hash = BigInt('0x' + currentHash);

  const fromPiece = board[move.from[0]][move.from[1]];
  if (fromPiece) {
    hash ^= BigInt('0x' + ZOBRIST_TABLE[fromPiece.side][fromPiece.type][move.from[0]][move.from[1]]);
  }

  const toPiece = board[move.to[0]][move.to[1]];
  if (toPiece) {
    hash ^= BigInt('0x' + ZOBRIST_TABLE[toPiece.side][toPiece.type][move.to[0]][move.to[1]]);
  }

  if (fromPiece) {
    hash ^= BigInt('0x' + ZOBRIST_TABLE[fromPiece.side][fromPiece.type][move.to[0]][move.to[1]]);
  }

  if (sideToMove) {
    const otherSide = sideToMove === 'north' ? 'south' : 'north';
    hash ^= BigInt('0x' + ZOBRIST_TABLE.sideToMove[sideToMove]);
    hash ^= BigInt('0x' + ZOBRIST_TABLE.sideToMove[otherSide]);
  }

  return hash.toString(16);
}

module.exports = {
  ZOBRIST_TABLE,
  computeHash,
  computeHashIncremental,
  generateZobristTable
};

function initDatabase(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      state_hash TEXT NOT NULL,
      board_state TEXT NOT NULL,
      current_player TEXT NOT NULL DEFAULT 'north',
      move_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS move_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL,
      move_number INTEGER NOT NULL,
      from_x INTEGER NOT NULL,
      from_y INTEGER NOT NULL,
      to_x INTEGER NOT NULL,
      to_y INTEGER NOT NULL,
      piece_type TEXT NOT NULL,
      player TEXT NOT NULL,
      captured_piece TEXT,
      is_special TEXT,
      state_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (game_id) REFERENCES games(id)
    );

    CREATE TABLE IF NOT EXISTS opening_book (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      state_hash TEXT NOT NULL UNIQUE,
      move_data TEXT NOT NULL,
      visit_count INTEGER DEFAULT 0,
      win_count INTEGER DEFAULT 0,
      depth INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS transposition_table (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      state_hash TEXT NOT NULL UNIQUE,
      depth INTEGER NOT NULL,
      score REAL NOT NULL,
      flag TEXT NOT NULL,
      best_move TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS edge_case_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_type TEXT NOT NULL,
      description TEXT,
      game_id INTEGER,
      state_hash TEXT,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_move_history_game ON move_history(game_id);
    CREATE INDEX IF NOT EXISTS idx_opening_book_hash ON opening_book(state_hash);
    CREATE INDEX IF NOT EXISTS idx_transposition_hash ON transposition_table(state_hash);
    CREATE INDEX IF NOT EXISTS idx_games_hash ON games(state_hash);
  `);

  const count = db.prepare('SELECT COUNT(*) as cnt FROM opening_book').get();
  if (count.cnt === 0) {
    const insertOpening = db.prepare(
      'INSERT OR IGNORE INTO opening_book (state_hash, move_data, visit_count, depth) VALUES (?, ?, ?, ?)'
    );
    const openings = [
      ['init_north_cavalry_d4', JSON.stringify({ from: [0, 1], to: [2, 2], piece: 'cavalry' }), 10, 1],
      ['init_north_chariot_h4', JSON.stringify({ from: [0, 0], to: [0, 3], piece: 'chariot' }), 8, 1],
      ['init_south_assassin_g5', JSON.stringify({ from: [7, 6], to: [5, 5], piece: 'assassin' }), 7, 1],
      ['init_south_vanguard_e6', JSON.stringify({ from: [7, 4], to: [7, 7], piece: 'vanguard' }), 6, 1]
    ];
    const insertMany = db.transaction((items) => {
      for (const item of items) {
        insertOpening.run(...item);
      }
    });
    insertMany(openings);
  }
}

function saveGame(db, gameData) {
  const stmt = db.prepare(`
    INSERT INTO games (name, state_hash, board_state, current_player, move_count)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    gameData.name,
    gameData.stateHash,
    JSON.stringify(gameData.boardState),
    gameData.currentPlayer,
    gameData.moveCount
  );
  return result.lastInsertRowid;
}

function getGame(db, gameId) {
  return db.prepare('SELECT * FROM games WHERE id = ?').get(gameId);
}

function updateGame(db, gameId, gameData) {
  db.prepare(`
    UPDATE games SET state_hash = ?, board_state = ?, current_player = ?,
    move_count = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(
    gameData.stateHash,
    JSON.stringify(gameData.boardState),
    gameData.currentPlayer,
    gameData.moveCount,
    gameId
  );
}

function saveMove(db, moveData) {
  db.prepare(`
    INSERT INTO move_history (game_id, move_number, from_x, from_y, to_x, to_y,
    piece_type, player, captured_piece, is_special, state_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    moveData.gameId,
    moveData.moveNumber,
    moveData.from[0],
    moveData.from[1],
    moveData.to[0],
    moveData.to[1],
    moveData.pieceType,
    moveData.player,
    moveData.capturedPiece || null,
    moveData.isSpecial || null,
    moveData.stateHash
  );
}

function getMoveHistory(db, gameId) {
  return db.prepare('SELECT * FROM move_history WHERE game_id = ? ORDER BY move_number').all(gameId);
}

function saveEdgeCase(db, caseData) {
  db.prepare(`
    INSERT INTO edge_case_logs (case_type, description, game_id, state_hash, details)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    caseData.caseType,
    caseData.description,
    caseData.gameId || null,
    caseData.stateHash || null,
    caseData.details ? JSON.stringify(caseData.details) : null
  );
}

module.exports = {
  initDatabase,
  saveGame,
  getGame,
  updateGame,
  saveMove,
  getMoveHistory,
  saveEdgeCase
};

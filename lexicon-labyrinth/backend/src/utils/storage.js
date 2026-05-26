const fs = require('fs');
const path = require('path');

class Storage {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.levelsFile = path.join(dataDir, 'levels.json');
    this.progressFile = path.join(dataDir, 'progress.json');
    this._ensureDataDir();
    this._initFiles();
  }

  _ensureDataDir() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  _initFiles() {
    if (!fs.existsSync(this.levelsFile)) {
      fs.writeFileSync(this.levelsFile, JSON.stringify([], null, 2));
    }
    if (!fs.existsSync(this.progressFile)) {
      fs.writeFileSync(this.progressFile, JSON.stringify({ sessions: [] }, null, 2));
    }
  }

  _readJSON(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (err) {
      if (err.code === 'ENOENT') {
        return [];
      }
      throw new Error(`Failed to read ${filePath}: ${err.message}`);
    }
  }

  _writeJSON(filePath, data) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (err) {
      throw new Error(`Failed to write ${filePath}: ${err.message}`);
    }
  }

  saveLevel(levelData) {
    try {
      const levels = this._readJSON(this.levelsFile);
      levels.push(levelData);
      this._writeJSON(this.levelsFile, levels);
      return levelData;
    } catch (err) {
      console.error('Storage::saveLevel error:', err.message);
      return null;
    }
  }

  getLevel(levelId) {
    try {
      const levels = this._readJSON(this.levelsFile);
      return levels.find(l => l.id === levelId) || null;
    } catch (err) {
      console.error('Storage::getLevel error:', err.message);
      return null;
    }
  }

  updateLevel(levelId, updates) {
    try {
      const levels = this._readJSON(this.levelsFile);
      const index = levels.findIndex(l => l.id === levelId);
      if (index === -1) return null;

      levels[index] = { ...levels[index], ...updates, updatedAt: Date.now() };
      this._writeJSON(this.levelsFile, levels);
      return levels[index];
    } catch (err) {
      console.error('Storage::updateLevel error:', err.message);
      return null;
    }
  }

  getAllLevels() {
    try {
      return this._readJSON(this.levelsFile);
    } catch (err) {
      console.error('Storage::getAllLevels error:', err.message);
      return [];
    }
  }

  deleteLevel(levelId) {
    try {
      const levels = this._readJSON(this.levelsFile);
      const filtered = levels.filter(l => l.id !== levelId);
      this._writeJSON(this.levelsFile, filtered);
      return filtered.length !== levels.length;
    } catch (err) {
      console.error('Storage::deleteLevel error:', err.message);
      return false;
    }
  }

  saveProgress(sessionData) {
    try {
      const progress = this._readJSON(this.progressFile);
      if (!progress.sessions) progress.sessions = [];
      progress.sessions.push(sessionData);
      this._writeJSON(this.progressFile, progress);
      return sessionData;
    } catch (err) {
      console.error('Storage::saveProgress error:', err.message);
      return null;
    }
  }

  getProgress(sessionId) {
    try {
      const progress = this._readJSON(this.progressFile);
      return progress.sessions?.find(s => s.id === sessionId) || null;
    } catch (err) {
      console.error('Storage::getProgress error:', err.message);
      return null;
    }
  }

  updateProgress(sessionId, updates) {
    try {
      const progress = this._readJSON(this.progressFile);
      if (!progress.sessions) progress.sessions = [];
      const index = progress.sessions.findIndex(s => s.id === sessionId);
      if (index === -1) return null;

      progress.sessions[index] = {
        ...progress.sessions[index],
        ...updates,
        updatedAt: Date.now()
      };
      this._writeJSON(this.progressFile, progress);
      return progress.sessions[index];
    } catch (err) {
      console.error('Storage::updateProgress error:', err.message);
      return null;
    }
  }

  getProgressStats() {
    try {
      const progress = this._readJSON(this.progressFile);
      const sessions = progress.sessions || [];
      const completed = sessions.filter(s => s.completed).length;
      const totalAttempts = sessions.reduce((sum, s) => sum + (s.attempts || 0), 0);
      return {
        totalSessions: sessions.length,
        completedSessions: completed,
        completionRate: sessions.length > 0 ? (completed / sessions.length * 100).toFixed(1) : 0,
        totalAttempts
      };
    } catch (err) {
      console.error('Storage::getProgressStats error:', err.message);
      return { totalSessions: 0, completedSessions: 0, completionRate: 0, totalAttempts: 0 };
    }
  }

  cleanupOldLevels(maxAgeMs = 24 * 60 * 60 * 1000) {
    try {
      const levels = this._readJSON(this.levelsFile);
      const now = Date.now();
      const filtered = levels.filter(l => {
        const age = now - (l.createdAt || 0);
        return age < maxAgeMs;
      });
      if (filtered.length !== levels.length) {
        this._writeJSON(this.levelsFile, filtered);
      }
      return levels.length - filtered.length;
    } catch (err) {
      console.error('Storage::cleanupOldLevels error:', err.message);
      return 0;
    }
  }
}

module.exports = { Storage };

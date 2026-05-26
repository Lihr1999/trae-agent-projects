const { Trie } = require('./trie');
const { BASIC_WORDS, RARE_WORDS, CYCLE_WORDS, MASSIVE_WORDS_POOL } = require('./dictionary');

class LevelGenerator {
  constructor(trie) {
    this.trie = trie;
  }

  generateLevel(mode, config = {}) {
    const settings = this._getModeSettings(mode, config);
    const words = this._selectWords(settings);
    const dependencyGraph = this._buildDependencyGraph(words, settings);
    const letterPool = this._createLetterPool(words, settings);
    const grid = this._createGrid(letterPool, settings);
    return {
      id: this._generateId(),
      mode,
      difficulty: settings.difficulty,
      words: words.map(w => ({ word: w, solved: false })),
      dependencyGraph,
      grid,
      letterPool,
      createdAt: Date.now()
    };
  }

  _getModeSettings(mode, config) {
    const base = {
      wordCount: 4,
      minLength: 3,
      maxLength: 6,
      gridSize: 6,
      difficulty: 1,
      allowCycle: false,
      shuffleLetters: true
    };
    switch (mode) {
      case 'basic':
        return { ...base, wordCount: config.wordCount || 4, difficulty: 1 };
      case 'rare':
        return { ...base, wordCount: config.wordCount || 5, minLength: 4, maxLength: 8, difficulty: 2 };
      case 'cycle':
        return { ...base, wordCount: config.wordCount || 6, difficulty: 3, allowCycle: true, gridSize: 7 };
      case 'massive':
        return { ...base, wordCount: config.wordCount || 8, difficulty: 4, gridSize: 8 };
      default:
        return base;
    }
  }

  _selectWords(settings) {
    const { wordCount, minLength, maxLength, allowCycle } = settings;
    const selected = [];
    const usedIndices = new Set();
    let attempts = 0;
    const maxAttempts = 200;

    while (selected.length < wordCount && attempts < maxAttempts) {
      attempts++;
      const randomWord = this.trie.getRandomWord(minLength, maxLength);
      if (!randomWord) continue;
      if (selected.includes(randomWord)) continue;

      if (allowCycle && selected.length > 0) {
        const hasOverlap = selected.some(w => {
          const shared = this._getSharedLetters(randomWord, w);
          return shared.length >= Math.min(2, randomWord.length - 1);
        });
        if (!hasOverlap && selected.length < wordCount - 1) {
          selected.push(randomWord);
          continue;
        }
      }

      selected.push(randomWord);
    }

    while (selected.length < wordCount) {
      const fallback = this.trie.getRandomWord(minLength, maxLength);
      if (fallback && !selected.includes(fallback)) {
        selected.push(fallback);
      } else {
        break;
      }
    }

    return selected;
  }

  _getSharedLetters(word1, word2) {
    const set1 = new Set(word1);
    const set2 = new Set(word2);
    return [...set1].filter(l => set2.has(l));
  }

  _buildDependencyGraph(words, settings) {
    const graph = {
      nodes: [],
      edges: []
    };

    words.forEach((word, index) => {
      graph.nodes.push({
        id: `word_${index}`,
        word,
        x: 100 + (index % 3) * 200,
        y: 100 + Math.floor(index / 3) * 150,
        solved: false
      });
    });

    const visited = new Set();
    const edges = [];

    this._backtrackDependencies(graph.nodes, 0, visited, edges, settings);

    graph.edges = edges;
    return graph;
  }

  _backtrackDependencies(nodes, startIndex, visited, edges, settings) {
    if (startIndex >= nodes.length) return;

    const current = nodes[startIndex];
    if (visited.has(current.id)) return;

    visited.add(current.id);

    for (let i = startIndex + 1; i < nodes.length; i++) {
      const next = nodes[i];
      if (visited.has(next.id)) continue;

      const sharedLetters = this._getSharedLetters(current.word, next.word);
      if (sharedLetters.length > 0 || settings.allowCycle) {
        const dependencyType = sharedLetters.length > 0 ? 'shares_letters' : 'cycle';
        edges.push({
          from: current.id,
          to: next.id,
          sharedLetters,
          type: dependencyType
        });

        this._backtrackDependencies(nodes, i, visited, edges, settings);

        if (settings.allowCycle && Math.random() < 0.3) {
          edges.push({
            from: next.id,
            to: current.id,
            sharedLetters,
            type: 'cycle',
            isCycle: true
          });
        }
      }
    }
  }

  _createLetterPool(words, settings) {
    const allLetters = [];
    const letterCount = {};

    for (const word of words) {
      for (const letter of word) {
        letterCount[letter] = (letterCount[letter] || 0) + 1;
      }
    }

    for (const [letter, count] of Object.entries(letterCount)) {
      const extra = Math.ceil(count * 0.5);
      for (let i = 0; i < count + extra; i++) {
        allLetters.push(letter);
      }
    }

    if (settings.shuffleLetters) {
      for (let i = allLetters.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allLetters[i], allLetters[j]] = [allLetters[j], allLetters[i]];
      }
    }

    return allLetters;
  }

  _createGrid(letterPool, settings) {
    const size = settings.gridSize;
    const grid = [];
    let letterIndex = 0;

    for (let row = 0; row < size; row++) {
      const gridRow = [];
      for (let col = 0; col < size; col++) {
        if (letterIndex < letterPool.length) {
          gridRow.push({
            letter: letterPool[letterIndex],
            row,
            col,
            selected: false,
            rotation: Math.floor(Math.random() * 4) * 90
          });
          letterIndex++;
        } else {
          gridRow.push({
            letter: null,
            row,
            col,
            selected: false,
            rotation: 0
          });
        }
      }
      grid.push(gridRow);
    }

    return grid;
  }

  _generateId() {
    return 'level_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  validateWord(word) {
    return this.trie.search(word);
  }

  suggestWord(prefix, limit = 10) {
    return this.trie.getWordsWithPrefix(prefix, limit);
  }
}

function createLevelGenerator(mode) {
  const trie = new Trie();

  switch (mode) {
    case 'basic':
      trie.buildFromWordList(BASIC_WORDS);
      break;
    case 'rare':
      trie.buildFromWordList(RARE_WORDS);
      break;
    case 'cycle':
      trie.buildFromWordList(CYCLE_WORDS);
      break;
    case 'massive':
      trie.buildFromWordList(MASSIVE_WORDS_POOL);
      trie.buildFromWordList(BASIC_WORDS);
      break;
    default:
      trie.buildFromWordList(BASIC_WORDS);
  }

  return new LevelGenerator(trie);
}

module.exports = { LevelGenerator, createLevelGenerator };

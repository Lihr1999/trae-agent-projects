class TrieNode {
  constructor() {
    this.children = {};
    this.isEndOfWord = false;
    this.word = null;
    this.frequency = 0;
  }
}

class Trie {
  constructor() {
    this.root = new TrieNode();
    this.wordCount = 0;
  }

  insert(word, frequency = 1) {
    if (!word || typeof word !== 'string') return false;
    const cleanWord = word.toLowerCase().trim();
    if (!cleanWord) return false;

    let current = this.root;
    for (const char of cleanWord) {
      if (!current.children[char]) {
        current.children[char] = new TrieNode();
      }
      current = current.children[char];
    }

    if (!current.isEndOfWord) {
      current.isEndOfWord = true;
      current.word = cleanWord;
      this.wordCount++;
    }
    current.frequency = frequency;
    return true;
  }

  search(word) {
    if (!word || typeof word !== 'string') return false;
    const cleanWord = word.toLowerCase().trim();
    if (!cleanWord) return false;

    let current = this.root;
    for (const char of cleanWord) {
      if (!current.children[char]) return false;
      current = current.children[char];
    }
    return current.isEndOfWord;
  }

  searchWithData(word) {
    if (!word || typeof word !== 'string') return null;
    const cleanWord = word.toLowerCase().trim();
    if (!cleanWord) return null;

    let current = this.root;
    for (const char of cleanWord) {
      if (!current.children[char]) return null;
      current = current.children[char];
    }
    return current.isEndOfWord
      ? { word: current.word, frequency: current.frequency }
      : null;
  }

  startsWith(prefix) {
    if (!prefix || typeof prefix !== 'string') return false;
    const cleanPrefix = prefix.toLowerCase().trim();
    if (!cleanPrefix) return false;

    let current = this.root;
    for (const char of cleanPrefix) {
      if (!current.children[char]) return false;
      current = current.children[char];
    }
    return true;
  }

  getWordsWithPrefix(prefix, limit = 50) {
    if (!prefix || typeof prefix !== 'string') return [];
    const cleanPrefix = prefix.toLowerCase().trim();
    if (!cleanPrefix) return [];

    let current = this.root;
    for (const char of cleanPrefix) {
      if (!current.children[char]) return [];
      current = current.children[char];
    }

    const results = [];
    this._collectWords(current, results, limit);
    return results;
  }

  _collectWords(node, results, limit) {
    if (results.length >= limit) return;
    if (node.isEndOfWord) {
      results.push({ word: node.word, frequency: node.frequency });
    }
    for (const char of Object.keys(node.children).sort()) {
      if (results.length >= limit) break;
      this._collectWords(node.children[char], results, limit);
    }
  }

  getRandomWord(minLength = 3, maxLength = 8) {
    const allWords = [];
    this._collectAllWords(this.root, allWords, minLength, maxLength);
    if (allWords.length === 0) return null;
    return allWords[Math.floor(Math.random() * allWords.length)];
  }

  _collectAllWords(node, results, minLength, maxLength) {
    if (node.isEndOfWord) {
      const len = node.word.length;
      if (len >= minLength && len <= maxLength) {
        results.push(node.word);
      }
    }
    for (const char of Object.keys(node.children)) {
      this._collectAllWords(node.children[char], results, minLength, maxLength);
    }
  }

  buildFromWordList(wordList) {
    if (!Array.isArray(wordList)) return 0;
    let count = 0;
    for (const word of wordList) {
      if (this.insert(word)) count++;
    }
    return count;
  }

  getStats() {
    return {
      totalWords: this.wordCount,
      rootChildren: Object.keys(this.root.children).length,
    };
  }
}

module.exports = { Trie, TrieNode };

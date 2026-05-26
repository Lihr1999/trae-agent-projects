const API_BASE = 'http://localhost:3001';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  try {
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}`);
    }
    return data;
  } catch (err) {
    console.error(`API Error [${endpoint}]:`, err.message);
    throw err;
  }
}

export async function generateLevel(mode, config = {}) {
  return request('/api/levels/generate', {
    method: 'POST',
    body: JSON.stringify({ mode, config })
  });
}

export async function getLevel(levelId) {
  return request(`/api/levels/${levelId}`);
}

export async function updateLevel(levelId, updates) {
  return request(`/api/levels/${levelId}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
}

export async function validateWord(word, mode = 'basic') {
  return request('/api/validate/word', {
    method: 'POST',
    body: JSON.stringify({ word, mode })
  });
}

export async function validateSequence(sequence, mode = 'basic') {
  return request('/api/validate/sequence', {
    method: 'POST',
    body: JSON.stringify({ sequence, mode })
  });
}

export async function suggestWord(prefix, mode = 'basic', limit = 10) {
  return request('/api/suggest', {
    method: 'POST',
    body: JSON.stringify({ prefix, mode, limit })
  });
}

export async function saveProgress(levelId, moves, solvedWords, completed) {
  return request('/api/progress', {
    method: 'POST',
    body: JSON.stringify({ levelId, moves, solvedWords, completed })
  });
}

export async function updateProgress(sessionId, updates) {
  return request(`/api/progress/${sessionId}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
}

export async function getProgressStats() {
  return request('/api/progress/stats');
}

export async function getModes() {
  return request('/api/modes');
}

export async function simulateScenario(scenario, payload = {}) {
  return request('/api/simulate/scenario', {
    method: 'POST',
    body: JSON.stringify({ scenario, payload })
  });
}

export async function healthCheck() {
  return request('/api/health');
}

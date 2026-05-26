const fastify = require('fastify')({ logger: true });
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { createLevelGenerator } = require('./utils/levelGenerator');
const { Storage } = require('./utils/storage');

const DATA_DIR = path.join(__dirname, '..', 'data');
const storage = new Storage(DATA_DIR);
const generators = {};

function getGenerator(mode) {
  if (!generators[mode]) {
    generators[mode] = createLevelGenerator(mode);
  }
  return generators[mode];
}

function getRandomDelay(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

fastify.register(require('@fastify/cors'), {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
});

fastify.get('/api/health', async (request, reply) => {
  return {
    status: 'ok',
    service: 'Lexicon Labyrinth API',
    timestamp: Date.now()
  };
});

fastify.post('/api/levels/generate', async (request, reply) => {
  try {
    const { mode = 'basic', config = {} } = request.body || {};
    const validModes = ['basic', 'rare', 'cycle', 'massive'];

    if (!validModes.includes(mode)) {
      return reply.code(400).send({
        error: 'Invalid mode',
        message: `Mode must be one of: ${validModes.join(', ')}`
      });
    }

    const generator = getGenerator(mode);
    const level = generator.generateLevel(mode, config);

    storage.saveLevel(level);

    reply.code(201).send({
      success: true,
      level
    });
  } catch (err) {
    fastify.log.error(err, 'Error generating level');
    reply.code(500).send({
      error: 'Internal Server Error',
      message: err.message
    });
  }
});

fastify.get('/api/levels/:levelId', async (request, reply) => {
  try {
    const { levelId } = request.params;
    const level = storage.getLevel(levelId);

    if (!level) {
      return reply.code(404).send({
        error: 'Not Found',
        message: `Level ${levelId} not found`
      });
    }

    reply.send({ success: true, level });
  } catch (err) {
    fastify.log.error(err, 'Error fetching level');
    reply.code(500).send({
      error: 'Internal Server Error',
      message: err.message
    });
  }
});

fastify.put('/api/levels/:levelId', async (request, reply) => {
  try {
    const { levelId } = request.params;
    const updates = request.body || {};

    const updated = storage.updateLevel(levelId, updates);
    if (!updated) {
      return reply.code(404).send({
        error: 'Not Found',
        message: `Level ${levelId} not found`
      });
    }

    reply.send({ success: true, level: updated });
  } catch (err) {
    fastify.log.error(err, 'Error updating level');
    reply.code(500).send({
      error: 'Internal Server Error',
      message: err.message
    });
  }
});

fastify.delete('/api/levels/:levelId', async (request, reply) => {
  try {
    const { levelId } = request.params;
    const deleted = storage.deleteLevel(levelId);

    if (!deleted) {
      return reply.code(404).send({
        error: 'Not Found',
        message: `Level ${levelId} not found`
      });
    }

    reply.send({ success: true, message: 'Level deleted' });
  } catch (err) {
    fastify.log.error(err, 'Error deleting level');
    reply.code(500).send({
      error: 'Internal Server Error',
      message: err.message
    });
  }
});

fastify.post('/api/validate/word', async (request, reply) => {
  try {
    const { word, mode = 'basic' } = request.body || {};

    if (!word || typeof word !== 'string') {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'Word is required and must be a string'
      });
    }

    if (word.length > 50) {
      return reply.code(413).send({
        error: 'Payload Too Large',
        message: 'Word exceeds maximum length of 50 characters'
      });
    }

    const validChars = /^[a-zA-Z]+$/;
    if (!validChars.test(word)) {
      return reply.code(422).send({
        error: 'Unprocessable Entity',
        message: 'Word contains invalid characters. Only A-Z allowed.',
        invalid: true
      });
    }

    const generator = getGenerator(mode);
    const isValid = generator.validateWord(word);

    const delay = getRandomDelay(50, 200);
    await new Promise(resolve => setTimeout(resolve, delay));

    reply.send({
      success: true,
      word: word.toLowerCase(),
      isValid,
      responseTime: delay
    });
  } catch (err) {
    fastify.log.error(err, 'Error validating word');
    reply.code(500).send({
      error: 'Internal Server Error',
      message: err.message
    });
  }
});

fastify.post('/api/validate/sequence', async (request, reply) => {
  try {
    const { sequence, mode = 'basic' } = request.body || {};

    if (!Array.isArray(sequence)) {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'Sequence must be an array of letters'
      });
    }

    if (sequence.length > 100) {
      return reply.code(413).send({
        error: 'Payload Too Large',
        message: 'Sequence exceeds maximum length'
      });
    }

    const word = sequence.join('').toLowerCase();
    const generator = getGenerator(mode);
    const isValid = generator.validateWord(word);

    reply.send({
      success: true,
      word,
      isValid,
      sequence
    });
  } catch (err) {
    fastify.log.error(err, 'Error validating sequence');
    reply.code(500).send({
      error: 'Internal Server Error',
      message: err.message
    });
  }
});

fastify.post('/api/suggest', async (request, reply) => {
  try {
    const { prefix, mode = 'basic', limit = 10 } = request.body || {};

    if (!prefix || typeof prefix !== 'string') {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'Prefix is required'
      });
    }

    const generator = getGenerator(mode);
    const suggestions = generator.suggestWord(prefix, Math.min(limit, 50));

    reply.send({
      success: true,
      prefix: prefix.toLowerCase(),
      suggestions
    });
  } catch (err) {
    fastify.log.error(err, 'Error getting suggestions');
    reply.code(500).send({
      error: 'Internal Server Error',
      message: err.message
    });
  }
});

fastify.post('/api/progress', async (request, reply) => {
  try {
    const { levelId, moves, solvedWords, completed = false } = request.body || {};
    const session = {
      id: uuidv4(),
      levelId,
      moves: moves || 0,
      solvedWords: solvedWords || [],
      completed,
      attempts: 1,
      createdAt: Date.now()
    };

    storage.saveProgress(session);
    reply.code(201).send({ success: true, session });
  } catch (err) {
    fastify.log.error(err, 'Error saving progress');
    reply.code(500).send({
      error: 'Internal Server Error',
      message: err.message
    });
  }
});

fastify.put('/api/progress/:sessionId', async (request, reply) => {
  try {
    const { sessionId } = request.params;
    const updates = request.body || {};

    const updated = storage.updateProgress(sessionId, updates);
    if (!updated) {
      return reply.code(404).send({
        error: 'Not Found',
        message: `Session ${sessionId} not found`
      });
    }

    reply.send({ success: true, session: updated });
  } catch (err) {
    fastify.log.error(err, 'Error updating progress');
    reply.code(500).send({
      error: 'Internal Server Error',
      message: err.message
    });
  }
});

fastify.get('/api/progress/stats', async (request, reply) => {
  try {
    const stats = storage.getProgressStats();
    reply.send({ success: true, stats });
  } catch (err) {
    fastify.log.error(err, 'Error getting progress stats');
    reply.code(500).send({
      error: 'Internal Server Error',
      message: err.message
    });
  }
});

fastify.get('/api/modes', async (request, reply) => {
  reply.send({
    success: true,
    modes: [
      { id: 'basic', name: '基础词汇', description: '常见单词，难度适中', difficulty: 1 },
      { id: 'rare', name: '生僻字挑战', description: '稀有词汇，考验词汇量', difficulty: 2 },
      { id: 'cycle', name: '循环依赖陷阱', description: '单词间存在循环依赖', difficulty: 3 },
      { id: 'massive', name: '超大词库压力', description: '海量词库，高难度挑战', difficulty: 4 }
    ]
  });
});

fastify.post('/api/simulate/scenario', async (request, reply) => {
  try {
    const { scenario, payload } = request.body || {};

    switch (scenario) {
      case 'long_word': {
        const longWord = 'a'.repeat(25);
        reply.code(413).send({
          error: 'Layout Overflow',
          message: 'Word too long for grid layout',
          wordLength: longWord.length,
          gridLimit: 12
        });
        break;
      }
      case 'invalid_chars': {
        reply.code(422).send({
          error: 'Input Freeze',
          message: 'Invalid characters detected. Input frozen.',
          frozen: true,
          validPattern: '^[a-zA-Z]+$'
        });
        break;
      }
      case 'high_frequency': {
        const delay = getRandomDelay(500, 1500);
        await new Promise(resolve => setTimeout(resolve, delay));
        reply.send({
          warning: 'State Sync Delay',
          message: 'High frequency rotation detected. State sync delayed.',
          delayMs: delay,
          synchronized: false
        });
        break;
      }
      case 'loading': {
        const delay = getRandomDelay(2000, 4000);
        await new Promise(resolve => setTimeout(resolve, delay));
        reply.send({
          status: 'loaded',
          message: 'Large dictionary loaded',
          loadTimeMs: delay,
          wordsLoaded: 50000
        });
        break;
      }
      default:
        reply.code(400).send({
          error: 'Unknown Scenario',
          message: `Scenario "${scenario}" not recognized`
        });
    }
  } catch (err) {
    fastify.log.error(err, 'Error simulating scenario');
    reply.code(500).send({
      error: 'Simulation Error',
      message: err.message
    });
  }
});

fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error, 'Unhandled error');
  const statusCode = error.statusCode || 500;
  reply.code(statusCode).send({
    error: error.code || 'Internal Error',
    message: error.message || 'An unexpected error occurred',
    timestamp: Date.now()
  });
});

const start = async () => {
  try {
    const port = process.env.PORT || 3001;
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`\n🚀 Lexicon Labyrinth API Server`);
    console.log(`📡 Listening on http://localhost:${port}`);
    console.log(`📁 Data directory: ${DATA_DIR}\n`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

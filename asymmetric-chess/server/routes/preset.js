const Router = require('@koa/router');

const router = new Router();

const PRESETS = {
  preset1: {
    name: '预设一 - 骑兵突进',
    description: '北骑兵深入敌后，形成局部兵力优势',
    board: [
      [{type:'R',side:'north'},null,null,null,null,null,null,{type:'R',side:'north'}],
      [{type:'P',side:'north'},{type:'P',side:'north'},null,null,null,{type:'P',side:'north'},{type:'P',side:'north'},{type:'P',side:'north'}],
      [null,null,null,{type:'N',side:'north'},null,null,null,null],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,null,{type:'a',side:'south'},null,null],
      [null,null,null,null,null,null,null,null],
      [{type:'w',side:'south'},{type:'w',side:'south'},null,{type:'w',side:'south'},{type:'w',side:'south'},{type:'w',side:'south'},{type:'w',side:'south'},{type:'w',side:'south'}],
      [{type:'v',side:'south'},null,{type:'h',side:'south'},{type:'k',side:'south'},{type:'s',side:'south'},{type:'h',side:'south'},null,{type:'v',side:'south'}]
    ],
    currentPlayer: 'north',
    moveCount: 8
  },
  preset2: {
    name: '预设二 - 长将困局',
    description: '演示长将规则判定失效的边界情况',
    board: [
      [null,null,null,null,{type:'K',side:'north'},null,null,null],
      [null,null,null,null,null,null,null,null],
      [null,null,{type:'Q',side:'north'},null,null,null,null,null],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,null,null,{type:'s',side:'south'},null],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,{type:'k',side:'south'},null,null,null]
    ],
    currentPlayer: 'south',
    moveCount: 15
  },
  preset3: {
    name: '预设三 - 升变前夕',
    description: '步兵即将升变，双方争夺升变格控制权',
    board: [
      [{type:'R',side:'north'},null,null,{type:'K',side:'north'},null,null,{type:'N',side:'north'},null],
      [{type:'P',side:'north'},null,{type:'B',side:'north'},null,null,null,null,{type:'P',side:'north'}],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,{type:'w',side:'south'},null,null,null],
      [{type:'v',side:'south'},null,{type:'h',side:'south'},{type:'k',side:'south'},{type:'s',side:'south'},null,{type:'a',side:'south'},{type:'v',side:'south'}]
    ],
    currentPlayer: 'north',
    moveCount: 20
  },
  preset4: {
    name: '预设四 - 连跳战术',
    description: '骑兵连跳多步，展示非对称棋子特殊能力',
    board: [
      [{type:'R',side:'north'},null,{type:'B',side:'north'},{type:'K',side:'north'},null,{type:'B',side:'north'},null,{type:'R',side:'north'}],
      [null,null,null,null,null,null,null,null],
      [null,null,{type:'N',side:'north'},null,null,null,null,null],
      [null,null,null,null,{type:'a',side:'south'},null,null,null],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null,null],
      [{type:'w',side:'south'},{type:'w',side:'south'},null,null,null,null,{type:'w',side:'south'},{type:'w',side:'south'}],
      [{type:'v',side:'south'},null,{type:'h',side:'south'},{type:'k',side:'south'},{type:'s',side:'south'},null,{type:'a',side:'south'},null]
    ],
    currentPlayer: 'north',
    moveCount: 12
  }
};

function createFullBoard(presetBoard) {
  const fullBoard = Array(8).fill(null).map(() => Array(8).fill(null));
  for (let x = 0; x < 8; x++) {
    for (let y = 0; y < 8; y++) {
      if (presetBoard[x][y]) {
        fullBoard[x][y] = { ...presetBoard[x][y] };
      }
    }
  }
  return fullBoard;
}

router.get('/:id', async (ctx) => {
  const presetId = ctx.params.id;
  const preset = PRESETS[presetId];

  if (!preset) {
    ctx.status = 404;
    ctx.body = { error: `Preset not found: ${presetId}. Available: ${Object.keys(PRESETS).join(', ')}` };
    return;
  }

  ctx.body = {
    id: presetId,
    name: preset.name,
    description: preset.description,
    board: createFullBoard(preset.board),
    currentPlayer: preset.currentPlayer,
    moveCount: preset.moveCount
  };
});

router.get('/', async (ctx) => {
  const list = Object.entries(PRESETS).map(([id, preset]) => ({
    id,
    name: preset.name,
    description: preset.description
  }));
  ctx.body = { presets: list };
});

module.exports = router;

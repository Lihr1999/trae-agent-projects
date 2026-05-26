const BASIC_WORDS = [
  'cat', 'dog', 'sun', 'moon', 'star', 'book', 'tree', 'fish', 'bird', 'home',
  'love', 'time', 'life', 'good', 'play', 'work', 'walk', 'run', 'jump', 'sing',
  'read', 'write', 'talk', 'smile', 'laugh', 'dream', 'hope', 'wish', 'mind',
  'hand', 'foot', 'eye', 'ear', 'nose', 'face', 'head', 'body', 'arm', 'leg',
  'rain', 'snow', 'wind', 'fire', 'water', 'earth', 'stone', 'sand', 'leaf',
  'cake', 'milk', 'bread', 'rice', 'meat', 'salt', 'sugar', 'coffee', 'tea',
  'door', 'wall', 'roof', 'room', 'table', 'chair', 'bed', 'lamp', 'clock',
  'red', 'blue', 'green', 'black', 'white', 'gold', 'gray', 'pink', 'orange',
  'code', 'data', 'node', 'byte', 'link', 'port', 'host', 'user', 'file', 'disk',
  'key', 'lock', 'box', 'bag', 'cap', 'hat', 'map', 'pen', 'car', 'bus'
];

const RARE_WORDS = [
  'azure', 'cobalt', 'crimson', 'ebony', 'ivory', 'mauve', 'ochre', 'vermilion',
  'abyss', 'arcane', 'aurora', 'basalt', 'bosque', 'canyon', 'cipher', 'covert',
  'dune', 'eclipse', 'ethereal', 'fjord', 'glacier', 'grotto', 'horizon', 'isthmus',
  'labyrinth', 'lagoon', 'mosaic', 'nebula', 'obsidian', 'paradox', 'phoenix',
  'prism', 'quasar', 'rift', 'sable', 'seraph', 'solstice', 'sphinx', 'talisman',
  'thorn', 'vortex', 'whisper', 'zenith', 'zymote', 'alchemy', 'behemoth',
  'chimera', 'delphi', 'ensign', 'fathom', 'galleon', 'harbor', 'iconoclast',
  'juggernaut', 'kaleidoscope', 'labrynthian', 'mausoleum', 'necropolis', 'oblivion'
];

const CYCLE_WORDS = [
  'loop', 'ring', 'cycle', 'chain', 'link', 'node', 'edge', 'path', 'route',
  'round', 'orbit', 'spin', 'turn', 'twist', 'wrap', 'bind', 'connect', 'join',
  'merge', 'fuse', 'blend', 'mix', 'mingle', 'intertwine', 'entangle', 'snarl',
  'knot', 'tangle', 'weave', 'braid', 'plait', 'interweave', 'interlock',
  'interlink', 'mesh', 'net', 'web', 'grid', 'matrix', 'network', 'system'
];

const MASSIVE_WORDS_POOL = [];
(function generateMassivePool() {
  const prefixes = ['pre', 'un', 're', 'dis', 'mis', 'over', 'under', 'out', 'in', 'up'];
  const roots = ['act', 'form', 'port', 'ject', 'duct', 'struct', 'spect', 'script', 'graph', 'log'];
  const suffixes = ['tion', 'ment', 'ness', 'able', 'ible', 'ful', 'less', 'ous', 'ive', 'ize'];
  for (const p of prefixes) {
    for (const r of roots) {
      for (const s of suffixes) {
        MASSIVE_WORDS_POOL.push(p + r + s);
      }
    }
  }
  for (const r of roots) {
    for (const s of suffixes) {
      MASSIVE_WORDS_POOL.push(r + s);
    }
  }
})();

module.exports = {
  BASIC_WORDS,
  RARE_WORDS,
  CYCLE_WORDS,
  MASSIVE_WORDS_POOL
};

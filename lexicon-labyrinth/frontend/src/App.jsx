import { useState, useEffect, useCallback, useRef } from 'react';
import GameBoard from './components/GameBoard.jsx';
import ProgressRing from './components/ProgressRing.jsx';
import WordList from './components/WordList.jsx';
import NetworkGraph from './components/NetworkGraph.jsx';
import LoadingOverlay from './components/LoadingOverlay.jsx';
import ErrorToast from './components/ErrorToast.jsx';
import FrozenOverlay from './components/FrozenOverlay.jsx';
import {
  generateLevel,
  validateWord,
  getModes,
  simulateScenario
} from './utils/api.js';

const MODES = [
  { id: 'basic', name: '基础词汇', desc: '常见单词，难度适中' },
  { id: 'rare', name: '生僻字挑战', desc: '稀有词汇，考验词汇量' },
  { id: 'cycle', name: '循环依赖陷阱', desc: '单词间存在循环依赖' },
  { id: 'massive', name: '超大词库压力', desc: '海量词库，高难度挑战' }
];

export default function App() {
  const [currentMode, setCurrentMode] = useState('basic');
  const [level, setLevel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [frozen, setFrozen] = useState(false);
  const [frozenMessage, setFrozenMessage] = useState('');
  const [selectedLetters, setSelectedLetters] = useState([]);
  const [selectedWordValid, setSelectedWordValid] = useState(null);
  const [solvedWords, setSolvedWords] = useState([]);
  const [moves, setMoves] = useState(0);
  const [rotations, setRotations] = useState({});
  const [lastRotateTime, setLastRotateTime] = useState(0);
  const [simulationStatus, setSimulationStatus] = useState(null);
  const rotationCountRef = useRef(0);
  const rotationTimersRef = useRef([]);

  useEffect(() => {
    const init = async () => {
      try {
        await getModes();
      } catch (e) {
        console.warn('Mode fetch failed, using defaults');
      }
    };
    init();
  }, []);

  const handleGenerateLevel = useCallback(async (mode) => {
    setLoading(true);
    setError(null);
    setFrozen(false);
    setSelectedLetters([]);
    setSelectedWordValid(null);
    setSolvedWords([]);
    setMoves(0);
    setRotations({});
    setSimulationStatus(null);

    if (mode === 'massive') {
      setSimulationStatus('正在加载超大词库...');
    }

    try {
      const result = await generateLevel(mode);
      setLevel(result.level);
      setCurrentMode(mode);
      setSimulationStatus(null);
    } catch (err) {
      setError(err.message || 'Failed to generate level');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    handleGenerateLevel('basic');
  }, []);

  const handleModeSelect = (modeId) => {
    handleGenerateLevel(modeId);
  };

  const handleLetterClick = (row, col, letter) => {
    if (frozen) return;

    const key = `${row}-${col}`;
    const existingIndex = selectedLetters.findIndex(l => l.key === key);

    if (existingIndex >= 0) {
      setSelectedLetters(selectedLetters.filter((_, i) => i !== existingIndex));
    } else {
      setSelectedLetters([...selectedLetters, { key, row, col, letter }]);
    }
    setSelectedWordValid(null);
  };

  const handleLetterRotate = (row, col, direction = 1) => {
    if (frozen) return;

    const key = `${row}-${col}`;
    const now = Date.now();

    if (now - lastRotateTime < 50) {
      rotationCountRef.current++;
    }
    setLastRotateTime(now);

    rotationTimersRef.current.push(now);
    rotationTimersRef.current = rotationTimersRef.current.filter(t => now - t < 1000);

    if (rotationTimersRef.current.length > 15) {
      handleSimulateScenario('high_frequency');
      rotationTimersRef.current = [];
    }

    setRotations(prev => ({
      ...prev,
      [key]: ((prev[key] || 0) + direction * 90 + 360) % 360
    }));
  };

  const handleValidateWord = useCallback(async () => {
    if (selectedLetters.length < 2) {
      setError('请选择至少2个字母');
      return;
    }

    const word = selectedLetters.map(l => l.letter).join('');

    if (word.length > 20) {
      handleSimulateScenario('long_word');
      return;
    }

    const validChars = /^[a-zA-Z]+$/;
    if (!validChars.test(word)) {
      handleSimulateScenario('invalid_chars');
      return;
    }

    try {
      const result = await validateWord(word, currentMode);
      setSelectedWordValid(result.isValid);
      setMoves(m => m + 1);

      if (result.isValid) {
        const targetWords = level?.words?.map(w => w.word) || [];
        if (targetWords.includes(word.toLowerCase()) && !solvedWords.includes(word.toLowerCase())) {
          setSolvedWords(prev => [...prev, word.toLowerCase()]);
        }
      }
    } catch (err) {
      setError(err.message || 'Validation failed');
    }
  }, [selectedLetters, currentMode, level, solvedWords]);

  const handleClearSelection = () => {
    setSelectedLetters([]);
    setSelectedWordValid(null);
  };

  const handleResetGame = () => {
    handleGenerateLevel(currentMode);
  };

  const handleSimulateScenario = async (scenario) => {
    setSimulationStatus(`正在模拟: ${scenario}...`);
    try {
      const result = await simulateScenario(scenario);
      setSimulationStatus(`模拟完成: ${result.message || scenario}`);

      if (scenario === 'invalid_chars') {
        setFrozen(true);
        setFrozenMessage(result.message || '输入已冻结');
      }

      if (scenario === 'loading') {
        setSimulationStatus(`词库加载完成: ${result.wordsLoaded} 个词汇，用时 ${result.loadTimeMs}ms`);
      }

      if (scenario === 'high_frequency') {
        setSimulationStatus(`状态同步延迟: ${result.delayMs}ms`);
      }

      setTimeout(() => setSimulationStatus(null), 5000);
    } catch (err) {
      setError(err.message || 'Simulation failed');
      setSimulationStatus(null);
    }
  };

  const handleUnfreeze = () => {
    setFrozen(false);
    setFrozenMessage('');
  };

  const progress = level ? (solvedWords.length / level.words.length) * 100 : 0;

  return (
    <div className="app-container">
      {loading && <LoadingOverlay text="正在生成关卡..." />}
      {error && <ErrorToast message={error} onClose={() => setError(null)} />}
      {frozen && <FrozenOverlay message={frozenMessage} onClose={handleUnfreeze} />}

      <header className="app-header">
        <h1 className="app-title">词构迷宫</h1>
        <p className="app-subtitle">Lexicon Labyrinth — 文字解谜游戏</p>
      </header>

      <div className="mode-selector">
        {MODES.map(mode => (
          <button
            key={mode.id}
            className={`mode-btn ${mode.id} ${currentMode === mode.id ? 'active' : ''}`}
            onClick={() => handleModeSelect(mode.id)}
          >
            <div className="mode-name">{mode.name}</div>
            <div className="mode-desc">{mode.desc}</div>
          </button>
        ))}
      </div>

      <div className="game-area">
        <div className="game-board-container">
          <div className="selected-word-display">
            {selectedLetters.length === 0 ? (
              <span className="placeholder">点击字母方块选择字母...</span>
            ) : (
              <span className={`word ${selectedWordValid === true ? 'valid' : selectedWordValid === false ? 'invalid' : ''}`}>
                {selectedLetters.map(l => l.letter).join('')}
              </span>
            )}
          </div>

          {level && (
            <GameBoard
              grid={level.grid}
              rotations={rotations}
              selectedLetters={selectedLetters}
              onLetterClick={handleLetterClick}
              onLetterRotate={handleLetterRotate}
              solvedWords={solvedWords}
              mode={currentMode}
            />
          )}

          <div className="controls-card" style={{ marginTop: '20px' }}>
            <div className="card-title">操作</div>
            <button className="control-btn" onClick={handleValidateWord}>
              验证单词
            </button>
            <button className="control-btn secondary" onClick={handleClearSelection}>
              清除选择
            </button>
          </div>

          <div className="controls-card" style={{ marginTop: '15px' }}>
            <div className="card-title">异常场景模拟</div>
            <div className="scenario-controls">
              <button className="scenario-btn" onClick={() => handleSimulateScenario('long_word')}>
                超长单词
              </button>
              <button className="scenario-btn" onClick={() => handleSimulateScenario('invalid_chars')}>
                非法字符
              </button>
              <button className="scenario-btn" onClick={() => handleSimulateScenario('high_frequency')}>
                高频旋转
              </button>
              <button className="scenario-btn" onClick={() => handleSimulateScenario('loading')}>
                词库加载
              </button>
            </div>
            {simulationStatus && (
              <div className="simulation-status">{simulationStatus}</div>
            )}
          </div>
        </div>

        <div className="side-panel">
          <div className="progress-card">
            <div className="card-title">解谜进度</div>
            <ProgressRing progress={progress} />
            <div className="ring-progress-label">
              {solvedWords.length} / {level?.words?.length || 0} 单词
            </div>
            <div style={{ textAlign: 'center', marginTop: '10px', color: '#8892b0', fontSize: '0.85rem' }}>
              操作次数: {moves}
            </div>
          </div>

          <div className="words-card">
            <div className="card-title">目标单词</div>
            {level?.words ? (
              <WordList
                words={level.words}
                solvedWords={solvedWords}
              />
            ) : (
              <div style={{ color: '#555' }}>加载中...</div>
            )}
          </div>

          {level?.dependencyGraph && (
            <div className="controls-card">
              <div className="card-title">词根关系网</div>
              <NetworkGraph graph={level.dependencyGraph} solvedWords={solvedWords} />
            </div>
          )}

          <div className="controls-card">
            <button className="control-btn secondary" onClick={handleResetGame}>
              重新生成关卡
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

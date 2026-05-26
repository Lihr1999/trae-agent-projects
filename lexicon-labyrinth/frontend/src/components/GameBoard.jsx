import { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Rect, Text, Group, Transformer, Circle } from 'react-konva';
import Konva from 'konva';
import ParticleEffect from './ParticleEffect.jsx';
import PulseWarning from './PulseWarning.jsx';

const CELL_SIZE = 60;
const CELL_GAP = 6;

export default function GameBoard({
  grid,
  rotations,
  selectedLetters,
  onLetterClick,
  onLetterRotate,
  solvedWords,
  mode
}) {
  const stageRef = useRef(null);
  const [particles, setParticles] = useState([]);
  const [pulseActive, setPulseActive] = useState(false);
  const [flippingCells, setFlippingCells] = useState({});

  const gridSize = grid?.length || 0;
  const boardWidth = gridSize * (CELL_SIZE + CELL_GAP);
  const boardHeight = gridSize * (CELL_SIZE + CELL_GAP);

  const selectedKeys = new Set(selectedLetters.map(l => `${l.row}-${l.col}`));

  const handleCellClick = useCallback((row, col, letter) => {
    if (!letter) return;

    onLetterClick(row, col, letter);
  }, [onLetterClick]);

  const handleCellContextMenu = useCallback((e, row, col, letter) => {
    if (!letter) return;
    e.evt.preventDefault();

    onLetterRotate(row, col, 1);

    const key = `${row}-${col}`;
    setFlippingCells(prev => ({ ...prev, [key]: (prev[key] || 0) + 1 }));

    setTimeout(() => {
      setFlippingCells(prev => {
        const next = { ...prev };
        if (next[key] > 1) {
          next[key] = next[key] - 1;
        } else {
          delete next[key];
        }
        return next;
      });
    }, 400);
  }, [onLetterRotate]);

  const handleTap = useCallback((row, col, letter) => {
    if (!letter) return;
    onLetterClick(row, col, letter);
  }, [onLetterClick]);

  const getCellColor = (letter, isSelected, row, col) => {
    const colors = {
      basic: ['#00d9ff', '#0099cc'],
      rare: ['#ffbe0b', '#cc9900'],
      cycle: ['#ff006e', '#cc0055'],
      massive: ['#8338ec', '#6a2ec5']
    };
    const [light, dark] = colors[mode] || colors.basic;

    if (isSelected) return light;
    return `linear-gradient(135deg, ${dark}, #1a1a2e)`;
  };

  const getParticlesForCell = (row, col) => {
    const key = `${row}-${col}`;
    return particles.filter(p => p.cellKey === key);
  };

  const renderCell = (cell, row, col) => {
    const x = col * (CELL_SIZE + CELL_GAP);
    const y = row * (CELL_SIZE + CELL_GAP);
    const key = `${row}-${col}`;
    const isSelected = selectedKeys.has(key);
    const rotation = rotations[key] || cell.rotation || 0;
    const isFlipping = !!flippingCells[key];

    if (!cell.letter) {
      return (
        <Rect
          key={key}
          x={x}
          y={y}
          width={CELL_SIZE}
          height={CELL_SIZE}
          cornerRadius={8}
          fill="rgba(255,255,255,0.02)"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={1}
        />
      );
    }

    const colors = {
      basic: { light: '#00d9ff', dark: '#0099cc', glow: 'rgba(0,217,255,0.5)' },
      rare: { light: '#ffbe0b', dark: '#cc9900', glow: 'rgba(255,190,11,0.5)' },
      cycle: { light: '#ff006e', dark: '#cc0055', glow: 'rgba(255,0,110,0.5)' },
      massive: { light: '#8338ec', dark: '#6a2ec5', glow: 'rgba(131,56,236,0.5)' }
    };
    const c = colors[mode] || colors.basic;

    const fillColor = isSelected ? c.light : c.dark;

    return (
      <Group
        key={key}
        x={x}
        y={y}
        onClick={() => handleCellClick(row, col, cell.letter)}
        onTap={() => handleTap(row, col, cell.letter)}
        onContextMenu={(e) => handleCellContextMenu(e, row, col, cell.letter)}
        onMouseEnter={(e) => {
          const container = stageRef.current?.container();
          if (container) container.style.cursor = 'pointer';
        }}
        onMouseLeave={(e) => {
          const container = stageRef.current?.container();
          if (container) container.style.cursor = 'default';
        }}
      >
        <Rect
          width={CELL_SIZE}
          height={CELL_SIZE}
          cornerRadius={10}
          fill={fillColor}
          stroke={isSelected ? '#fff' : 'rgba(255,255,255,0.2)'}
          strokeWidth={isSelected ? 3 : 1}
          shadowColor={c.glow}
          shadowBlur={isSelected ? 20 : 0}
          shadowOffset={{ x: 0, y: 0 }}
          shadowOpacity={isSelected ? 1 : 0}
          listening={false}
        />

        <Group
          x={CELL_SIZE / 2}
          y={CELL_SIZE / 2}
          rotation={rotation}
          listening={false}
        >
          <Text
            text={cell.letter.toUpperCase()}
            fontSize={28}
            fontStyle="bold"
            fill="#fff"
            x={-12}
            y={-16}
            width={24}
            align="center"
            listening={false}
          />
        </Group>

        {isFlipping && (
          <Rect
            x={0}
            y={0}
            width={CELL_SIZE}
            height={CELL_SIZE}
            cornerRadius={10}
            fill="rgba(255,255,255,0.3)"
            listening={false}
            opacity={0.6}
          />
        )}
      </Group>
    );
  };

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      <Stage
        ref={stageRef}
        width={Math.max(boardWidth, 100)}
        height={Math.max(boardHeight, 100)}
        scaleX={1}
        scaleY={1}
      >
        <Layer>
          {grid?.map((row, rowIndex) =>
            row.map((cell, colIndex) => renderCell(cell, rowIndex, colIndex))
          )}
        </Layer>

        {particles.length > 0 && (
          <Layer>
            {particles.map((p, i) => (
              <Circle
                key={i}
                x={p.x}
                y={p.y}
                radius={p.radius}
                fill={p.color}
                opacity={p.opacity}
                listening={false}
              />
            ))}
          </Layer>
        )}

        {pulseActive && (
          <Layer>
            {selectedLetters.map((l, i) => (
              <Rect
                key={i}
                x={l.col * (CELL_SIZE + CELL_GAP)}
                y={l.row * (CELL_SIZE + CELL_GAP)}
                width={CELL_SIZE}
                height={CELL_SIZE}
                cornerRadius={10}
                stroke="#ff006e"
                strokeWidth={4}
                listening={false}
                opacity={0.8}
              />
            ))}
          </Layer>
        )}
      </Stage>

      {pulseActive && <PulseWarning active={pulseActive} />}
      <div style={{
        marginTop: '10px',
        fontSize: '0.8rem',
        color: '#8892b0',
        textAlign: 'center'
      }}>
        点击选择/取消字母 | 右键旋转方块
      </div>
    </div>
  );
}

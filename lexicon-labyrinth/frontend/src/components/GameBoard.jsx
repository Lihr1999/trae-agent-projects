import { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Rect, Text, Group } from 'react-konva';

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
  const containerRef = useRef(null);
  const [flippingCells, setFlippingCells] = useState({});

  const gridSize = grid?.length || 0;
  const boardWidth = gridSize * (CELL_SIZE + CELL_GAP);
  const boardHeight = gridSize * (CELL_SIZE + CELL_GAP);

  const selectedKeys = new Set(selectedLetters.map(l => `${l.row}-${l.col}`));

  useEffect(() => {
    const preventContextMenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };
    const container = containerRef.current;
    if (container) {
      container.addEventListener('contextmenu', preventContextMenu, { capture: true });
    }
    document.addEventListener('contextmenu', preventContextMenu, { capture: true });
    return () => {
      if (container) {
        container.removeEventListener('contextmenu', preventContextMenu, { capture: true });
      }
      document.removeEventListener('contextmenu', preventContextMenu, { capture: true });
    };
  }, []);

  const handleCellClick = useCallback((row, col, letter) => {
    if (!letter) return;
    onLetterClick(row, col, letter);
  }, [onLetterClick]);

  const handleCellContextMenu = useCallback((e, row, col, letter) => {
    if (!letter) return;

    if (e.evt) {
      e.evt.preventDefault();
      e.evt.stopPropagation();
    }
    e.cancelBubble = true;

    const key = `${row}-${col}`;

    onLetterRotate(row, col, 1);

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
          listening={false}
        />
      );
    }

    const colors = {
      basic: { light: '#00d9ff', dark: '#0077aa', glow: 'rgba(0,217,255,0.8)' },
      rare: { light: '#ffbe0b', dark: '#b38600', glow: 'rgba(255,190,11,0.8)' },
      cycle: { light: '#ff006e', dark: '#b3004d', glow: 'rgba(255,0,110,0.8)' },
      massive: { light: '#8338ec', dark: '#5a24a3', glow: 'rgba(131,56,236,0.8)' }
    };
    const c = colors[mode] || colors.basic;

    const fillColor = isSelected ? c.light : c.dark;
    const strokeColor = isSelected ? '#ffffff' : 'rgba(255,255,255,0.3)';
    const strokeWidth = isSelected ? 4 : 1.5;
    const shadowBlur = isSelected ? 25 : 0;

    return (
      <Group
        key={key}
        x={x}
        y={y}
      >
        <Rect
          width={CELL_SIZE}
          height={CELL_SIZE}
          cornerRadius={10}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          shadowColor={c.glow}
          shadowBlur={shadowBlur}
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
            fontSize={30}
            fontStyle="bold"
            fill="#ffffff"
            x={-15}
            y={-20}
            width={30}
            align="center"
            listening={false}
            shadowColor="rgba(0,0,0,0.5)"
            shadowBlur={2}
            shadowOffset={{ x: 1, y: 1 }}
          />
        </Group>

        {isSelected && (
          <Rect
            x={4}
            y={4}
            width={CELL_SIZE - 8}
            height={CELL_SIZE - 8}
            cornerRadius={8}
            stroke="#ffffff"
            strokeWidth={3}
            listening={false}
            opacity={0.8}
            dash={[6, 4]}
          />
        )}

        {isFlipping && (
          <Rect
            width={CELL_SIZE}
            height={CELL_SIZE}
            cornerRadius={10}
            fill="rgba(255,255,255,0.5)"
            listening={false}
            opacity={0.7}
          />
        )}

        <Rect
          name="hitbox"
          width={CELL_SIZE}
          height={CELL_SIZE}
          cornerRadius={10}
          fill="rgba(0,0,0,0.001)"
          onClick={() => handleCellClick(row, col, cell.letter)}
          onTap={() => handleCellClick(row, col, cell.letter)}
          onContextMenu={(e) => handleCellContextMenu(e, row, col, cell.letter)}
          onMouseEnter={() => {
            const container = stageRef.current?.container();
            if (container) container.style.cursor = 'pointer';
          }}
          onMouseLeave={() => {
            const container = stageRef.current?.container();
            if (container) container.style.cursor = 'default';
          }}
        />
      </Group>
    );
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', overflow: 'hidden' }}>
      <Stage
        ref={stageRef}
        width={Math.max(boardWidth, 100)}
        height={Math.max(boardHeight, 100)}
        style={{ display: 'block' }}
      >
        <Layer>
          {grid?.map((row, rowIndex) =>
            row.map((cell, colIndex) => renderCell(cell, rowIndex, colIndex))
          )}
        </Layer>
      </Stage>

      <div style={{
        marginTop: '12px',
        fontSize: '0.78rem',
        color: '#8892b0',
        textAlign: 'center',
        letterSpacing: '0.5px'
      }}>
        <span style={{ color: '#00d9ff' }}>●</span> 左键点击选择字母
        <span style={{ margin: '0 10px', color: '#444' }}>|</span>
        <span style={{ color: '#ffbe0b' }}>●</span> 右键旋转方块
      </div>
    </div>
  );
}

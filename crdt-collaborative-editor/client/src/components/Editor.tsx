import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CursorPosition } from '../types';
import '../styles/Editor.css';

interface EditorProps {
  text: string;
  onChange: (text: string) => void;
  cursorPositions: CursorPosition[];
  siteId: string;
  activeAnomaly: string | null;
}

const userColors: { [key: string]: string } = {
  'user-A': '#3b82f6',
  'user-B': '#10b981',
  'user-delayed': '#f59e0b',
  'user-main': '#8b5cf6',
  'user-online': '#ec4899',
  'user-offline': '#06b6d4',
};

function Editor({ text, onChange, cursorPositions, siteId, activeAnomaly }: EditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [insertedChars, setInsertedChars] = useState<{ char: string; index: number; id: number }[]>([]);
  const lastTextLength = useRef(0);

  useEffect(() => {
    if (text.length > lastTextLength.current) {
      const newChar = text[text.length - 1];
      const newIndex = text.length - 1;
      setInsertedChars((prev) => [...prev, { char: newChar, index: newIndex, id: Date.now() }]);
      setTimeout(() => {
        setInsertedChars((prev) => prev.slice(1));
      }, 500);
    }
    lastTextLength.current = text.length;
  }, [text]);

  useEffect(() => {
    if (activeAnomaly === 'out-of-order-jitter') {
      setIsShaking(true);
      const interval = setInterval(() => {
        setIsShaking((prev) => !prev);
      }, 300);
      return () => clearInterval(interval);
    } else {
      setIsShaking(false);
    }
  }, [activeAnomaly]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange],
  );

  const getCursorColor = (userId: string): string => {
    if (userColors[userId]) return userColors[userId];
    const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const otherCursors = cursorPositions.filter((c) => c.siteId !== siteId);

  return (
    <div className={`editor-container ${isShaking ? 'shaking' : ''}`}>
      <div className="editor-header">
        <h3>📝 协同编辑器</h3>
        {activeAnomaly && (
          <span className={`anomaly-badge ${activeAnomaly}`}>
            {activeAnomaly === 'tombstone-bloat' && '⚠️ 墓碑膨胀中'}
            {activeAnomaly === 'out-of-order-jitter' && '🔀 乱序抖动中'}
            {activeAnomaly === 'intention-violation' && '❌ 意图违逆'}
            {activeAnomaly === 'offline-reconnect' && '📡 离线重连'}
          </span>
        )}
      </div>

      <div className="editor-wrapper">
        <AnimatePresence>
          {insertedChars.map((item) => (
            <motion.span
              key={item.id}
              className="insert-animation"
              initial={{ opacity: 0, scale: 0, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                position: 'absolute',
                left: `${(item.index % 50) * 12 + 20}px`,
                top: `${Math.floor(item.index / 50) * 24 + 60}px`,
                color: '#10b981',
                fontWeight: 'bold',
                pointerEvents: 'none',
              }}
            >
              {item.char}
            </motion.span>
          ))}
        </AnimatePresence>

        <textarea
          ref={textareaRef}
          className="editor-textarea"
          value={text}
          onChange={handleChange}
          placeholder="开始输入..."
          spellCheck={false}
        />

        {otherCursors.map((cursor) => (
          <motion.div
            key={cursor.siteId}
            className="remote-cursor"
            initial={{ opacity: 0, y: -10 }}
            animate={{
              opacity: 1,
              y: 0,
              left: `${(cursor.position % 50) * 12 + 16}px`,
              top: `${Math.floor(cursor.position / 50) * 24 + 56}px`,
            }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          >
            <div
              className="cursor-line"
              style={{ backgroundColor: getCursorColor(cursor.siteId) }}
            />
            <div
              className="cursor-label"
              style={{ backgroundColor: getCursorColor(cursor.siteId) }}
            >
              {cursor.siteId.slice(0, 8)}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="editor-footer">
        <span>字符数: {text.length}</span>
        <span>在线用户: {cursorPositions.length + 1}</span>
      </div>
    </div>
  );
}

export default Editor;

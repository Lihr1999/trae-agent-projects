import { useState, useEffect, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { connectSocket, disconnectSocket, siteId } from './utils/socket';
import {
  CRDTOperation,
  InsertOperation,
  DeleteOperation,
  InitialState,
  Branch,
  CursorPosition,
  VersionVector,
  PresetInfo,
} from './types';
import Editor from './components/Editor';
import PresetButtons from './components/PresetButtons';
import StatsPanel from './components/StatsPanel';
import BranchTimeline from './components/BranchTimeline';
import SyncProgress from './components/SyncProgress';
import './styles/App.css';

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [text, setText] = useState('');
  const [nodes, setNodes] = useState<any[]>([]);
  const [versionVector, setVersionVector] = useState<VersionVector>({});
  const [tombstoneCount, setTombstoneCount] = useState(0);
  const [totalNodeCount, setTotalNodeCount] = useState(0);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [connectedClients, setConnectedClients] = useState<string[]>([]);
  const [cursorPositions, setCursorPositions] = useState<CursorPosition[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [activeAnomaly, setActiveAnomaly] = useState<string | null>(null);
  const [presets, setPresets] = useState<PresetInfo[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [showMergeAnimation, setShowMergeAnimation] = useState(false);

  const lastOperationRef = useRef<number>(0);
  const isComposingRef = useRef<boolean>(false);
  const localClockRef = useRef<number>(0);

  const generateId = useCallback(() => {
    localClockRef.current = Math.max(localClockRef.current, Date.now());
    return localClockRef.current;
  }, []);

  useEffect(() => {
    const newSocket = connectSocket();
    setSocket(newSocket);

    newSocket.on('connect', () => setIsConnected(true));
    newSocket.on('disconnect', () => setIsConnected(false));

    newSocket.on('initial-state', (state: InitialState) => {
      setText(state.text);
      setNodes(state.nodes);
      setVersionVector(state.versionVector);
      setTombstoneCount(state.tombstoneCount);
      setTotalNodeCount(state.totalNodeCount);
      setBranches(state.branches);
      setConnectedClients(state.connectedClients);
      setCursorPositions(state.cursorPositions);
    });

    newSocket.on('operation', (data: { operation: CRDTOperation; text: string; tombstoneCount: number; totalNodeCount: number }) => {
      setText(data.text);
      setTombstoneCount(data.tombstoneCount);
      setTotalNodeCount(data.totalNodeCount);

      if (data.operation.type === 'insert') {
        const insertOp = data.operation as InsertOperation;
        setNodes((prev) => {
          const newNodes = [...prev];
          const insertIndex = insertOp.afterId
            ? newNodes.findIndex(
                (n) =>
                  n.id.siteId === insertOp.afterId!.siteId &&
                  n.id.clock === insertOp.afterId!.clock,
              ) + 1
            : 0;
          if (insertIndex >= 0 && insertIndex <= newNodes.length) {
            newNodes.splice(insertIndex, 0, {
              id: insertOp.id,
              value: insertOp.value,
              tombstone: false,
              nextId: null,
            });
          }
          return newNodes;
        });
      } else if (data.operation.type === 'delete') {
        const deleteOp = data.operation as DeleteOperation;
        setNodes((prev) =>
          prev.map((n) =>
            n.id.siteId === deleteOp.targetId.siteId &&
            n.id.clock === deleteOp.targetId.clock
              ? { ...n, tombstone: true }
              : n,
          ),
        );
      }

      if (data.operation.versionVector) {
        setVersionVector(data.operation.versionVector);
      }
    });

    newSocket.on('operation-ack', (data: { operationId: { siteId: string; clock: number }; versionVector: VersionVector }) => {
      if (data.versionVector) {
        setVersionVector(data.versionVector);
      }
    });

    newSocket.on('cursor-update', (cursor: CursorPosition) => {
      setCursorPositions((prev) => {
        const filtered = prev.filter((c) => c.siteId !== cursor.siteId);
        return [...filtered, cursor];
      });
    });

    newSocket.on('clients-update', (clients: string[]) => {
      setConnectedClients(clients);
    });

    newSocket.on('branch-created', (branch: Branch) => {
      setBranches((prev) => [...prev, branch]);
    });

    newSocket.on('branch-merged', (data: { branchId: string; mergedAt: number }) => {
      setShowMergeAnimation(true);
      setTimeout(() => setShowMergeAnimation(false), 2000);
      setBranches((prev) =>
        prev.map((b) =>
          b.id === data.branchId ? { ...b, mergedAt: data.mergedAt } : b,
        ),
      );
    });

    newSocket.on('document-reset', (state: InitialState) => {
      setText(state.text);
      setNodes(state.nodes);
      setVersionVector(state.versionVector);
      setTombstoneCount(state.tombstoneCount);
      setTotalNodeCount(state.totalNodeCount);
      setActiveAnomaly(null);
      localClockRef.current = 0;
    });

    newSocket.on('bulk-operations-complete', (data: { versionVector: VersionVector; text: string; tombstoneCount: number; totalNodeCount: number; nodes: any[] }) => {
      setIsSyncing(false);
      setSyncProgress(100);
      if (data) {
        setText(data.text || text);
        setTombstoneCount(data.tombstoneCount || tombstoneCount);
        setTotalNodeCount(data.totalNodeCount || totalNodeCount);
        if (data.nodes) setNodes(data.nodes);
        if (data.versionVector) setVersionVector(data.versionVector);
      }
      setTimeout(() => setSyncProgress(0), 1000);
    });

    fetch('http://localhost:3001/presets')
      .then((res) => res.json())
      .then((data) => setPresets(data))
      .catch(console.error);

    return () => {
      disconnectSocket();
    };
  }, []);

  const handlePresetLoad = useCallback(
    async (presetId: string) => {
      if (!socket) return;

      setIsSyncing(true);
      setSyncProgress(0);

      try {
        const response = await fetch(`http://localhost:3001/presets/${presetId}/operations`);
        const data = await response.json();

        if (data.operations) {
          const preset = presets.find((p) => p.id === presetId);
          setActiveAnomaly(preset?.anomalyType || null);

          socket.emit('reset-document');

          setTimeout(() => {
            socket.emit('bulk-operations', {
              operations: data.operations,
              delay: 30,
            });

            let progress = 0;
            const interval = setInterval(() => {
              progress += 5;
              if (progress >= 95) {
                clearInterval(interval);
              }
              setSyncProgress(progress);
            }, 50);
          }, 500);
        }
      } catch (error) {
        console.error('Failed to load preset:', error);
        setIsSyncing(false);
      }
    },
    [socket, presets],
  );

  const handleTextChange = useCallback(
    (newText: string) => {
      if (!socket || isComposingRef.current) return;

      const now = Date.now();
      if (now - lastOperationRef.current < 30) return;
      lastOperationRef.current = now;

      if (newText.length > text.length) {
        const insertedChars = newText.slice(text.length);
        const startPosition = text.length;

        for (let i = 0; i < insertedChars.length; i++) {
          const char = insertedChars[i];
          const position = startPosition + i;
          const clock = generateId();

          let afterId = null;
          if (position > 0 && nodes.length > 0) {
            const visibleNodes = nodes.filter((n) => !n.tombstone);
            if (visibleNodes[position - 1]) {
              afterId = visibleNodes[position - 1].id;
            } else if (visibleNodes.length > 0) {
              afterId = visibleNodes[visibleNodes.length - 1].id;
            }
          }

          const newVersionVector = { ...versionVector };
          if (!newVersionVector[siteId]) {
            newVersionVector[siteId] = 0;
          }
          newVersionVector[siteId]++;

          socket.emit('operation', {
            operation: {
              type: 'insert',
              id: { siteId, clock },
              value: char,
              afterId,
              versionVector: newVersionVector,
              siteId,
              timestamp: now,
            },
          });
        }
      } else if (newText.length < text.length) {
        const deletedCount = text.length - newText.length;
        const startPosition = newText.length;

        const visibleNodes = nodes.filter((n) => !n.tombstone);

        for (let i = 0; i < deletedCount; i++) {
          const nodeToDelete = visibleNodes[startPosition + deletedCount - 1 - i];
          if (nodeToDelete) {
            const newVersionVector = { ...versionVector };
            if (!newVersionVector[siteId]) {
              newVersionVector[siteId] = 0;
            }
            newVersionVector[siteId]++;

            socket.emit('operation', {
              operation: {
                type: 'delete',
                targetId: nodeToDelete.id,
                versionVector: newVersionVector,
                siteId,
                timestamp: now,
              },
            });
          }
        }
      }

      setText(newText);
    },
    [socket, text, nodes, versionVector, generateId],
  );

  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true;
  }, []);

  const handleCompositionEnd = useCallback(
    (composedText: string) => {
      isComposingRef.current = false;
      if (composedText && composedText !== text) {
        handleTextChange(composedText);
      }
    },
    [text, handleTextChange],
  );

  const handleReset = useCallback(() => {
    if (socket) {
      socket.emit('reset-document');
      setText('');
      setNodes([]);
      setVersionVector({});
      setTombstoneCount(0);
      setTotalNodeCount(0);
      localClockRef.current = 0;
    }
  }, [socket]);

  const handleCreateBranch = useCallback(() => {
    if (socket) {
      const name = `分支-${Date.now().toString().slice(-4)}`;
      socket.emit('create-branch', { name, parentBranchId: 'main-branch' });
    }
  }, [socket]);

  const onlineUsers = cursorPositions.length + 1;

  return (
    <div className="app-container">
      <motion.header
        className="app-header"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h1>CRDT 协同编辑与版本时间线系统</h1>
        <div className="connection-status">
          <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`} />
          <span>{isConnected ? '已连接' : '已断开'}</span>
          <span className="site-id">用户: {siteId}</span>
        </div>
      </motion.header>

      <PresetButtons presets={presets} onLoadPreset={handlePresetLoad} onReset={handleReset} />

      <div className="main-content">
        <div className="editor-section">
          <AnimatePresence>
            {showMergeAnimation && (
              <motion.div
                className="merge-animation-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className="merge-animation-content"
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  transition={{ duration: 0.5 }}
                >
                  <span>🔀</span>
                  <p>分支合并成功!</p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <Editor
            text={text}
            onChange={handleTextChange}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            cursorPositions={cursorPositions}
            siteId={siteId}
            activeAnomaly={activeAnomaly}
            onlineUsers={onlineUsers}
          />

          <SyncProgress isSyncing={isSyncing} progress={syncProgress} />
        </div>

        <div className="side-panel">
          <StatsPanel
            tombstoneCount={tombstoneCount}
            totalNodeCount={totalNodeCount}
            versionVector={versionVector}
            connectedClients={connectedClients}
            textLength={text.length}
            activeAnomaly={activeAnomaly}
          />

          <BranchTimeline
            branches={branches}
            onCreateBranch={handleCreateBranch}
          />
        </div>
      </div>
    </div>
  );
}

export default App;

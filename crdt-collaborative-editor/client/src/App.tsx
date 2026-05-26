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
          newNodes.splice(insertIndex, 0, {
            id: insertOp.id,
            value: insertOp.value,
            tombstone: false,
            nextId: null,
          });
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
    });

    newSocket.on('bulk-operations-complete', () => {
      setIsSyncing(false);
      setSyncProgress(100);
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
      if (!socket) return;
      const now = Date.now();
      if (now - lastOperationRef.current < 50) return;
      lastOperationRef.current = now;

      if (newText.length > text.length) {
        const insertedChar = newText[newText.length - 1];
        const position = newText.length - 1;

        let afterId = null;
        if (position > 0 && nodes.length > 0) {
          const visibleNodes = nodes.filter((n) => !n.tombstone);
          if (visibleNodes[position - 1]) {
            afterId = visibleNodes[position - 1].id;
          }
        }

        socket.emit('operation', {
          operation: {
            type: 'insert',
            id: { siteId, clock: Date.now() },
            value: insertedChar,
            afterId,
            versionVector,
            siteId,
            timestamp: Date.now(),
          },
        });
      }
    },
    [socket, text, nodes, versionVector],
  );

  const handleReset = useCallback(() => {
    if (socket) {
      socket.emit('reset-document');
    }
  }, [socket]);

  const handleCreateBranch = useCallback(() => {
    if (socket) {
      const name = `分支-${Date.now().toString().slice(-4)}`;
      socket.emit('create-branch', { name, parentBranchId: 'main-branch' });
    }
  }, [socket]);

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
            cursorPositions={cursorPositions}
            siteId={siteId}
            activeAnomaly={activeAnomaly}
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

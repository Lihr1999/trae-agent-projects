import { createSignal, createEffect, onMount, onCleanup, createMemo } from 'solid-js';
import { api } from './lib/api.js';
import Canvas3D from './components/Canvas3D.jsx';

export default function App() {
  const [graph, setGraph] = createSignal({ nodes: [], edges: [] });
  const [logs, setLogs] = createSignal([]);
  const [particleOn, setParticleOn] = createSignal(true);
  const [pulseOn, setPulseOn] = createSignal(true);
  const [flowOn, setFlowOn] = createSignal(true);
  const [selectedId, setSelectedId] = createSignal(null);
  const [mode, setMode] = createSignal('view');
  const [pendingEdge, setPendingEdge] = createSignal(null);

  const pushLog = (type, text) => {
    setLogs(prev => [...prev.slice(-80), { type, text, t: Date.now() }]);
  };

  const refresh = async () => {
    try {
      const g = await api.graph();
      setGraph(g);
    } catch (e) { pushLog('err', '刷新失败: ' + e.message); }
  };

  onMount(refresh);

  const loadPreset = async (key) => {
    try {
      const r = await api.loadPreset(key);
      pushLog('ok', `已加载预设: ${r.preset.name}`);
      await refresh();
    } catch (e) { pushLog('err', '加载预设失败: ' + e.message); }
  };

  const addNode = async (x = 0, y = 0) => {
    try {
      await api.addNode({ name: `节点-${Math.floor(Math.random() * 999)}`, x, y });
      pushLog('info', '已创建新节点');
      await refresh();
    } catch (e) { pushLog('err', '添加节点失败: ' + e.message); }
  };

  const clearGraph = async () => {
    try { await api.clear(); await refresh(); pushLog('warn', '画布已清空'); }
    catch (e) { pushLog('err', '清空失败: ' + e.message); }
  };

  const runTopo = async () => {
    try {
      const r = await api.topoSort();
      if (r.cycles && r.cycles.length) {
        pushLog('warn', `检测到 ${r.cycles.length} 个循环依赖: ` + r.cycles.map(c => c.join('→')).join(' | '));
      } else {
        pushLog('ok', `拓扑排序: ${r.sort.order.join(' → ')}`);
      }
    } catch (e) { pushLog('err', '拓扑排序失败: ' + e.message); }
  };

  const runDerive = async () => {
    try {
      const r = await api.derive();
      pushLog('info', '数据流推导完成: ' + JSON.stringify(r.results).slice(0, 200));
    } catch (e) { pushLog('err', '推导失败: ' + e.message); }
  };

  const triggerInfiniteLoop = async () => {
    try {
      const r = await api.infiniteLoop();
      pushLog('err', '⚠ 死循环风险: ' + (r.trace || []).join(' ; '));
    } catch (e) { pushLog('err', '死循环检测失败: ' + e.message); }
  };

  const triggerDirtyRead = async () => {
    try {
      const r = await api.dirtyRead();
      pushLog('warn', '并发脏读模拟完成，三次读取结果可能不一致');
    } catch (e) { pushLog('err', '脏读模拟失败: ' + e.message); }
  };

  const triggerGhost = async () => {
    const firstEdge = graph().edges[0];
    if (!firstEdge) { pushLog('warn', '没有连线可断开'); return; }
    try {
      await api.delEdge(firstEdge.id);
      const r = await api.ghost({ edgeId: firstEdge.id });
      pushLog('err', `幽灵数据流: 断开连线 ${firstEdge.source}→${firstEdge.target} 后，旧值仍在传播`);
      await refresh();
    } catch (e) { pushLog('err', '幽灵流模拟失败: ' + e.message); }
  };

  const triggerStackOverflow = async () => {
    try {
      const r = await api.derive({ simulateOverflow: true });
      pushLog('err', '深度嵌套栈溢出模拟: ' + JSON.stringify(r.results).slice(0, 200));
    } catch (e) { pushLog('err', '栈溢出模拟失败: ' + e.message); }
  };

  return (
    <div class="app">
      <div class="canvas-wrap">
        <Canvas3D
          graph={graph}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          mode={mode}
          setMode={setMode}
          pendingEdge={pendingEdge}
          setPendingEdge={setPendingEdge}
          particleOn={particleOn}
          pulseOn={pulseOn}
          flowOn={flowOn}
          addNodeAt={(x, y) => addNode(x, y)}
          refresh={refresh}
          pushLog={pushLog}
        />
      </div>

      <div class="toolbar">
        <div class="group">
          <span class="label">预设</span>
          <button class="btn preset" onClick={() => loadPreset('preset1')}>预设一</button>
          <button class="btn preset" onClick={() => loadPreset('preset2')}>预设二</button>
          <button class="btn preset" onClick={() => loadPreset('preset3')}>预设三</button>
          <button class="btn preset" onClick={() => loadPreset('preset4')}>预设四</button>
        </div>
        <div class="group">
          <span class="label">编辑</span>
          <button class="btn" onClick={() => addNode()}>+ 节点</button>
          <button class={`btn ${mode() === 'edge' ? 'primary' : ''}`} onClick={() => setMode(mode() === 'edge' ? 'view' : 'edge')}>
            {mode() === 'edge' ? '连线中(点此取消)' : '连线模式'}
          </button>
          <button class="btn danger" onClick={clearGraph}>清空</button>
        </div>
        <div class="group">
          <span class="label">分析</span>
          <button class="btn" onClick={runTopo}>拓扑排序</button>
          <button class="btn" onClick={runDerive}>数据流推导</button>
        </div>
        <div class="group">
          <span class="label">异常</span>
          <button class="btn danger" onClick={triggerInfiniteLoop}>死循环</button>
          <button class="btn danger" onClick={triggerDirtyRead}>脏读</button>
          <button class="btn danger" onClick={triggerGhost}>幽灵流</button>
          <button class="btn danger" onClick={triggerStackOverflow}>栈溢出</button>
        </div>
        <div class="group">
          <span class="label">动画</span>
          <button class={`btn ${flowOn() ? 'primary' : ''}`} onClick={() => setFlowOn(v => !v)}>连线流动</button>
          <button class={`btn ${pulseOn() ? 'primary' : ''}`} onClick={() => setPulseOn(v => !v)}>节点脉冲</button>
          <button class={`btn ${particleOn() ? 'primary' : ''}`} onClick={() => setParticleOn(v => !v)}>粒子</button>
        </div>
      </div>

      <div class="status">
        <h3>运行日志</h3>
        <div>节点: {graph().nodes.length} | 连线: {graph().edges.length}</div>
        <div class="log">
          {logs().map(l => (
            <div class={l.type}>{`[${new Date(l.t).toLocaleTimeString()}] ${l.text}`}</div>
          ))}
        </div>
      </div>

      <div class="hint">拖拽空白=平移 · 滚轮=缩放 · 点击节点=选中 · 拖拽节点=移动 · 连线模式下点击两节点建立连线</div>
    </div>
  );
}

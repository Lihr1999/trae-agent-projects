import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapScene } from './components/MapScene.js';

const PRESETS = [
  { id: 1, name: '预设一', description: '东部沿海经济带', focus: ['北京', '上海', '广东', '江苏', '浙江'] },
  { id: 2, name: '预设二', description: '长江经济带', focus: ['上海', '江苏', '浙江', '安徽', '湖北', '湖南', '重庆', '四川'] },
  { id: 3, name: '预设三', description: '京津冀协同发展', focus: ['北京', '天津', '河北'] },
  { id: 4, name: '预设四', description: '粤港澳大湾区', focus: ['广东', '香港', '澳门'] },
];

export default function App() {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const [hover, setHover] = useState(null);
  const [status, setStatus] = useState('初始化中...');
  const [flowCount, setFlowCount] = useState(0);
  const [currentLevel, setCurrentLevel] = useState('全国');

  const refreshProvinces = useCallback(async () => {
    try {
      const res = await fetch('/api/geo/province?tolerance=0.03');
      const data = await res.json();
      sceneRef.current?.loadFeatureCollection(data, {
        heightBase: 1.5,
        heightScale: 0.0003,
        onComplete: () => setStatus('数据加载完成'),
      });
    } catch (e) {
      setStatus('数据加载失败，请检查后端服务');
      console.error(e);
    }
  }, []);

  const refreshFlows = useCallback(async () => {
    try {
      const res = await fetch('/api/flows?level=province&limit=180');
      const data = await res.json();
      setFlowCount(data.flows.length);
      const geo = await fetch('/api/geo/province?tolerance=0.03').then((r) => r.json());
      const map = {};
      geo.features.forEach((f) => {
        const coords = f.geometry?.coordinates?.[0]?.[0];
        if (!coords) return;
        let sx = 0, sy = 0, n = 0;
        coords.forEach((p) => { sx += p[0]; sy += p[1]; n++; });
        map[f.properties.id] = { center: [sx / n, sy / n] };
      });
      sceneRef.current?.loadFlows(data.flows, map);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (!mountRef.current) return;
    const scene = new MapScene(mountRef.current, {
      onPick: (r) => setHover(r),
      onDrill: async (r) => {
        if (r.level === 'province') {
          setCurrentLevel(r.name);
          try {
            const res = await fetch(`/api/geo/city?parentId=${r.id}&tolerance=0.02`);
            const data = await res.json();
            if (data.features.length) {
              scene.loadFeatureCollection(data, { heightBase: 0.8, heightScale: 0.0002 });
              scene.drillTo(r.center || [104, 35], 'city', r.id);
            }
          } catch (e) {
            console.error('Drill down failed', e);
          }
        }
      },
    });
    sceneRef.current = scene;
    setStatus('正在加载数据...');
    refreshProvinces();
    setTimeout(refreshFlows, 400);
    return () => scene.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePreset = (preset) => {
    sceneRef.current?.applyPreset(preset);
    setStatus(`已加载 ${preset.name}：${preset.description}`);
  };

  const handleBack = () => {
    sceneRef.current?.resetToCountry();
    setCurrentLevel('全国');
    refreshProvinces();
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      <div style={styles.topBar}>
        <div style={styles.title}>区域经济关联与多级下钻 3D 拓扑系统</div>
        <div style={styles.subTitle}>Regional Economic Correlation · Multi-level Drill-down 3D Topology</div>
      </div>

      <div style={styles.presetBar}>
        {PRESETS.map((p) => (
          <button key={p.id} onClick={() => handlePreset(p)} style={styles.presetBtn}>
            {p.name}
            <span style={styles.presetSub}>{p.description}</span>
          </button>
        ))}
      </div>

      <div style={styles.sidePanel}>
        <div style={styles.panelTitle}>系统状态</div>
        <div style={styles.panelRow}><span>层级</span><strong>{currentLevel}</strong></div>
        <div style={styles.panelRow}><span>飞线数</span><strong>{flowCount}</strong></div>
        <div style={styles.panelRow}><span>状态</span><strong style={{ color: '#66ffaa' }}>{status}</strong></div>
        <button onClick={handleBack} style={styles.backBtn}>返回全国视图</button>
      </div>

      {hover && (
        <div style={styles.hoverCard}>
          <div style={styles.hoverName}>{hover.name}</div>
          <div style={styles.hoverRow}>层级: {hover.level}</div>
          {hover.gdp != null && <div style={styles.hoverRow}>GDP: {hover.gdp.toFixed(0)} 亿元</div>}
          {hover.population != null && <div style={styles.hoverRow}>人口: {hover.population.toFixed(0)} 万人</div>}
        </div>
      )}

      <div style={styles.legend}>
        <div style={{ fontSize: 12, opacity: 0.8 }}>鼠标悬停查看详情 · 点击省份下钻至市级</div>
      </div>
    </div>
  );
}

const styles = {
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    padding: '16px 24px',
    background: 'linear-gradient(180deg, rgba(5,9,18,0.85) 0%, rgba(5,9,18,0) 100%)',
    pointerEvents: 'none',
    zIndex: 10,
  },
  title: { fontSize: 20, fontWeight: 600, letterSpacing: 2, color: '#a9d0ff' },
  subTitle: { fontSize: 11, opacity: 0.6, marginTop: 4, letterSpacing: 1 },
  presetBar: {
    position: 'absolute', top: 72, right: 16,
    display: 'flex', flexDirection: 'column', gap: 8, zIndex: 10,
  },
  presetBtn: {
    padding: '10px 16px',
    background: 'rgba(14,36,68,0.75)',
    border: '1px solid rgba(102,200,255,0.35)',
    color: '#d0e8ff',
    borderRadius: 4,
    cursor: 'pointer',
    backdropFilter: 'blur(6px)',
    textAlign: 'left',
    display: 'flex', flexDirection: 'column',
    transition: 'all 0.2s',
    minWidth: 160,
  },
  presetSub: { fontSize: 11, opacity: 0.7, marginTop: 2 },
  sidePanel: {
    position: 'absolute', left: 16, top: 100,
    background: 'rgba(8,18,34,0.82)',
    border: '1px solid rgba(102,200,255,0.25)',
    borderRadius: 4, padding: 14, minWidth: 200, zIndex: 10,
    backdropFilter: 'blur(6px)',
  },
  panelTitle: { fontSize: 13, fontWeight: 600, color: '#89c4ff', marginBottom: 10, borderBottom: '1px solid rgba(102,200,255,0.2)', paddingBottom: 6 },
  panelRow: { display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', color: '#9fb6d1' },
  backBtn: {
    marginTop: 10, width: '100%', padding: '8px 10px',
    background: 'rgba(102,200,255,0.15)',
    border: '1px solid rgba(102,200,255,0.4)',
    color: '#cfe8ff', borderRadius: 3, cursor: 'pointer', fontSize: 12,
  },
  hoverCard: {
    position: 'absolute', bottom: 40, right: 16,
    background: 'rgba(8,18,34,0.9)',
    border: '1px solid rgba(102,200,255,0.4)',
    borderRadius: 4, padding: 12, minWidth: 160, zIndex: 10,
    backdropFilter: 'blur(6px)',
  },
  hoverName: { fontSize: 15, fontWeight: 600, color: '#ffdf7a', marginBottom: 6 },
  hoverRow: { fontSize: 12, color: '#c0d5ef', padding: '2px 0' },
  legend: {
    position: 'absolute', bottom: 16, left: 16,
    color: '#9fb6d1', zIndex: 10,
  },
};

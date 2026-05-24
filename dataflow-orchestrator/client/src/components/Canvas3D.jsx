import { onMount, onCleanup, createSignal, createEffect } from 'solid-js';
import { api } from '../lib/api.js';

export default function Canvas3D(props) {
  let canvasEl;
  let ctx;
  const [size, setSize] = createSignal({ w: 0, h: 0 });
  const view = { x: 0, y: 0, scale: 1 };
  let dragging = null;
  let panning = null;
  let lastT = performance.now();
  const particles = [];
  const ripples = [];
  const pulses = new Map();
  const topoAnim = { active: false, order: [], idx: 0, t: 0 };
  let raf = 0;
  let hovered = null;
  const localGraph = { nodes: [], edges: [] };

  const toWorld = (cx, cy) => ({
    x: (cx - size().w / 2) / view.scale + view.x,
    y: (cy - size().h / 2) / view.scale + view.y
  });

  const worldToScreen = (x, y) => ({
    x: (x - view.x) * view.scale + size().w / 2,
    y: (y - view.y) * view.scale + size().h / 2
  });

  const currentGraph = () => ({
    nodes: localGraph.nodes.length ? localGraph.nodes : props.graph().nodes,
    edges: props.graph().edges
  });

  const nodeAt = (wx, wy) => {
    const nodes = currentGraph().nodes;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      if (Math.abs(n.x - wx) < 60 && Math.abs(n.y - wy) < 30) return n;
    }
    return null;
  };

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    const w = canvasEl.clientWidth;
    const h = canvasEl.clientHeight;
    canvasEl.width = w * dpr;
    canvasEl.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    setSize({ w, h });
  };

  const drawGrid = () => {
    const { w, h } = size();
    ctx.save();
    ctx.fillStyle = '#070a14';
    ctx.fillRect(0, 0, w, h);
    const step = 50 * view.scale;
    const offX = ((-view.x * view.scale) % step + step) % step;
    const offY = ((-view.y * view.scale) % step + step) % step;
    ctx.strokeStyle = 'rgba(110, 140, 220, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = offX; x < w; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
    for (let y = offY; y < h; y += step) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
    ctx.stroke();
    const center = worldToScreen(0, 0);
    ctx.strokeStyle = 'rgba(120, 160, 255, 0.35)';
    ctx.beginPath();
    ctx.moveTo(center.x - 20, center.y); ctx.lineTo(center.x + 20, center.y);
    ctx.moveTo(center.x, center.y - 20); ctx.lineTo(center.x, center.y + 20);
    ctx.stroke();
    ctx.restore();
  };

  const drawEdges = (nodes, edges, t) => {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    for (const e of edges) {
      const s = nodeMap.get(e.source);
      const tg = nodeMap.get(e.target);
      if (!s || !tg) continue;
      const a = worldToScreen(s.x, s.y);
      const b = worldToScreen(tg.x, tg.y);
      const cx = (a.x + b.x) / 2;
      const cy = (a.y + b.y) / 2;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      const nx = len ? -dy / len : 0;
      const ny = len ? dx / len : 0;
      const curve = 30;
      const c1x = cx + nx * curve;
      const c1y = cy + ny * curve;
      const isGhost = e.__ghost;
      const gradient = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      if (isGhost) {
        gradient.addColorStop(0, 'rgba(255, 120, 120, 0.8)');
        gradient.addColorStop(1, 'rgba(255, 80, 80, 0.2)');
      } else {
        gradient.addColorStop(0, 'rgba(109, 155, 255, 0.9)');
        gradient.addColorStop(1, 'rgba(163, 123, 255, 0.9)');
      }
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(c1x, c1y, b.x, b.y);
      ctx.stroke();

      if (props.flowOn()) {
        const phase = (t * 0.002) % 1;
        const dashLen = 18;
        ctx.save();
        ctx.setLineDash([dashLen, dashLen]);
        ctx.lineDashOffset = -phase * dashLen * 2;
        ctx.strokeStyle = isGhost ? 'rgba(255, 180, 180, 0.6)' : 'rgba(180, 210, 255, 0.55)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(c1x, c1y, b.x, b.y);
        ctx.stroke();
        ctx.restore();
      }

      const arrowLen = 10;
      const ex = b.x;
      const ey = b.y;
      const tangentX = b.x - c1x;
      const tangentY = b.y - c1y;
      const tlen = Math.hypot(tangentX, tangentY) || 1;
      const tux = tangentX / tlen;
      const tuy = tangentY / tlen;
      const px = -tuy;
      const py = tux;
      ctx.fillStyle = isGhost ? '#ff8080' : '#9ab8ff';
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - tux * arrowLen + px * arrowLen * 0.4, ey - tuy * arrowLen + py * arrowLen * 0.4);
      ctx.lineTo(ex - tux * arrowLen - px * arrowLen * 0.4, ey - tuy * arrowLen - py * arrowLen * 0.4);
      ctx.closePath();
      ctx.fill();
    }
  };

  const drawNodes = (nodes, edges, t) => {
    for (const n of nodes) {
      const p = worldToScreen(n.x, n.y);
      const w = 110, h = 52;
      const isSel = props.selectedId() === n.id;
      const isHover = hovered && hovered.id === n.id;
      let fillA = '#1a2348', fillB = '#0e1430';
      if (n.kind === 'source') { fillA = '#1e4a2a'; fillB = '#0e2818'; }
      else if (n.kind === 'sink') { fillA = '#4a2a1e'; fillB = '#28140e'; }
      const pulseT = pulses.get(n.id);
      let glow = 0;
      if (pulseT && props.pulseOn()) {
        const age = (t - pulseT) / 900;
        if (age < 1) glow = (1 - age) * 22;
      }
      if (topoAnim.active) {
        const visited = topoAnim.order.slice(0, topoAnim.idx + 1);
        if (visited.includes(n.id)) glow = Math.max(glow, 18);
      }
      ctx.save();
      if (glow > 0) {
        ctx.shadowColor = 'rgba(120, 180, 255, 0.8)';
        ctx.shadowBlur = glow;
      }
      const grad = ctx.createLinearGradient(p.x, p.y - h / 2, p.x, p.y + h / 2);
      grad.addColorStop(0, fillA);
      grad.addColorStop(1, fillB);
      ctx.fillStyle = grad;
      roundRect(ctx, p.x - w / 2, p.y - h / 2, w, h, 10);
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = isSel ? '#ffd37b' : isHover ? '#a3c1ff' : 'rgba(120, 150, 255, 0.45)';
      ctx.lineWidth = isSel ? 2 : 1;
      roundRect(ctx, p.x - w / 2, p.y - h / 2, w, h, 10);
      ctx.stroke();

      ctx.fillStyle = '#d5e1ff';
      ctx.font = 'bold 13px "Segoe UI", "PingFang SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(n.name, p.x, p.y - 6);
      ctx.fillStyle = 'rgba(180, 200, 240, 0.6)';
      ctx.font = '10px Consolas, monospace';
      ctx.fillText(`${n.kind} · ${n.op}`, p.x, p.y + 12);

      for (const ip of n.inputs) {
        const pt = worldToScreen(n.x - w / 2, n.y);
        ctx.fillStyle = '#6d9bff';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const op of n.outputs) {
        const pt = worldToScreen(n.x + w / 2, n.y);
        ctx.fillStyle = '#a37bff';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      if (props.pulseOn()) {
        const radius = 30 + (Math.sin(t * 0.004 + (n.x + n.y) * 0.01) + 1) * 6;
        ctx.strokeStyle = 'rgba(120, 180, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  };

  const drawParticles = (nodes, edges, dt) => {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    if (props.particleOn() && Math.random() < 0.35 && edges.length > 0) {
      const e = edges[Math.floor(Math.random() * edges.length)];
      if (e && nodeMap.has(e.source) && nodeMap.has(e.target)) {
        particles.push({ edge: e.id, t: 0, life: 1 + Math.random() * 0.6 });
      }
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.t += dt / 1000 / p.life;
      if (p.t >= 1) { particles.splice(i, 1); continue; }
      const e = edges.find(x => x.id === p.edge);
      if (!e) { particles.splice(i, 1); continue; }
      const s = nodeMap.get(e.source), tg = nodeMap.get(e.target);
      if (!s || !tg) continue;
      const a = worldToScreen(s.x, s.y);
      const b = worldToScreen(tg.x, tg.y);
      const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      const nx = len ? -dy / len : 0, ny = len ? dx / len : 0;
      const curve = 30;
      const c1x = cx + nx * curve, c1y = cy + ny * curve;
      const tt = p.t;
      const x = (1 - tt) * (1 - tt) * a.x + 2 * (1 - tt) * tt * c1x + tt * tt * b.x;
      const y = (1 - tt) * (1 - tt) * a.y + 2 * (1 - tt) * tt * c1y + tt * tt * b.y;
      ctx.save();
      const g = ctx.createRadialGradient(x, y, 0, x, y, 10);
      g.addColorStop(0, 'rgba(180, 220, 255, 1)');
      g.addColorStop(0.4, 'rgba(120, 180, 255, 0.5)');
      g.addColorStop(1, 'rgba(120, 180, 255, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };

  const drawRipples = (t) => {
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      const age = (t - r.t) / r.duration;
      if (age >= 1) { ripples.splice(i, 1); continue; }
      const p = worldToScreen(r.x, r.y);
      const radius = age * r.maxRadius;
      const alpha = (1 - age) * 0.6;
      ctx.save();
      ctx.strokeStyle = r.color.replace('ALPHA', alpha.toFixed(3));
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  };

  const drawTopoHighlight = (t) => {
    if (!topoAnim.active) return;
    const nodeMap = new Map(props.graph().nodes.map(n => [n.id, n]));
    const visited = topoAnim.order.slice(0, topoAnim.idx + 1);
    for (const id of visited) {
      const n = nodeMap.get(id);
      if (!n) continue;
      const p = worldToScreen(n.x, n.y);
      ctx.save();
      ctx.shadowColor = '#ffd37b';
      ctx.shadowBlur = 24;
      ctx.strokeStyle = 'rgba(255, 211, 123, 0.9)';
      ctx.lineWidth = 2;
      roundRect(ctx, p.x - 58, p.y - 28, 116, 56, 12);
      ctx.stroke();
      ctx.restore();
    }
    const prevId = topoAnim.order[topoAnim.idx];
    const nextId = topoAnim.order[topoAnim.idx + 1];
    if (prevId && nextId) {
      const a = nodeMap.get(prevId), b = nodeMap.get(nextId);
      if (a && b) {
        const pa = worldToScreen(a.x, a.y), pb = worldToScreen(b.x, b.y);
        const phase = (t * 0.005) % 1;
        const x = pa.x + (pb.x - pa.x) * phase;
        const y = pa.y + (pb.y - pa.y) * phase;
        ctx.save();
        ctx.fillStyle = 'rgba(255, 211, 123, 0.9)';
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  };

  const loop = (now) => {
    const dt = now - lastT;
    lastT = now;
    ctx.clearRect(0, 0, size().w, size().h);
    drawGrid();
    const g = currentGraph();
    drawParticles(g.nodes, g.edges, dt);
    drawRipples(now);
    drawEdges(g.nodes, g.edges, now);
    drawNodes(g.nodes, g.edges, now);
    drawTopoHighlight(now);
    if (topoAnim.active) {
      topoAnim.t += dt;
      if (topoAnim.t > 600) {
        topoAnim.t = 0;
        topoAnim.idx++;
        if (topoAnim.idx >= topoAnim.order.length) {
          topoAnim.active = false;
          if (props.pushLog) props.pushLog('ok', '拓扑排序遍历动画完成');
        }
      }
    }
    raf = requestAnimationFrame(loop);
  };

  onMount(() => {
    canvasEl = document.getElementById('graph-canvas');
    ctx = canvasEl.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    raf = requestAnimationFrame(loop);

    const onWheel = (e) => {
      e.preventDefault();
      const rect = canvasEl.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const before = toWorld(cx, cy);
      const delta = -e.deltaY * 0.001;
      view.scale = Math.max(0.2, Math.min(3, view.scale * (1 + delta)));
      const after = toWorld(cx, cy);
      view.x += before.x - after.x;
      view.y += before.y - after.y;
    };

    const onMouseDown = (e) => {
      const rect = canvasEl.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const w = toWorld(cx, cy);
      const hit = nodeAt(w.x, w.y);
      if (hit) {
        if (props.mode() === 'edge') {
          if (!props.pendingEdge()) {
            props.setPendingEdge(hit.id);
            if (props.pushLog) props.pushLog('info', `起点: ${hit.name}, 请点击终点节点`);
          } else {
            const from = props.pendingEdge();
            if (from !== hit.id) {
              api.addEdge({ source: from, target: hit.id })
                .then(() => { if (props.pushLog) props.pushLog('ok', `已建立连线: ${from} → ${hit.id}`); return props.refresh(); })
                .catch(err => { if (props.pushLog) props.pushLog('err', '连线失败: ' + err.message); });
            }
            props.setPendingEdge(null);
          }
        } else {
          props.setSelectedId(hit.id);
          dragging = { id: hit.id, offX: w.x - hit.x, offY: w.y - hit.y, moved: false };
          localGraph.nodes = props.graph().nodes.map(n => ({ ...n }));
          localGraph.edges = props.graph().edges.map(n => ({ ...n }));
        }
      } else {
        if (props.mode() === 'edge') { props.setPendingEdge(null); return; }
        panning = { startX: e.clientX, startY: e.clientY, origX: view.x, origY: view.y };
      }
    };

    const onMouseMove = (e) => {
      const rect = canvasEl.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const w = toWorld(cx, cy);
      hovered = nodeAt(w.x, w.y);
      if (dragging) {
        const n = localGraph.nodes.find(x => x.id === dragging.id);
        if (n) {
          n.x = w.x - dragging.offX;
          n.y = w.y - dragging.offY;
          dragging.moved = true;
        }
      } else if (panning) {
        view.x = panning.origX - (e.clientX - panning.startX) / view.scale;
        view.y = panning.origY - (e.clientY - panning.startY) / view.scale;
      }
    };

    const onMouseUp = (e) => {
      if (dragging && dragging.moved) {
        const n = localGraph.nodes.find(x => x.id === dragging.id);
        if (n) {
          const orig = props.graph().nodes.find(x => x.id === dragging.id);
          if (orig && (Math.abs(orig.x - n.x) > 0.5 || Math.abs(orig.y - n.y) > 0.5)) {
            fetch('/api/graph/nodes/' + n.id, { method: 'DELETE' })
              .then(() => api.addNode({
                name: n.name, kind: n.kind, x: n.x, y: n.y,
                inputs: n.inputs, outputs: n.outputs, op: n.op, payload: n.payload
              }))
              .then(() => props.refresh())
              .catch(err => { if (props.pushLog) props.pushLog('err', '保存节点失败: ' + err.message); });
          }
        }
      }
      localGraph.nodes = [];
      localGraph.edges = [];
      dragging = null;
      panning = null;
    };

    const onDoubleClick = (e) => {
      const rect = canvasEl.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const w = toWorld(cx, cy);
      const hit = nodeAt(w.x, w.y);
      if (hit) {
        pulses.set(hit.id, performance.now());
        if (props.pushLog) props.pushLog('info', `脉冲节点: ${hit.name}`);
      } else {
        props.addNodeAt(w.x, w.y);
      }
    };

    canvasEl.addEventListener('wheel', onWheel, { passive: false });
    canvasEl.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvasEl.addEventListener('dblclick', onDoubleClick);

    onCleanup(() => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      canvasEl.removeEventListener('wheel', onWheel);
      canvasEl.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvasEl.removeEventListener('dblclick', onDoubleClick);
    });
  });

  createEffect(() => {
    const sel = props.selectedId();
    if (sel) pulses.set(sel, performance.now());
  });

  return <canvas id="graph-canvas" class="canvas"></canvas>;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

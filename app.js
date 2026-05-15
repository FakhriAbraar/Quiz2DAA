/**
 * app.js — Controller Utama
 *
 * Menangani:
 *  - Canvas rendering (node, edge, label bobot)
 *  - Interaksi user (klik tambah node, zoom, pan)
 *  - Pemanggilan algoritma
 *  - Update UI stats
 */

// ============================================================
//  STATE GLOBAL
// ============================================================
const graph    = new Graph();
let   ispIndex = -1;

let kruskalRes = null;
let primRes    = null;
let dijkstraRes = null;

// Zoom & Pan
let zoom = 1, panX = 0, panY = 0;
let isPanning = false, panStart = { x: 0, y: 0 };

// Mode input
let settingISP = false;

// Hover, drag, delete
let hoveredNode  = -1;
let hoveredEdge  = null;
let draggingNode = -1;
let wasDragging  = false;

// Obstacle
let addingObstacle = false;
let drawingObstacle = false;    
let obsCenter = { x: 0, y: 0 };
let obsRadius = 0;              
let draggingObstacle = -1;

// Animation State
let isAnimating = false;
let animNode = -1;
let animEdge = null;
let animType = ''; 

// ============================================================
//  i18n — Teks bilingual (Indonesia / English)
// ============================================================
const LANG = {
  id: {
    tagline: 'Simulasi Jaringan Kabel ISP · Graph Algorithm Visualizer',
    'stat.nodes': 'Nodes', 'stat.edges': 'Total Edge',
    'panel.addNode': '1 · Tambah Node', 'panel.runAlgo': '2 · Jalankan Algoritma',
    'panel.results': '3 · Hasil & Benchmark', 'panel.layers': '4 · Toggle Layer',
    'tab.click': 'Klik Canvas', 'tab.random': 'Random', 'tab.manual': 'Manual',
    'hint.click':    'Klik canvas untuk menambah rumah. <strong>Drag node</strong> untuk pindahkan posisi. <strong>Klik-kanan node</strong> untuk hapus.',
    'hint.random':   'Generate rumah secara acak.',
    'hint.manual':   'Masukkan koordinat manual (dalam satuan meter).',
    'hint.dijkstra': 'Dijkstra berjalan di atas jaringan MST — mensimulasikan routing melalui kabel yang sudah terpasang.',
    'btn.add': '+ Tambah', 'btn.clearAll': '🗑 Hapus Semua', 'btn.runAll': '▶ Jalankan Semua',
    'btn.setISP': '📡 Klik Ulang ISP Center', 'btn.cancelISP': '✕ Batal Set ISP',
    'label.dijkstraTarget': 'Dijkstra — Target Node', 'label.dijkstraPath': 'Dijkstra — Rute Jalur',
    'th.algorithm': 'Algoritma', 'th.length': 'Panjang (m)', 'th.edges': 'Edge', 'th.time': 'Waktu (ms)',
    'layer.allEdge': 'Semua Edge (abu)', 'layer.weights': 'Label Bobot',
    'legend.house': 'Rumah', 'algo.dijkstraSub': 'Shortest Path',
    'select.auto': 'Auto (node terjauh)',
    'select.node': (id, x, y) => `Node H${id}  (${x}, ${y})`,
    'mode.init':      'Klik canvas untuk menambah node rumah, atau gunakan tombol Random.',
    'mode.cleared':   'Canvas dikosongkan.',
    'mode.setISP':    'Klik node yang ingin dijadikan ISP Center...',
    'mode.cancelISP': 'Mode normal.',
    'mode.primAuto':  'Prim otomatis dijalankan sebagai jaringan kabel untuk Dijkstra.',
    'mode.minNodes':  '⚠ Perlu minimal 2 node!',
    'mode.nodeAdded':  (id, x, y)  => `Node H${id} ditambahkan (${x}, ${y})`,
    'mode.nodeManual': (id, x, y)  => `Node H${id} ditambahkan manual (${x}, ${y})`,
    'mode.random':     (n, total)  => `${n} node ditambahkan. Total: ${total}`,
    'mode.ispMoved':   (id)        => `ISP Center dipindahkan ke Node ${id}`,
    'mode.ispNew':     (id)        => `ISP Center baru ditambahkan sebagai Node ${id}`,
    'mode.deleted':    (label)     => `Node ${label} dihapus.`,
    'canvas.hint1': 'Klik di sini untuk menambah node rumah',
    'canvas.hint2': 'atau gunakan tombol Random di sidebar',
    'tip.hint': 'drag pindahkan · klik-kanan hapus',
    'tip.ispDist': 'ISP→node:',
    'tip.edge': 'Edge',
  },
  en: {
    tagline: 'ISP Cable Network Simulation · Graph Algorithm Visualizer',
    'stat.nodes': 'Nodes', 'stat.edges': 'Total Edges',
    'panel.addNode': '1 · Add Node', 'panel.runAlgo': '2 · Run Algorithm',
    'panel.results': '3 · Results & Benchmark', 'panel.layers': '4 · Toggle Layers',
    'tab.click': 'Click Canvas', 'tab.random': 'Random', 'tab.manual': 'Manual',
    'hint.click':    'Click canvas to add a house. <strong>Drag nodes</strong> to reposition. <strong>Right-click node</strong> to delete.',
    'hint.random':   'Generate houses randomly.',
    'hint.manual':   'Enter coordinates manually (in meters).',
    'hint.dijkstra': 'Dijkstra runs on the MST network — simulating routing through installed cables.',
    'btn.add': '+ Add', 'btn.clearAll': '🗑 Clear All', 'btn.runAll': '▶ Run All',
    'btn.setISP': '📡 Reset ISP Center', 'btn.cancelISP': '✕ Cancel ISP',
    'label.dijkstraTarget': 'Dijkstra — Target Node', 'label.dijkstraPath': 'Dijkstra — Path Route',
    'th.algorithm': 'Algorithm', 'th.length': 'Length (m)', 'th.edges': 'Edges', 'th.time': 'Time (ms)',
    'layer.allEdge': 'All Edges (gray)', 'layer.weights': 'Weight Labels',
    'legend.house': 'House', 'algo.dijkstraSub': 'Shortest Path',
    'select.auto': 'Auto (farthest node)',
    'select.node': (id, x, y) => `Node H${id}  (${x}, ${y})`,
    'mode.init':      'Click canvas to add house nodes, or use the Random button.',
    'mode.cleared':   'Canvas cleared.',
    'mode.setISP':    'Click a node to set as ISP Center...',
    'mode.cancelISP': 'Normal mode.',
    'mode.primAuto':  'Prim auto-run as cable network for Dijkstra.',
    'mode.minNodes':  '⚠ Need at least 2 nodes!',
    'mode.nodeAdded':  (id, x, y)  => `Node H${id} added (${x}, ${y})`,
    'mode.nodeManual': (id, x, y)  => `Node H${id} added manually (${x}, ${y})`,
    'mode.random':     (n, total)  => `${n} nodes added. Total: ${total}`,
    'mode.ispMoved':   (id)        => `ISP Center moved to Node ${id}`,
    'mode.ispNew':     (id)        => `New ISP Center added as Node ${id}`,
    'mode.deleted':    (label)     => `Node ${label} deleted.`,
    'canvas.hint1': 'Click here to add house nodes',
    'canvas.hint2': 'or use the Random button in the sidebar',
    'tip.hint': 'drag to move · right-click to delete',
    'tip.ispDist': 'ISP→node:',
    'tip.edge': 'Edge',
  },
};

let currentLang  = localStorage.getItem('ng-lang')  || 'id';
let currentTheme = localStorage.getItem('ng-theme') || 'dark';

/** Translate key, optional template args */
function t(key, ...args) {
  const val = LANG[currentLang]?.[key] ?? LANG.id[key] ?? key;
  return typeof val === 'function' ? val(...args) : val;
}
/** True if currently in light mode */
function isLight() { return currentTheme === 'light'; }

/** Apply theme to DOM + redraw */
function applyTheme() {
  document.body.classList.toggle('light', isLight());
  const btn = document.getElementById('btn-theme');
  if (btn) btn.textContent = isLight() ? '🌙' : '☀️';
}
function toggleTheme() {
  currentTheme = isLight() ? 'dark' : 'light';
  localStorage.setItem('ng-theme', currentTheme);
  applyTheme();
  draw();
}

/** Apply language to all data-i18n elements */
function applyLang() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    el.innerHTML = t(el.dataset.i18nHtml);
  });
  // ISP button (dynamic state, update only if not in "cancel" mode)
  if (!settingISP) {
    const ispBtn = document.getElementById('btn-set-isp');
    if (ispBtn) ispBtn.textContent = t('btn.setISP');
  }
  // Dijkstra select first option
  const sel = document.getElementById('dijkstra-target');
  if (sel && sel.options[0]) sel.options[0].textContent = t('select.auto');
  // Lang toggle button
  const langBtn = document.getElementById('btn-lang');
  if (langBtn) langBtn.textContent = currentLang === 'id' ? 'EN' : 'ID';
  // Mode bar & canvas hints
  showModeBar(t('mode.init'));
  draw();
}
function toggleLang() {
  currentLang = currentLang === 'id' ? 'en' : 'id';
  localStorage.setItem('ng-lang', currentLang);
  applyLang();
}

// ============================================================
//  CANVAS SETUP
// ============================================================
const canvas    = document.getElementById('canvas');
const ctx       = canvas.getContext('2d');
const canvasWrap = document.querySelector('.canvas-wrap');

function resizeCanvas() {
  const rect = canvasWrap.getBoundingClientRect();
  canvas.width  = rect.width;
  canvas.height = rect.height;
  draw();
}
window.addEventListener('resize', resizeCanvas);
setTimeout(resizeCanvas, 100);

// ============================================================
//  KOORDINAT TRANSFORM
// ============================================================
function toWorld(cx, cy) {
  return { x: (cx - panX) / zoom, y: (cy - panY) / zoom };
}
function toCanvas(wx, wy) {
  return { x: wx * zoom + panX, y: wy * zoom + panY };
}

// ============================================================
//  DRAW OBSTACLES— Render halangan
// ============================================================

function drawObstacles() {
  for (const obs of graph.obstacles) {
    const { x, y } = toCanvas(obs.x, obs.y);
    const r = obs.radius * zoom;

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fillStyle = isLight() ? 'rgba(248, 113, 113, 0.15)' : 'rgba(248, 113, 113, 0.12)';
    ctx.fill();
    
    ctx.strokeStyle = 'rgba(248, 113, 113, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.stroke();

    ctx.fillStyle = 'rgba(248, 113, 113, 0.8)';
    ctx.font = `600 ${10 * Math.max(0.7, zoom)}px Syne, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Rintangan (x${obs.penaltyFactor})`, x, y);
    ctx.restore();
  }

  // --- RENDER PREVIEW RINTANGAN YANG SEDANG DITARIK ---
  if (drawingObstacle) {
    const { x, y } = toCanvas(obsCenter.x, obsCenter.y);
    const r = obsRadius * zoom;

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(248, 113, 113, 0.25)'; 
    ctx.fill();
    ctx.strokeStyle = 'rgba(248, 113, 113, 0.9)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.stroke();

    ctx.fillStyle = 'rgba(248, 113, 113, 1)';
    ctx.font = `700 ${12 * Math.max(0.7, zoom)}px Syne, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${obsRadius.toFixed(0)}m`, x, y);
    ctx.restore();
  }
}

// ============================================================
//  DRAW — Render seluruh canvas
// ============================================================
function draw() {
  // Background fill (theme-aware)
  ctx.fillStyle = isLight() ? '#f0f2f5' : '#0d1117';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Background grid
  drawGrid();

  drawObstacles();

  if (graph.nodeCount === 0) {
    drawEmptyHint();
    return;
  }

  // Layer: semua edge (abu-abu tipis, theme-aware)
  const allEdgeColor = isLight() ? 'rgba(0,0,0,0.09)' : 'rgba(255,255,255,0.06)';
  if (isLayerOn('alledge') && graph.nodeCount <= 40) {
    for (const e of graph.edges) drawEdge(e, allEdgeColor, 0.8, []);
  }

  // Layer: Kruskal MST (hijau)
  if (isLayerOn('kruskal') && kruskalRes)
    for (const e of kruskalRes.edges) drawEdge(e, '#22c55e', 2.5, []);

  // Layer: Prim MST (biru, putus-putus)
  if (isLayerOn('prim') && primRes)
    for (const e of primRes.edges) drawEdge(e, '#38bdf8', 2.5, [8, 4]);

  // Layer: Dijkstra Path (merah, lebih tebal)
  if (isLayerOn('dijkstra') && dijkstraRes)
    for (const e of dijkstraRes.edges) drawEdge(e, '#f87171', 3.5, []);

  // ── Node hover: highlight semua edge yang terhubung ke node ini ──
  if (hoveredNode >= 0 && hoveredNode < graph.nodeCount) {

    // 1) Gray edges (complete graph) — render DULU agar MST tampil di atasnya
    if (isLayerOn('alledge')) {
      const grayStroke = isLight() ? 'rgba(0,0,0,0.30)'  : 'rgba(255,255,255,0.30)';
      const grayLabel  = isLight() ? 'rgba(0,0,0,0.45)'  : 'rgba(255,255,255,0.45)';
      for (const edge of graph.edges) {
        if (edge.u !== hoveredNode && edge.v !== hoveredNode) continue;
        const na = graph.nodes[edge.u], nb = graph.nodes[edge.v];
        const ca = toCanvas(na.x, na.y), cb = toCanvas(nb.x, nb.y);
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(ca.x, ca.y); ctx.lineTo(cb.x, cb.y);
        ctx.strokeStyle = grayStroke;
        ctx.lineWidth   = 2 * Math.max(0.5, zoom);
        ctx.setLineDash([]); ctx.lineCap = 'round';
        ctx.globalAlpha = 0.75;
        ctx.stroke();
        ctx.restore();
        drawWeightLabel(edge, grayLabel);
      }
    }

    // 2) MST / Dijkstra edges — render SETELAH gray agar lebih menonjol
    const edgeSets = [
      kruskalRes  && isLayerOn('kruskal')  ? { edges: kruskalRes.edges,  color: '#22c55e' } : null,
      primRes     && isLayerOn('prim')     ? { edges: primRes.edges,     color: '#38bdf8' } : null,
      dijkstraRes && isLayerOn('dijkstra') ? { edges: dijkstraRes.edges, color: '#f87171' } : null,
    ].filter(Boolean);

    for (const set of edgeSets) {
      for (const edge of set.edges) {
        if (edge.u !== hoveredNode && edge.v !== hoveredNode) continue;
        const na = graph.nodes[edge.u], nb = graph.nodes[edge.v];
        const ca = toCanvas(na.x, na.y), cb = toCanvas(nb.x, nb.y);
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(ca.x, ca.y); ctx.lineTo(cb.x, cb.y);
        ctx.strokeStyle = set.color;
        ctx.lineWidth   = 4 * Math.max(0.5, zoom);
        ctx.setLineDash([]); ctx.lineCap = 'round';
        ctx.shadowColor = set.color; ctx.shadowBlur = 14;
        ctx.globalAlpha = 0.95;
        ctx.stroke();
        ctx.restore();
        drawWeightLabel(edge, set.color);
      }
    }
  }

  // Label bobot standar (zoom cukup besar & node tidak terlalu banyak)
  if (isLayerOn('weights')) {
    const showWeights = zoom > 0.7 && graph.nodeCount <= 25;
    if (showWeights) {
      if (isLayerOn('kruskal') && kruskalRes)
        for (const e of kruskalRes.edges) drawWeightLabel(e, '#22c55e');
      if (isLayerOn('prim') && primRes)
        for (const e of primRes.edges) drawWeightLabel(e, '#38bdf8');
      if (isLayerOn('dijkstra') && dijkstraRes)
        for (const e of dijkstraRes.edges) drawWeightLabel(e, '#f87171');
    }
  }

  // Node
  for (let i = 0; i < graph.nodeCount; i++) drawNode(i);

  // Hover: single-edge highlight (saat cursor di atas edge, bukan node)
  if (hoveredEdge && hoveredEdge.edge.u < graph.nodeCount && hoveredEdge.edge.v < graph.nodeCount) {
    const eu = graph.nodes[hoveredEdge.edge.u];
    const ev = graph.nodes[hoveredEdge.edge.v];
    const a  = toCanvas(eu.x, eu.y);
    const b  = toCanvas(ev.x, ev.y);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = hoveredEdge.color;
    ctx.lineWidth   = 5 * Math.max(0.5, zoom);
    ctx.setLineDash([]); ctx.lineCap = 'round';
    ctx.shadowColor = hoveredEdge.color; ctx.shadowBlur = 14;
    ctx.globalAlpha = 0.85;
    ctx.stroke();
    ctx.restore();
  }

  // Hover: node ring (theme-aware)
  if (hoveredNode >= 0 && hoveredNode < graph.nodeCount) {
    const nd = graph.nodes[hoveredNode];
    const { x, y } = toCanvas(nd.x, nd.y);
    const baseR = (hoveredNode === ispIndex ? 14 : 10) * Math.max(0.5, zoom);
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, baseR + 5, 0, Math.PI * 2);
    ctx.strokeStyle = isLight() ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.7)';
    ctx.lineWidth   = 2;
    ctx.setLineDash([4, 3]);
    ctx.stroke();
    ctx.restore();
  }

  // --- RENDER HIGHLIGHT ANIMASI ---
  if (isAnimating) {
    if (animEdge) {
      const color = animType === 'eval' ? '#eab308' : (animType === 'add' ? '#22c55e' : '#f87171');
      drawEdge(animEdge, color, 4.5, []);
      drawWeightLabel(animEdge, color);
    }

    if (animNode >= 0) {
      const nd = graph.nodes[animNode];
      const { x, y } = toCanvas(nd.x, nd.y);
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, 16 * Math.max(0.5, zoom), 0, Math.PI * 2);
      ctx.strokeStyle = '#eab308'; // Kuning
      ctx.lineWidth = 3.5;
      ctx.stroke();
      ctx.restore();
    }
  }

  updateHints();
}

function drawGrid() {
  const gridSize = 60 * zoom;
  const ox = ((panX % gridSize) + gridSize) % gridSize;
  const oy = ((panY % gridSize) + gridSize) % gridSize;

  ctx.save();
  ctx.strokeStyle = isLight() ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;

  for (let x = ox; x < canvas.width; x += gridSize) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let y = oy; y < canvas.height; y += gridSize) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }
  ctx.restore();
}

function drawEmptyHint() {
  ctx.save();
  ctx.fillStyle = isLight() ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.07)';
  ctx.font = '16px Syne, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(t('canvas.hint1'), canvas.width / 2, canvas.height / 2);
  ctx.font = '12px IBM Plex Mono, monospace';
  ctx.fillStyle = isLight() ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.04)';
  ctx.fillText(t('canvas.hint2'), canvas.width / 2, canvas.height / 2 + 28);
  ctx.restore();
}

function drawEdge(edge, color, lineWidth, dash) {
  const a = toCanvas(graph.nodes[edge.u].x, graph.nodes[edge.u].y);
  const b = toCanvas(graph.nodes[edge.v].x, graph.nodes[edge.v].y);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.strokeStyle = color;
  ctx.lineWidth   = lineWidth * zoom;
  ctx.setLineDash(dash.map(d => d * zoom));
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();
}

function drawWeightLabel(edge, color) {
  const a  = toCanvas(graph.nodes[edge.u].x, graph.nodes[edge.u].y);
  const b  = toCanvas(graph.nodes[edge.v].x, graph.nodes[edge.v].y);
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const label = edge.weight.toFixed(0) + 'm';

  ctx.save();

  // Latar belakang kecil agar label terbaca
  ctx.font = `${Math.max(9, 11 * zoom)}px IBM Plex Mono, monospace`;
  const tw = ctx.measureText(label).width;
  ctx.fillStyle = isLight() ? 'rgba(240,242,245,0.92)' : 'rgba(13,17,23,0.75)';
  ctx.fillRect(mx - tw / 2 - 3, my - 8, tw + 6, 14);

  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, mx, my);

  ctx.restore();
}

function drawNode(i) {
  const node = graph.nodes[i];
  const { x, y } = toCanvas(node.x, node.y);
  const isISP = i === ispIndex;

  // Ukuran node diperbesar agar jelas
  const BASE_R = isISP ? 14 : 10;
  const r = BASE_R * Math.max(0.5, zoom);

  // Tentukan warna berdasarkan status
  let fillColor   = '#a78bfa';  // default: ungu
  let strokeColor = isLight() ? '#f0f2f5' : '#0d1117';

  if (isISP) {
    fillColor = '#F59E0B';
  } else if (dijkstraRes && isLayerOn('dijkstra') && dijkstraRes.path.includes(i)) {
    fillColor = '#f87171';   // node di jalur Dijkstra: merah
  } else if (kruskalRes && isLayerOn('kruskal') && kruskalRes.edges.some(e => e.u === i || e.v === i)) {
    fillColor = '#22c55e';   // node di MST Kruskal: hijau
  }

  // Glow / aura luar
  const glowR = r * 2.2;
  const grd = ctx.createRadialGradient(x, y, r * 0.5, x, y, glowR);
  grd.addColorStop(0, fillColor + '40');
  grd.addColorStop(1, 'transparent');
  ctx.beginPath();
  ctx.arc(x, y, glowR, 0, Math.PI * 2);
  ctx.fillStyle = grd;
  ctx.fill();

  // Lingkaran node
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle   = fillColor;
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth   = 2;
  ctx.fill();
  ctx.stroke();

  // Label nomor node (di dalam lingkaran)
  if (graph.nodeCount <= 80 || isISP) {
    const fs = Math.max(8, Math.min(13, r * 0.9));
    ctx.save();
    ctx.font         = `700 ${fs}px Syne, sans-serif`;
    ctx.fillStyle    = isISP ? '#0d1117' : '#0d1117';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isISP ? '🏢' : i, x, y);
    ctx.restore();
  }

  // Label nama di bawah node
  if (zoom > 0.55 && graph.nodeCount <= 60) {
    const fs = Math.max(9, 10 * zoom);
    ctx.save();
    ctx.font         = `${fs}px IBM Plex Mono, monospace`;
    ctx.fillStyle    = isISP ? '#F59E0B' : (isLight() ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.55)');
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(isISP ? 'ISP' : `H${i}`, x, y + r + 4);
    ctx.restore();
  }
}

function isLayerOn(name) {
  const el = document.getElementById('layer-' + name);
  return el ? el.checked : true;
}

// ============================================================
//  CANVAS EVENTS — Klik, Zoom, Pan
// ============================================================
canvas.addEventListener('click', e => {
  if (wasDragging) { wasDragging = false; return; }
  if (isPanning) return;
  if (addingObstacle) return;
  const rect = canvas.getBoundingClientRect();
  const cx   = e.clientX - rect.left;
  const cy   = e.clientY - rect.top;
  const { x, y } = toWorld(cx, cy);

  if (settingISP) {
    // Cari node terdekat dalam radius 30px layar
    let nearest = -1, minD = 30 / zoom;
    for (let i = 0; i < graph.nodeCount; i++) {
      const d = Math.hypot(x - graph.nodes[i].x, y - graph.nodes[i].y);
      if (d < minD) { minD = d; nearest = i; }
    }
    if (nearest >= 0) {
      ispIndex = nearest;
      showModeBar(t('mode.ispMoved', nearest));
    } else {
      const id = graph.addNode(x, y);
      ispIndex  = id;
      showModeBar(t('mode.ispNew', id));
    }
    settingISP = false;
    document.getElementById('btn-set-isp').textContent = t('btn.setISP');
    updateDijkstraSelect();
    updateHeaderStats();
    draw();
    return;
  }

  // Mode normal: tambah node baru
  const id = graph.addNode(x, y);
  if (ispIndex < 0) ispIndex = 0;
  updateDijkstraSelect();
  updateHeaderStats();
  showModeBar(t('mode.nodeAdded', id, x.toFixed(0), y.toFixed(0)));
  draw();
});

// Middle-click atau Alt+click untuk pan; left-click drag pada node untuk pindahkan
canvas.addEventListener('mousedown', e => {
  const rect = canvas.getBoundingClientRect();
  const cx = e.clientX - rect.left;
  const cy = e.clientY - rect.top;
  const { x, y } = toWorld(cx, cy);

  wasDragging = false;

  if (e.button === 1 || (e.button === 0 && e.altKey)) {
    isPanning = true;
    panStart  = { x: e.clientX - panX, y: e.clientY - panY };
    canvas.style.cursor = 'grab';
    return;
  }

  // Deteksi klik pada node yang sudah ada → drag
  if (e.button === 0 && !settingISP) {
    let nearest = -1, minD = 22 / zoom;
    for (let i = 0; i < graph.nodeCount; i++) {
      const d = Math.hypot(x - graph.nodes[i].x, y - graph.nodes[i].y);
      if (d < minD) { minD = d; nearest = i; }
    }
    if (nearest >= 0) {
      draggingNode = nearest;
      canvas.style.cursor = 'grabbing';
    }
  }

  if (addingObstacle && e.button === 0) {
    drawingObstacle = true;
    obsCenter = { x, y };
    obsRadius = 0;
    return;
  }

  if (e.button === 0 && !settingISP && !addingObstacle) {

    let nearestNode = -1, minDNode = 22 / zoom;
    for (let i = 0; i < graph.nodeCount; i++) {
      const d = Math.hypot(x - graph.nodes[i].x, y - graph.nodes[i].y);
      if (d < minDNode) { minDNode = d; nearestNode = i; }
    }
    if (nearestNode >= 0) {
      draggingNode = nearestNode;
      canvas.style.cursor = 'grabbing';
      return;
    }

    let clickedObs = -1;
    for (let i = graph.obstacles.length - 1; i >= 0; i--) {
      const obs = graph.obstacles[i];
      if (Math.hypot(x - obs.x, y - obs.y) <= obs.radius) {
        clickedObs = i;
        break;
      }
    }
    if (clickedObs >= 0) {
      draggingObstacle = clickedObs;
      canvas.style.cursor = 'grabbing';
      return;
    }
  }

});

canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  const cx = e.clientX - rect.left;
  const cy = e.clientY - rect.top;

  if (isPanning) {
    panX = e.clientX - panStart.x;
    panY = e.clientY - panStart.y;
    draw();
    return;
  }

  if (draggingNode >= 0) {
    wasDragging = true;
    const { x, y } = toWorld(cx, cy);
    graph.nodes[draggingNode].x = x;
    graph.nodes[draggingNode].y = y;
    graph._rebuildEdges();
    rerunActiveAlgos();
    updateTooltip(false);
    draw();
    return;
  }

  // Hover detection
  const { x, y } = toWorld(cx, cy);

  let newHovNode = -1;
  let nearDist = 22 / zoom;
  for (let i = 0; i < graph.nodeCount; i++) {
    const d = Math.hypot(x - graph.nodes[i].x, y - graph.nodes[i].y);
    if (d < nearDist) { nearDist = d; newHovNode = i; }
  }

  let newHovEdge = null;
  if (newHovNode < 0) {
    const edgeSets = [
      kruskalRes  && isLayerOn('kruskal')  ? { edges: kruskalRes.edges,  algo: 'Kruskal',  color: '#22c55e' } : null,
      primRes     && isLayerOn('prim')     ? { edges: primRes.edges,     algo: 'Prim',     color: '#38bdf8' } : null,
      dijkstraRes && isLayerOn('dijkstra') ? { edges: dijkstraRes.edges, algo: 'Dijkstra', color: '#f87171' } : null,
    ].filter(Boolean);

    const threshold = 8 / zoom;
    let bestD = threshold;
    for (const set of edgeSets) {
      for (const edge of set.edges) {
        const a = graph.nodes[edge.u], b = graph.nodes[edge.v];
        const d = ptSegDist(x, y, a.x, a.y, b.x, b.y);
        if (d < bestD) { bestD = d; newHovEdge = { edge, algo: set.algo, color: set.color }; }
      }
    }
  }

  const changed = newHovNode !== hoveredNode || newHovEdge !== hoveredEdge;
  hoveredNode = newHovNode;
  hoveredEdge = newHovEdge;

  if (hoveredNode >= 0) {
    const nd    = graph.nodes[hoveredNode];
    const isISP = hoveredNode === ispIndex;
    let c = `<strong>${isISP ? '🏢 ISP Center' : `H${hoveredNode}`}</strong><br>`;
    c += `X: ${nd.x.toFixed(1)}m &nbsp; Y: ${nd.y.toFixed(1)}m`;
    const d = dijkstraRes?.allDist?.[hoveredNode];
    if (d !== undefined && d !== Infinity) {
      c += `<br>${t('tip.ispDist')} <span style="color:#f87171">${d.toFixed(1)}m</span>`;
    }
    c += `<br><em style="font-size:9px;color:#8c959f">${t('tip.hint')}</em>`;
    updateTooltip(true, c, cx, cy);
  } else if (hoveredEdge) {
    const e = hoveredEdge.edge;
    let c = `<strong style="color:${hoveredEdge.color}">${hoveredEdge.algo}</strong> ${t('tip.edge')}<br>`;
    c += `H${e.u} ↔ H${e.v}<br>`;
    c += `<span style="color:${hoveredEdge.color}">${e.weight.toFixed(1)} m</span>`;
    updateTooltip(true, c, cx, cy);
  } else {
    updateTooltip(false);
  }

  if (drawingObstacle) {
    obsRadius = Math.hypot(x - obsCenter.x, y - obsCenter.y);
    draw();
    return;
  }

  if (draggingNode >= 0) {
    wasDragging = true;
    const { x, y } = toWorld(cx, cy);
    graph.nodes[draggingNode].x = x;
    graph.nodes[draggingNode].y = y;
    graph._rebuildEdges();
    rerunActiveAlgos();
    updateTooltip(false);
    draw();
    return;
  }

  if (draggingObstacle >= 0) {
    wasDragging = true;
    const { x, y } = toWorld(cx, cy);
    graph.obstacles[draggingObstacle].x = x;
    graph.obstacles[draggingObstacle].y = y;

    graph._rebuildEdges();
    rerunActiveAlgos(); 
    draw();
    return;
  }

  if (changed) draw();
});

canvas.addEventListener('mouseup', () => {
  if (draggingNode >= 0) {
    draggingNode = -1;
    canvas.style.cursor = settingISP ? 'cell' : 'crosshair';
    updateDijkstraSelect();
    return;
  }
  isPanning = false;
  canvas.style.cursor = settingISP ? 'cell' : 'crosshair';

  if (drawingObstacle) {
    drawingObstacle = false;
    if (obsRadius > 10) { 
      graph.obstacles.push(new Obstacle(obsCenter.x, obsCenter.y, obsRadius, 2.5));
      graph._rebuildEdges();
      rerunActiveAlgos();
      showModeBar('Rintangan ditambahkan. Drag lagi untuk membuat yang baru.');
    }
  }

  if (draggingObstacle >= 0) {
    draggingObstacle = -1;
    canvas.style.cursor = 'crosshair';
    return;
  }

  draw();
    return;

});

canvas.addEventListener('mouseleave', () => {
  isPanning    = false;
  draggingNode = -1;
  hoveredNode  = -1;
  draggingObstacle = -1;
  hoveredEdge  = null;
  updateTooltip(false);
  draw();
});

// Klik-kanan node → hapus node
canvas.addEventListener('contextmenu', e => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const cx = e.clientX - rect.left;
  const cy = e.clientY - rect.top;
  const { x, y } = toWorld(cx, cy);

  let nearest = -1, minD = 25 / zoom;
  for (let i = 0; i < graph.nodeCount; i++) {
    const d = Math.hypot(x - graph.nodes[i].x, y - graph.nodes[i].y);
    if (d < minD) { minD = d; nearest = i; }
  }
  if (nearest >= 0) {
    const label = nearest === ispIndex ? 'ISP Center' : `H${nearest}`;
    deleteNode(nearest);
    hoveredNode = -1;
    hoveredEdge = null;
    updateTooltip(false);
    draw();
    showModeBar(t('mode.deleted', label));
  }

  
});

// Scroll to zoom
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const rect   = canvas.getBoundingClientRect();
  const cx     = e.clientX - rect.left;
  const cy     = e.clientY - rect.top;
  const factor = e.deltaY < 0 ? 1.12 : 0.9;
  const newZ   = Math.max(0.15, Math.min(12, zoom * factor));

  panX = cx - (cx - panX) * (newZ / zoom);
  panY = cy - (cy - panY) * (newZ / zoom);
  zoom = newZ;
  draw();
}, { passive: false });

// ============================================================
//  ZOOM & PAN CONTROLS
// ============================================================
function zoomIn()    { zoom = Math.min(12, zoom * 1.3); draw(); }
function zoomOut()   { zoom = Math.max(0.15, zoom / 1.3); draw(); }
function resetView() { zoom = 1; panX = 0; panY = 0; draw(); }

// ============================================================
//  INPUT ACTIONS
// ============================================================
function generateRandom(n) {
  const W = canvas.width  / zoom - 80 / zoom;
  const H = canvas.height / zoom - 80 / zoom;

  // Distribusi lebih merata dengan grid + jitter
  const cols = Math.ceil(Math.sqrt(n * (W / H)));
  const rows = Math.ceil(n / cols);
  const cW   = W / cols;
  const cH   = H / rows;

  let added = 0;
  for (let r = 0; r < rows && added < n; r++) {
    for (let c = 0; c < cols && added < n; c++) {
      const x = 40 / zoom + c * cW + Math.random() * cW * 0.7;
      const y = 40 / zoom + r * cH + Math.random() * cH * 0.7;
      graph.addNode(x, y);
      added++;
    }
  }

  if (ispIndex < 0) ispIndex = 0;
  updateDijkstraSelect();
  updateHeaderStats();
  showModeBar(t('mode.random', n, graph.nodeCount));
  draw();
}

function addManual() {
  const x = parseFloat(document.getElementById('inp-x').value);
  const y = parseFloat(document.getElementById('inp-y').value);
  if (isNaN(x) || isNaN(y)) { alert('Masukkan koordinat X dan Y yang valid.'); return; }

  const id = graph.addNode(x, y);
  if (ispIndex < 0) ispIndex = 0;
  document.getElementById('inp-x').value = '';
  document.getElementById('inp-y').value = '';
  updateDijkstraSelect();
  updateHeaderStats();
  showModeBar(t('mode.nodeManual', id, x, y));
  draw();
}

function clearAll() {
  graph.clear();
  ispIndex    = -1;
  kruskalRes  = null;
  primRes     = null;
  dijkstraRes = null;

  // Reset stats UI
  ['r-klen','r-ktime','r-kedge','r-plen','r-ptime','r-pedge','r-dlen','r-dtime','r-dedge']
    .forEach(id => document.getElementById(id).textContent = '—');

  document.querySelectorAll('.algo-card').forEach(b => b.classList.remove('active'));
  hoveredNode = -1; hoveredEdge = null;
  updateTooltip(false);
  updateDijkstraSelect();
  updateDijkstraPath([]);
  updateHeaderStats();
  showModeBar(t('mode.cleared'));
  draw();
}

// ============================================================
//  ALGORITMA
// ============================================================
// ============================================================
//  ALGORITMA (Sekarang berjalan secara Async untuk Animasi)
// ============================================================
async function runAlgo(name, isDragEvent = false) {
  if (graph.nodeCount < 2) { showModeBar(t('mode.minNodes')); return; }
  
  // Cegah spam klik saat sedang animasi
  if (isAnimating && !isDragEvent) return; 

  const start = ispIndex >= 0 ? ispIndex : 0;
  
  // Ambil pengaturan animasi dari UI
  const chkAnim = document.getElementById('chk-anim');
  const speedInput = document.getElementById('inp-speed');
  const doAnim = chkAnim && chkAnim.checked && !isDragEvent; // Jangan animasi jika user sedang drag node/rintangan
  const delayMs = doAnim ? parseInt(speedInput.value) : 0;

  if (doAnim) {
    isAnimating = true;
    animNode = -1; animEdge = null;
    showModeBar(`Menjalankan ${name.toUpperCase()}...`);
    draw();
  }

  // Fungsi Callback yang dipanggil setiap kali algoritma melangkah 1 step
  const onStep = async (step) => {
    if (step.type === 'done') return;
    animNode = step.node !== undefined ? step.node : -1;
    animEdge = step.edge || null;
    animType = step.type || '';
    draw(); // Render kanvas dengan status terbaru
  };

  if (name === 'kruskal') {
    if (doAnim) kruskalRes = null;
    kruskalRes = await kruskal(graph, delayMs, onStep);
    updateResultRow('k', kruskalRes);
    document.getElementById('btn-kruskal').classList.add('active');
    
  } else if (name === 'prim') {
    if (doAnim) primRes = null;
    primRes = await prim(graph, start, delayMs, onStep);
    updateResultRow('p', primRes);
    document.getElementById('btn-prim').classList.add('active');
    
  } else if (name === 'dijkstra') {
    const tgt = parseInt(document.getElementById('dijkstra-target').value);
    let mstEdges = null;
    if (kruskalRes) mstEdges = kruskalRes.edges;
    else if (primRes) mstEdges = primRes.edges;
    else {
      primRes = await prim(graph, start, 0); // Generate instan tanpa animasi
      updateResultRow('p', primRes);
      document.getElementById('btn-prim').classList.add('active');
      mstEdges = primRes.edges;
    }
    
    if (doAnim) dijkstraRes = null;
    dijkstraRes = await dijkstraOnMST(mstEdges, graph.nodes, start, tgt, delayMs, onStep);
    updateResultRow('d', dijkstraRes);
    document.getElementById('btn-dijkstra').classList.add('active');
    updateDijkstraPath(dijkstraRes.path);
  }

  if (doAnim) {
    isAnimating = false;
    animNode = -1; animEdge = null;
    showModeBar('Selesai.');
    draw();
  }
}

async function runAll() {
  if (graph.nodeCount < 2) return;
  if (isAnimating) return;
  await runAlgo('kruskal');
  await runAlgo('prim');
  await runAlgo('dijkstra');
}

function updateAllCosts() {
  if (kruskalRes)  updateResultRow('k', kruskalRes);
  if (primRes)     updateResultRow('p', primRes);
  if (dijkstraRes) updateResultRow('d', dijkstraRes);
}

function updateResultRow(prefix, result) {
  const lengthMeters = result.totalWeight;
  
  const costInput = document.getElementById('inp-cost-meter');
  const costPerMeter = costInput ? (parseFloat(costInput.value) || 0) : 25000; // Default 25rb jika input belum ada di html
  
  const estimatedCost = lengthMeters * costPerMeter;
  
  const formatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });

  if (lengthMeters === 0) {
    document.getElementById(`r-${prefix}len`).innerHTML = '0m<br><small style="color:var(--text3)">Rp 0</small>';
  } else {
    document.getElementById(`r-${prefix}len`).innerHTML = 
      `${lengthMeters.toFixed(1)}m<br><small style="color:var(--orange); font-weight:600;">${formatter.format(estimatedCost)}</small>`;
  }

  document.getElementById(`r-${prefix}time`).textContent = result.timeMs.toFixed(3);
  document.getElementById(`r-${prefix}edge`).textContent = result.edges.length;
}

// ============================================================
//  UI HELPERS
// ============================================================
function updateHeaderStats() {
  document.getElementById('hs-nodes').textContent = graph.nodeCount;
  document.getElementById('hs-edges').textContent = graph.edgeCount;
}

function updateHints() {
  document.getElementById('hs-nodes').textContent = graph.nodeCount;
  document.getElementById('hs-edges').textContent = graph.edgeCount;
}

function updateDijkstraSelect() {
  const sel  = document.getElementById('dijkstra-target');
  const prev = sel.value;
  sel.innerHTML = `<option value="-1">${t('select.auto')}</option>`;

  for (let i = 0; i < graph.nodeCount; i++) {
    if (i === ispIndex) continue;
    const opt   = document.createElement('option');
    opt.value   = i;
    const n     = graph.nodes[i];
    opt.textContent = t('select.node', i, n.x.toFixed(0), n.y.toFixed(0));
    sel.appendChild(opt);
  }

  if (prev && prev !== '-1') sel.value = prev;
}

function showModeBar(msg) {
  document.getElementById('mode-bar').textContent = msg;
}

// ============================================================
//  HELPER FUNCTIONS
// ============================================================

// Jarak titik ke segmen garis (world coords) — untuk hover edge
function ptSegDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// Tooltip HTML overlay
function updateTooltip(show, content = '', cx = 0, cy = 0) {
  const tip = document.getElementById('tooltip');
  if (!tip) return;
  if (!show) { tip.style.display = 'none'; return; }
  tip.innerHTML = content;
  tip.style.display = 'block';
  const cr = canvas.getBoundingClientRect();
  let tx = cr.left + cx + 16;
  let ty = cr.top  + cy - 10;
  tip.style.left = tx + 'px';
  tip.style.top  = ty + 'px';
  // Clamp agar tidak keluar viewport
  const tr = tip.getBoundingClientRect();
  if (tr.right  > window.innerWidth  - 8) tx = cr.left + cx - tr.width  - 12;
  if (tr.bottom > window.innerHeight - 8) ty = cr.top  + cy - tr.height + 10;
  tip.style.left = tx + 'px';
  tip.style.top  = ty + 'px';
}

// Fit semua node ke layar
function fitToScreen() {
  if (graph.nodeCount === 0) { resetView(); return; }
  const padding = 70;
  const xs = graph.nodes.map(n => n.x);
  const ys = graph.nodes.map(n => n.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const rangeX = maxX - minX || 100;
  const rangeY = maxY - minY || 100;
  zoom = Math.min(
    (canvas.width  - padding * 2) / rangeX,
    (canvas.height - padding * 2) / rangeY,
    4
  );
  panX = canvas.width  / 2 - ((minX + maxX) / 2) * zoom;
  panY = canvas.height / 2 - ((minY + maxY) / 2) * zoom;
  draw();
}

// Hapus node individual, renumber, clear results
function deleteNode(index) {
  graph.nodes.splice(index, 1);
  graph.nodes.forEach((n, i) => { n.id = i; });
  graph._rebuildEdges();
  if (ispIndex === index)       ispIndex = graph.nodeCount > 0 ? 0 : -1;
  else if (ispIndex > index)    ispIndex--;
  kruskalRes = primRes = dijkstraRes = null;
  ['r-klen','r-ktime','r-kedge','r-plen','r-ptime','r-pedge','r-dlen','r-dtime','r-dedge']
    .forEach(id => { const el = document.getElementById(id); if (el) el.textContent = '—'; });
  document.querySelectorAll('.algo-card').forEach(b => b.classList.remove('active'));
  updateDijkstraPath([]);
  updateDijkstraSelect();
  updateHeaderStats();
}

// Jalankan ulang algoritma aktif setelah drag
async function rerunActiveAlgos() {
  const start = ispIndex >= 0 ? ispIndex : 0;
  // Parameter isDragEvent = true (dan delay = 0) agar tidak ada animasi
  if (kruskalRes)  { kruskalRes  = await kruskal(graph, 0);        updateResultRow('k', kruskalRes); }
  if (primRes)     { primRes     = await prim(graph, start, 0);    updateResultRow('p', primRes); }
  if (dijkstraRes) {
    const mstEdges = kruskalRes ? kruskalRes.edges : (primRes ? primRes.edges : null);
    if (mstEdges) {
      const prevTarget = dijkstraRes.target;
      dijkstraRes = await dijkstraOnMST(mstEdges, graph.nodes, start, prevTarget, 0);
      updateResultRow('d', dijkstraRes);
      updateDijkstraPath(dijkstraRes.path);
    }
  }
}

// Tampilkan rute Dijkstra di sidebar
function updateDijkstraPath(path) {
  const el = document.getElementById('dijkstra-path-display');
  if (!el) return;
  if (!path || path.length === 0) { el.textContent = '—'; return; }
  el.textContent = path.map(i => (i === ispIndex ? 'ISP' : `H${i}`)).join(' → ');
}

// ============================================================
//  TAB SWITCHING
// ============================================================
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const group = tab.closest('.panel');
    group.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    group.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    const target = document.getElementById('tab-' + tab.dataset.tab);
    if (target) target.classList.add('active');
  });
});

// ============================================================
//  SET ISP BUTTON
// ============================================================
document.getElementById('btn-set-isp').addEventListener('click', () => {
  settingISP = !settingISP;
  const btn = document.getElementById('btn-set-isp');

  if (settingISP) {
    btn.textContent = t('btn.cancelISP');
    canvas.style.cursor = 'cell';
    showModeBar(t('mode.setISP'));
  } else {
    btn.textContent = t('btn.setISP');
    canvas.style.cursor = 'crosshair';
    showModeBar(t('mode.cancelISP'));
  }
});

// ============================================================
//  ADD OBSTACLE BUTTON
// ============================================================
document.getElementById('btn-add-obs').addEventListener('click', () => {
  addingObstacle = !addingObstacle;
  const btn = document.getElementById('btn-add-obs');

  if (addingObstacle) {
    settingISP = false; // Matikan mode ISP jika sedang aktif
    document.getElementById('btn-set-isp').textContent = '📡 Set ISP';
    
    btn.textContent = '✕ Batal Rintangan';
    btn.classList.add('btn-danger'); // Berubah merah
    btn.classList.remove('btn-outline');
    canvas.style.cursor = 'crosshair';
    showModeBar('Klik canvas untuk menempatkan rintangan...');
  } else {
    btn.textContent = '🛑 + Rintangan';
    btn.classList.remove('btn-danger');
    btn.classList.add('btn-outline');
    canvas.style.cursor = 'crosshair';
    showModeBar('Mode normal.');
  }
});

// ============================================================
//  EXPORT & IMPORT TOPOLOGY (JSON)
// ============================================================

/** Mengambil seluruh state graf dan mengunduhnya sebagai file .json */
function exportTopology() {
  if (graph.nodeCount === 0 && graph.obstacles.length === 0) {
    alert("Graf masih kosong!");
    return;
  }

  const data = {
    metadata: {
      appName: "NetGraph",
      version: "1.0",
      exportDate: new Date().toISOString()
    },
    ispIndex: ispIndex,
    costPerMeter: parseFloat(document.getElementById('inp-cost-meter').value) || 25000,
    nodes: graph.nodes.map(n => ({ id: n.id, x: n.x, y: n.y })),
    obstacles: graph.obstacles.map(o => ({ x: o.x, y: o.y, radius: o.radius, penaltyFactor: o.penaltyFactor }))
  };

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
  const dlAnchorElem = document.createElement('a');
  dlAnchorElem.setAttribute("href", dataStr);
  dlAnchorElem.setAttribute("download", `netgraph_topologi_${new Date().getTime()}.json`);
  dlAnchorElem.click();
  
  showModeBar("Topologi berhasil diekspor ke file JSON.");
}

/** Membaca file .json dan memulihkan state graf */
function importTopology(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const data = JSON.parse(e.target.result);
      
      if (!data.nodes) throw new Error("Format file tidak dikenali.");

      clearAll();

      data.nodes.forEach(n => graph.addNode(n.x, n.y));
      
      ispIndex = data.ispIndex;

      if (data.costPerMeter) {
        document.getElementById('inp-cost-meter').value = data.costPerMeter;
      }

      if (data.obstacles) {
        data.obstacles.forEach(o => {
          graph.obstacles.push(new Obstacle(o.x, o.y, o.radius, o.penaltyFactor));
        });
      }

      graph._rebuildEdges();
      updateDijkstraSelect();
      updateHeaderStats();
      updateAllCosts();

      if (graph.nodeCount >= 2) {
        await rerunActiveAlgos();
      }

      fitToScreen();
      
      showModeBar("Topologi berhasil dimuat!");
      draw();

      event.target.value = "";

    } catch (err) {
      console.error(err);
      alert("Gagal memuat file: " + err.message);
    }
  };
  reader.readAsText(file);
}

// ============================================================
//  LAYER CHECKBOXES — redraw on change
// ============================================================
function redraw() { draw(); }

// ============================================================
//  INIT
// ============================================================
applyTheme();   // terapkan tema tersimpan (dark/light)
applyLang();    // terapkan bahasa tersimpan + isi semua data-i18n

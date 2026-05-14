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
//  DRAW — Render seluruh canvas
// ============================================================
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background grid
  drawGrid();

  if (graph.nodeCount === 0) {
    drawEmptyHint();
    return;
  }

  // Layer: semua edge (abu-abu tipis)
  if (isLayerOn('alledge') && graph.nodeCount <= 40) {
    for (const e of graph.edges) drawEdge(e, 'rgba(255,255,255,0.06)', 0.8, []);
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

  // Label bobot (hanya saat zoom cukup besar dan node tidak terlalu banyak)
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

  updateHints();
}

function drawGrid() {
  const gridSize = 60 * zoom;
  const ox = ((panX % gridSize) + gridSize) % gridSize;
  const oy = ((panY % gridSize) + gridSize) % gridSize;

  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
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
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.font = '16px Syne, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Klik di sini untuk menambah node rumah', canvas.width / 2, canvas.height / 2);
  ctx.font = '12px IBM Plex Mono, monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fillText('atau gunakan tombol Random di sidebar', canvas.width / 2, canvas.height / 2 + 28);
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
  ctx.fillStyle = 'rgba(13,17,23,0.75)';
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
  let strokeColor = '#0d1117';

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
    ctx.fillStyle    = isISP ? '#F59E0B' : 'rgba(255,255,255,0.55)';
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
  if (isPanning) return;
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
      showModeBar(`ISP Center dipindahkan ke Node ${nearest}`);
    } else {
      // Tambah node baru sebagai ISP
      const id = graph.addNode(x, y);
      ispIndex  = id;
      showModeBar(`ISP Center baru ditambahkan sebagai Node ${id}`);
    }
    settingISP = false;
    document.getElementById('btn-set-isp').textContent = '📡 Klik Ulang ISP Center';
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
  showModeBar(`Node H${id} ditambahkan (${x.toFixed(0)}, ${y.toFixed(0)})`);
  draw();
});

// Middle-click atau Alt+click untuk pan
canvas.addEventListener('mousedown', e => {
  if (e.button === 1 || (e.button === 0 && e.altKey)) {
    isPanning = true;
    panStart  = { x: e.clientX - panX, y: e.clientY - panY };
    canvas.style.cursor = 'grab';
  }
});
canvas.addEventListener('mousemove', e => {
  if (!isPanning) return;
  panX = e.clientX - panStart.x;
  panY = e.clientY - panStart.y;
  draw();
});
canvas.addEventListener('mouseup', () => {
  isPanning = false;
  canvas.style.cursor = settingISP ? 'cell' : 'crosshair';
});
canvas.addEventListener('mouseleave', () => { isPanning = false; });

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
  showModeBar(`${n} node ditambahkan. Total: ${graph.nodeCount}`);
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
  showModeBar(`Node H${id} ditambahkan manual (${x}, ${y})`);
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
  updateDijkstraSelect();
  updateHeaderStats();
  showModeBar('Canvas dikosongkan.');
  draw();
}

// ============================================================
//  ALGORITMA
// ============================================================
function runAlgo(name) {
  if (graph.nodeCount < 2) {
    showModeBar('⚠ Perlu minimal 2 node!');
    return;
  }

  const start = ispIndex >= 0 ? ispIndex : 0;

  if (name === 'kruskal') {
    kruskalRes = kruskal(graph);
    updateResultRow('k', kruskalRes);
    document.getElementById('btn-kruskal').classList.add('active');
  } else if (name === 'prim') {
    primRes = prim(graph, start);
    updateResultRow('p', primRes);
    document.getElementById('btn-prim').classList.add('active');
  } else if (name === 'dijkstra') {
    const tgt = parseInt(document.getElementById('dijkstra-target').value);
    dijkstraRes = dijkstra(graph, start, tgt);
    updateResultRow('d', dijkstraRes);
    document.getElementById('btn-dijkstra').classList.add('active');
  }

  draw();
}

function runAll() {
  if (graph.nodeCount < 2) {
    showModeBar('⚠ Perlu minimal 2 node!');
    return;
  }
  runAlgo('kruskal');
  runAlgo('prim');
  runAlgo('dijkstra');
}

function updateResultRow(prefix, result) {
  document.getElementById(`r-${prefix}len`).textContent  = result.totalWeight.toFixed(1) + 'm';
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
  sel.innerHTML = '<option value="-1">Auto (node terjauh)</option>';

  for (let i = 0; i < graph.nodeCount; i++) {
    if (i === ispIndex) continue;
    const opt   = document.createElement('option');
    opt.value   = i;
    const n     = graph.nodes[i];
    opt.textContent = `Node H${i}  (${n.x.toFixed(0)}, ${n.y.toFixed(0)})`;
    sel.appendChild(opt);
  }

  if (prev && prev !== '-1') sel.value = prev;
}

function showModeBar(msg) {
  document.getElementById('mode-bar').textContent = msg;
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
    btn.textContent = '✕ Batal Set ISP';
    canvas.style.cursor = 'cell';
    showModeBar('Klik node yang ingin dijadikan ISP Center...');
  } else {
    btn.textContent = '📡 Klik Ulang ISP Center';
    canvas.style.cursor = 'crosshair';
    showModeBar('Mode normal.');
  }
});

// ============================================================
//  LAYER CHECKBOXES — redraw on change
// ============================================================
function redraw() { draw(); }

// ============================================================
//  INIT
// ============================================================
showModeBar('Klik canvas untuk menambah node rumah, atau gunakan tombol Random.');

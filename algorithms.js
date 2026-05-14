/**
 * algorithms.js — Implementasi Algoritma Graf
 *
 * 1. Kruskal  — MST dengan Union-Find (Disjoint Set Union)
 * 2. Prim     — MST dengan Priority Queue (Min-Heap sederhana)
 * 3. Dijkstra — Shortest Path dengan Priority Queue
 *
 * Semua fungsi menerima objek Graph dan mengembalikan:
 *   { edges, totalWeight, timeMs }
 */

// ============================================================
//  UNION-FIND  (untuk Kruskal)
// ============================================================
class UnionFind {
  constructor(n) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank   = new Array(n).fill(0);
  }

  find(x) {
    // Path compression
    if (this.parent[x] !== x)
      this.parent[x] = this.find(this.parent[x]);
    return this.parent[x];
  }

  union(x, y) {
    const px = this.find(x), py = this.find(y);
    if (px === py) return false; // sudah satu komponen

    // Union by rank
    if (this.rank[px] < this.rank[py])      this.parent[px] = py;
    else if (this.rank[px] > this.rank[py]) this.parent[py] = px;
    else { this.parent[py] = px; this.rank[px]++; }

    return true;
  }
}

// ============================================================
//  MIN-HEAP  (sederhana, untuk Prim & Dijkstra)
// ============================================================
class MinHeap {
  constructor() { this.data = []; }

  push(item) {
    this.data.push(item);
    this._bubbleUp(this.data.length - 1);
  }

  pop() {
    const top = this.data[0];
    const last = this.data.pop();
    if (this.data.length > 0) {
      this.data[0] = last;
      this._siftDown(0);
    }
    return top;
  }

  get size() { return this.data.length; }

  _bubbleUp(i) {
    while (i > 0) {
      const p = Math.floor((i - 1) / 2);
      if (this.data[p].key <= this.data[i].key) break;
      [this.data[p], this.data[i]] = [this.data[i], this.data[p]];
      i = p;
    }
  }

  _siftDown(i) {
    const n = this.data.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && this.data[l].key < this.data[smallest].key) smallest = l;
      if (r < n && this.data[r].key < this.data[smallest].key) smallest = r;
      if (smallest === i) break;
      [this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]];
      i = smallest;
    }
  }
}

// ============================================================
//  1. KRUSKAL — Minimum Spanning Tree
//
//  Kompleksitas: O(E log E) — dominan pada sorting edges
//  Union-Find   : O(E · α(V)) ≈ O(E) (hampir konstan)
//
//  Cara kerja:
//  - Sort semua edge berdasarkan bobot (terkecil duluan)
//  - Iterasi, tambahkan edge jika tidak membentuk cycle
//    (cek dengan Union-Find)
//  - Berhenti saat MST punya V-1 edge
// ============================================================
function kruskal(graph) {
  const t0 = performance.now();

  const n  = graph.nodeCount;
  const uf = new UnionFind(n);
  const mstEdges = [];
  let   total    = 0;

  for (const edge of graph.edges) {
    if (mstEdges.length === n - 1) break;

    if (uf.union(edge.u, edge.v)) {
      mstEdges.push(edge);
      total += edge.weight;
    }
  }

  return {
    edges       : mstEdges,
    totalWeight : total,
    timeMs      : performance.now() - t0,
    algorithm   : 'Kruskal',
  };
}

// ============================================================
//  2. PRIM — Minimum Spanning Tree
//
//  Kompleksitas: O(E log V) dengan Min-Heap
//
//  Cara kerja:
//  - Mulai dari ISP Center (atau node 0)
//  - Selalu pilih edge terkecil yang menghubungkan node
//    di dalam MST ke node di luar MST
//  - Gunakan Min-Heap sebagai Priority Queue
// ============================================================
function prim(graph, startIndex = 0) {
  const t0 = performance.now();

  const n      = graph.nodeCount;
  const inMST  = new Array(n).fill(false);
  const minKey = new Array(n).fill(Infinity);
  const parent = new Array(n).fill(-1);

  minKey[startIndex] = 0;
  const heap = new MinHeap();
  heap.push({ key: 0, v: startIndex });

  const mstEdges = [];
  let   total    = 0;

  while (heap.size > 0) {
    const { v: u } = heap.pop();

    if (inMST[u]) continue;
    inMST[u] = true;

    if (parent[u] !== -1) {
      const w = Graph.euclidean(graph.nodes[parent[u]], graph.nodes[u]);
      mstEdges.push(new Edge(parent[u], u, w));
      total += w;
    }

    for (let v = 0; v < n; v++) {
      if (!inMST[v]) {
        const w = Graph.euclidean(graph.nodes[u], graph.nodes[v]);
        if (w < minKey[v]) {
          minKey[v] = w;
          parent[v] = u;
          heap.push({ key: w, v });
        }
      }
    }
  }

  return {
    edges       : mstEdges,
    totalWeight : total,
    timeMs      : performance.now() - t0,
    algorithm   : 'Prim',
  };
}

// ============================================================
//  3. DIJKSTRA — Shortest Path dari ISP ke target
//
//  Kompleksitas: O(E log V) dengan Min-Heap
//
//  Cara kerja:
//  - Inisialisasi jarak semua node = Infinity, ISP = 0
//  - Gunakan Min-Heap, selalu proses node dengan jarak terkecil
//  - Update tetangga jika ditemukan jalur lebih pendek (relaxation)
//  - Setelah selesai, rekonstruksi path via array "prev"
// ============================================================
function dijkstra(graph, srcIndex, targetIndex = -1) {
  const t0 = performance.now();

  const n    = graph.nodeCount;
  const dist = new Array(n).fill(Infinity);
  const prev = new Array(n).fill(-1);
  const vis  = new Array(n).fill(false);

  dist[srcIndex] = 0;
  const heap = new MinHeap();
  heap.push({ key: 0, v: srcIndex });

  while (heap.size > 0) {
    const { v: u } = heap.pop();
    if (vis[u]) continue;
    vis[u] = true;

    for (let v = 0; v < n; v++) {
      if (!vis[v]) {
        const w     = Graph.euclidean(graph.nodes[u], graph.nodes[v]);
        const newD  = dist[u] + w;
        if (newD < dist[v]) {
          dist[v] = newD;
          prev[v] = u;
          heap.push({ key: newD, v });
        }
      }
    }
  }

  // Tentukan target: pilih node terjauh jika tidak ditentukan
  let target = targetIndex;
  if (target < 0 || target === srcIndex || target >= n) {
    target = 0;
    for (let i = 0; i < n; i++) {
      if (i !== srcIndex && dist[i] > dist[target]) target = i;
    }
  }

  // Rekonstruksi jalur terpendek
  const path = [];
  let cur = target;
  while (cur !== -1) {
    path.unshift(cur);
    cur = prev[cur];
  }

  // Buat edge dari path
  const pathEdges = [];
  for (let i = 0; i < path.length - 1; i++) {
    const w = Graph.euclidean(graph.nodes[path[i]], graph.nodes[path[i + 1]]);
    pathEdges.push(new Edge(path[i], path[i + 1], w));
  }

  const totalWeight = dist[target] === Infinity ? 0 : dist[target];

  return {
    edges       : pathEdges,
    totalWeight,
    timeMs      : performance.now() - t0,
    algorithm   : 'Dijkstra',
    path,
    target,
    allDist     : dist,
  };
}

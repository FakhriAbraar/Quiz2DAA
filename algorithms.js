// Fungsi Utilitas untuk Jeda Animasi
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

class UnionFind {
  constructor(n) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank   = new Array(n).fill(0);
  }
  find(x) {
    if (this.parent[x] !== x) this.parent[x] = this.find(this.parent[x]);
    return this.parent[x];
  }
  union(x, y) {
    const px = this.find(x), py = this.find(y);
    if (px === py) return false;
    if (this.rank[px] < this.rank[py]) this.parent[px] = py;
    else if (this.rank[px] > this.rank[py]) this.parent[py] = px;
    else { this.parent[py] = px; this.rank[px]++; }
    return true;
  }
}

class MinHeap {
  constructor() { this.data = []; }
  push(item) { this.data.push(item); this._bubbleUp(this.data.length - 1); }
  pop() {
    const top = this.data[0], last = this.data.pop();
    if (this.data.length > 0) { this.data[0] = last; this._siftDown(0); }
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

// 1. KRUSKAL (Async)
async function kruskal(graph, delayMs = 0, onStep = null) {
  const t0 = performance.now();
  const n  = graph.nodeCount;
  const uf = new UnionFind(n);
  const mstEdges = [];
  let   total    = 0;

  for (const edge of graph.edges) {
    if (mstEdges.length === n - 1) break;

    if (delayMs > 0 && onStep) {
      await onStep({ edge, type: 'eval' });
      await sleep(delayMs);
    }

    if (uf.union(edge.u, edge.v)) {
      mstEdges.push(edge);
      total += edge.weight;
      if (delayMs > 0 && onStep) {
        await onStep({ edge, type: 'add' });
        await sleep(delayMs);
      }
    }
  }
  if (delayMs > 0 && onStep) await onStep({ type: 'done' });

  return { edges: mstEdges, totalWeight: total, timeMs: performance.now() - t0, algorithm: 'Kruskal' };
}

// 2. PRIM (Async)
async function prim(graph, startIndex = 0, delayMs = 0, onStep = null) {
  const t0 = performance.now();
  const n = graph.nodeCount;
  const inMST = new Array(n).fill(false);
  const minKey = new Array(n).fill(Infinity);
  const parent = new Array(n).fill(-1);

  minKey[startIndex] = 0;
  const heap = new MinHeap();
  heap.push({ key: 0, v: startIndex });

  const mstEdges = [];
  let total = 0;

  while (heap.size > 0) {
    const { v: u } = heap.pop();
    if (inMST[u]) continue;
    inMST[u] = true;

    if (delayMs > 0 && onStep) {
      await onStep({ node: u, type: 'visit' });
      await sleep(delayMs);
    }

    if (parent[u] !== -1) {
      const w = graph.getWeight(graph.nodes[parent[u]], graph.nodes[u]);
      const newEdge = new Edge(parent[u], u, w);
      mstEdges.push(newEdge);
      total += w;
      if (delayMs > 0 && onStep) {
        await onStep({ edge: newEdge, type: 'add' });
        await sleep(delayMs);
      }
    }

    for (let v = 0; v < n; v++) {
      if (!inMST[v]) {
        const w = graph.getWeight(graph.nodes[u], graph.nodes[v]);
        if (delayMs > 0 && onStep) {
          await onStep({ edge: new Edge(u, v, w), type: 'eval' });
          await sleep(delayMs / 2);
        }
        if (w < minKey[v]) {
          minKey[v] = w;
          parent[v] = u;
          heap.push({ key: w, v });
        }
      }
    }
  }
  if (delayMs > 0 && onStep) await onStep({ type: 'done' });

  return { edges: mstEdges, totalWeight: total, timeMs: performance.now() - t0, algorithm: 'Prim' };
}

// 3. DIJKSTRA ON MST (Async)
async function dijkstraOnMST(mstEdges, nodes, srcIndex, targetIndex = -1, delayMs = 0, onStep = null) {
  const t0 = performance.now();
  const n  = nodes.length;

  const adj = Array.from({ length: n }, () => []);
  for (const e of mstEdges) {
    adj[e.u].push({ v: e.v, w: e.weight });
    adj[e.v].push({ v: e.u, w: e.weight });
  }

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

    if (delayMs > 0 && onStep) {
      await onStep({ node: u, type: 'visit' });
      await sleep(delayMs);
    }

    for (const { v, w } of adj[u]) {
      if (!vis[v]) {
        if (delayMs > 0 && onStep) {
          await onStep({ edge: new Edge(u, v, w), type: 'eval' });
          await sleep(delayMs / 2);
        }
        const newD = dist[u] + w;
        if (newD < dist[v]) {
          dist[v] = newD;
          prev[v] = u;
          heap.push({ key: newD, v });
        }
      }
    }
  }

  let target = targetIndex;
  if (target < 0 || target === srcIndex || target >= n || dist[target] === Infinity) {
    target = -1;
    let maxD = -1;
    for (let i = 0; i < n; i++) {
      if (i !== srcIndex && dist[i] !== Infinity && dist[i] > maxD) {
        maxD = dist[i];
        target = i;
      }
    }
    if (target < 0) target = srcIndex;
  }

  const path = [];
  let cur = target;
  while (cur !== -1) { path.unshift(cur); cur = prev[cur]; }

  const pathEdges = [];
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1];
    const mstEdge = mstEdges.find(e => (e.u === a && e.v === b) || (e.u === b && e.v === a));
    const w = mstEdge ? mstEdge.weight : Graph.euclidean(nodes[a], nodes[b]);
    pathEdges.push(new Edge(a, b, w));
  }

  if (delayMs > 0 && onStep) await onStep({ type: 'done' });

  return { edges: pathEdges, totalWeight: dist[target] === Infinity ? 0 : dist[target], timeMs: performance.now() - t0, algorithm: 'Dijkstra', path, target, allDist: dist };
}
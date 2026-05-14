/**
 * graph.js — Struktur Data Graf
 * Node, Edge, dan Graph class
 */

// ============================================================
// Node — merepresentasikan satu rumah atau ISP center
// ============================================================
class Node {
  constructor(id, x, y) {
    this.id = id;   // index unik
    this.x  = x;    // koordinat X (meter)
    this.y  = y;    // koordinat Y (meter)
  }
}

// ============================================================
// Edge — koneksi antar dua node dengan bobot (jarak Euclidean)
// ============================================================
class Edge {
  constructor(u, v, weight) {
    this.u      = u;       // index node asal
    this.v      = v;       // index node tujuan
    this.weight = weight;  // jarak dalam meter
  }
}

// ============================================================
// Graph — menyimpan semua node dan edge
// ============================================================
class Graph {
  constructor() {
    this.nodes = [];   // array of Node
    this.edges = [];   // array of Edge (semua pasangan, dense)
  }

  // Tambah node baru, kembalikan index
  addNode(x, y) {
    const id = this.nodes.length;
    this.nodes.push(new Node(id, x, y));
    this._rebuildEdges();
    return id;
  }

  // Hapus semua node dan edge
  clear() {
    this.nodes = [];
    this.edges = [];
  }

  // Euclidean distance antara dua node
  static euclidean(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }

  // Bangun ulang semua edge (dense graph — setiap node terhubung ke semua)
  _rebuildEdges() {
    this.edges = [];
    const n = this.nodes.length;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const w = Graph.euclidean(this.nodes[i], this.nodes[j]);
        this.edges.push(new Edge(i, j, w));
      }
    }
    // Urutkan edge berdasarkan bobot (diperlukan Kruskal)
    this.edges.sort((a, b) => a.weight - b.weight);
  }

  get nodeCount() { return this.nodes.length; }
  get edgeCount()  { return this.edges.length; }
}

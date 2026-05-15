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
// Obstacle — merepresentasikan area rintangan (danau/bukit)
// ============================================================
class Obstacle {
  constructor(x, y, radius, penaltyFactor = 2.0) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    // Jika kabel lewat sini, bobotnya dikali penaltyFactor (misal 2.0 = 2x lipat lebih panjang/mahal)
    this.penaltyFactor = penaltyFactor; 
  }
}

// ============================================================
// Graph — menyimpan semua node dan edge
// ============================================================
class Graph {
  constructor() {
    this.nodes = [];   
    this.edges = [];   
    // Kita tambahkan 1 rintangan statis di tengah canvas sebagai default untuk uji coba
    this.obstacles = []; 
  }

  addNode(x, y) {
    const id = this.nodes.length;
    this.nodes.push(new Node(id, x, y));
    this._rebuildEdges();
    return id;
  }

  clear() {
    this.nodes = [];
    this.edges = [];
    this.obstacles = [];
  }

  static euclidean(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }

  // Matematika Geometri: Cek perpotongan garis dan lingkaran
  static checkLineCircleIntersect(x1, y1, x2, y2, cx, cy, r) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const a = dx * dx + dy * dy;
    const b = 2 * (dx * (x1 - cx) + dy * (y1 - cy));
    const c = (x1 - cx) * (x1 - cx) + (y1 - cy) * (y1 - cy) - r * r;
    const det = b * b - 4 * a * c; // Determinan persamaan kuadrat
    
    if (det > 0) {
      const t1 = (-b + Math.sqrt(det)) / (2 * a);
      const t2 = (-b - Math.sqrt(det)) / (2 * a);
      // Jika titik potong berada pada rentang garis (0 <= t <= 1)
      if ((t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1)) return true;
    }
    return false;
  }

  // Hitung bobot baru dengan memperhitungkan penalti rintangan
  getWeight(a, b) {
    let baseDist = Graph.euclidean(a, b);
    for (const obs of this.obstacles) {
      if (Graph.checkLineCircleIntersect(a.x, a.y, b.x, b.y, obs.x, obs.y, obs.radius)) {
        baseDist *= obs.penaltyFactor; 
        break; // Terapkan penalti jika memotong rintangan
      }
    }
    return baseDist;
  }

  _rebuildEdges() {
    this.edges = [];
    const n = this.nodes.length;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        // GANTI Math euclidean murni dengan this.getWeight()
        const w = this.getWeight(this.nodes[i], this.nodes[j]);
        this.edges.push(new Edge(i, j, w));
      }
    }
    this.edges.sort((a, b) => a.weight - b.weight);
  }

  get nodeCount() { return this.nodes.length; }
  get edgeCount() { return this.edges.length; }
}
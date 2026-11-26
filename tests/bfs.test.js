const test = require("node:test");
const assert = require("node:assert/strict");
const BFSSolver = require("../js/bfs.js");
const MazeGenerator = require("../js/maze.js");
const { dijkstra } = require("./reference.js");

const open = (rows, cols) => Array.from({ length: rows }, () => new Array(cols).fill(0));

test("grid kosong: jarak BFS = jarak Manhattan", () => {
  const g = open(8, 12);
  const res = BFSSolver.solve(g, { r: 0, c: 0 }, { r: 7, c: 11 });
  assert.equal(res.found, true);
  assert.equal(res.distance, 7 + 11);
  assert.equal(res.path.length, res.distance + 1);
});

test("start sama dengan goal: jarak 0", () => {
  const g = open(3, 3);
  const res = BFSSolver.solve(g, { r: 1, c: 1 }, { r: 1, c: 1 });
  assert.equal(res.found, true);
  assert.equal(res.distance, 0);
  assert.deepEqual(res.path, [{ r: 1, c: 1 }]);
});

test("tembok memaksa jalan memutar", () => {
  const g = [
    [0, 0, 1],
    [1, 0, 1],
    [0, 0, 0],
  ];
  const res = BFSSolver.solve(g, { r: 0, c: 0 }, { r: 2, c: 2 });
  assert.equal(res.found, true);
  assert.equal(res.distance, 4);
});

test("goal terkurung tembok: tidak ada jalan", () => {
  const g = [
    [0, 0, 0],
    [0, 1, 1],
    [0, 1, 0],
  ];
  const res = BFSSolver.solve(g, { r: 0, c: 0 }, { r: 2, c: 2 });
  assert.equal(res.found, false);
  assert.equal(res.distance, -1);
  assert.deepEqual(res.path, []);
});

test("start atau goal berada di tembok / di luar grid: tidak ada jalan", () => {
  const g = [
    [0, 1],
    [0, 0],
  ];
  assert.equal(BFSSolver.solve(g, { r: 0, c: 1 }, { r: 1, c: 1 }).found, false);
  assert.equal(BFSSolver.solve(g, { r: 0, c: 0 }, { r: 0, c: 1 }).found, false);
  assert.equal(BFSSolver.solve(g, { r: -1, c: 0 }, { r: 1, c: 1 }).found, false);
  assert.equal(BFSSolver.solve(g, { r: 0, c: 0 }, { r: 5, c: 5 }).found, false);
});

test("path valid: berurutan, bersebelahan, tidak menembus tembok", () => {
  for (let seed = 1; seed <= 100; seed++) {
    const m = MazeGenerator.generate({ rows: 15, cols: 15, density: 0.28, seed });
    const { path } = m.solution;
    assert.deepEqual(path[0], m.start);
    assert.deepEqual(path[path.length - 1], m.goal);
    for (let i = 0; i < path.length; i++) {
      assert.equal(m.grid[path[i].r][path[i].c], 0, "path menembus tembok");
      if (i > 0) {
        const d = Math.abs(path[i].r - path[i - 1].r) + Math.abs(path[i].c - path[i - 1].c);
        assert.equal(d, 1, "langkah tidak bersebelahan");
      }
    }
  }
});

test("BFS = Dijkstra (referensi independen) pada 1000 labirin acak", () => {
  const configs = [
    { rows: 10, cols: 10, density: 0.22 },
    { rows: 15, cols: 15, density: 0.28 },
    { rows: 22, cols: 22, density: 0.32 },
  ];
  let checked = 0;
  for (const cfg of configs) {
    for (let seed = 1; seed <= 340; seed++) {
      const m = MazeGenerator.generate({ ...cfg, seed });
      const ref = dijkstra(m.grid, m.start, m.goal);
      assert.equal(m.solution.distance, ref, "BFS tidak sama dengan Dijkstra (seed " + seed + ")");
      checked++;
    }
  }
  assert.ok(checked >= 1000);
});

test("BFS tetap benar di grid acak mentah (termasuk yang tidak punya jalan)", () => {
  const rng = MazeGenerator.createRng(2024);
  let unreachable = 0;
  for (let i = 0; i < 500; i++) {
    const rows = 5 + Math.floor(rng() * 10);
    const cols = 5 + Math.floor(rng() * 10);
    const g = Array.from({ length: rows }, () => Array.from({ length: cols }, () => (rng() < 0.4 ? 1 : 0)));
    const s = { r: 0, c: 0 };
    const t = { r: rows - 1, c: cols - 1 };
    g[s.r][s.c] = 0;
    g[t.r][t.c] = 0;
    const res = BFSSolver.solve(g, s, t);
    const ref = dijkstra(g, s, t);
    assert.equal(res.distance, ref);
    if (!res.found) unreachable++;
  }
  assert.ok(unreachable > 0, "test seharusnya mencakup kasus tanpa jalan");
});

test("generator: seed sama menghasilkan labirin sama", () => {
  const a = MazeGenerator.generate({ rows: 12, cols: 12, density: 0.28, seed: 77 });
  const b = MazeGenerator.generate({ rows: 12, cols: 12, density: 0.28, seed: 77 });
  assert.deepEqual(a.grid, b.grid);
  assert.deepEqual(a.start, b.start);
  assert.deepEqual(a.goal, b.goal);
});

test("generator: S di sisi kiri, G di sisi kanan, keduanya petak kosong", () => {
  for (let seed = 1; seed <= 200; seed++) {
    const m = MazeGenerator.generate({ rows: 15, cols: 15, density: 0.28, seed });
    assert.equal(m.grid[m.start.r][m.start.c], 0);
    assert.equal(m.grid[m.goal.r][m.goal.c], 0);
    assert.ok(m.start.c < 15 * 0.25);
    assert.ok(m.goal.c >= 15 * 0.75);
    assert.equal(m.solution.found, true);
  }
});

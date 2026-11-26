const fs = require("fs");
const path = require("path");
const BFSSolver = require("../js/bfs.js");
const MazeGenerator = require("../js/maze.js");
const { dijkstra, dfs } = require("./reference.js");

const CONFIGS = [
  { name: "Easy", rows: 10, cols: 10, density: 0.22 },
  { name: "Medium", rows: 15, cols: 15, density: 0.28 },
  { name: "Hard", rows: 22, cols: 22, density: 0.32 },
  { name: "Uji besar 50x50", rows: 50, cols: 50, density: 0.3 },
  { name: "Uji besar 100x100", rows: 100, cols: 100, density: 0.3 },
];
const N = 1000;
const REPEAT = 20;

const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const max = (a) => a.reduce((x, y) => Math.max(x, y), -Infinity);

const rows = [];
for (const cfg of CONFIGS) {
  const attempts = [];
  const dist = [];
  const visited = [];
  const openRatio = [];
  const timesMs = [];
  const dfsDist = [];
  const dfsVisited = [];
  let mismatch = 0;
  let metMinSteps = 0;

  for (let seed = 1; seed <= N; seed++) {
    const m = MazeGenerator.generate({ rows: cfg.rows, cols: cfg.cols, density: cfg.density, seed });
    attempts.push(m.attempts);
    dist.push(m.solution.distance);
    visited.push(m.solution.visitedCount);
    let open = 0;
    for (const row of m.grid) for (const v of row) if (v === 0) open++;
    openRatio.push((m.solution.visitedCount / open) * 100);

    if (m.solution.distance >= Math.floor((cfg.rows + cfg.cols) * 0.7)) metMinSteps++;
    if (dijkstra(m.grid, m.start, m.goal) !== m.solution.distance) mismatch++;

    const d = dfs(m.grid, m.start, m.goal);
    dfsDist.push(d.distance);
    dfsVisited.push(d.visited);

    const t0 = process.hrtime.bigint();
    for (let k = 0; k < REPEAT; k++) BFSSolver.solve(m.grid, m.start, m.goal);
    const t1 = process.hrtime.bigint();
    timesMs.push(Number(t1 - t0) / 1e6 / REPEAT);
  }

  const dfsOverhead = mean(dfsDist.map((x, i) => (x / dist[i] - 1) * 100));
  const dfsNotOptimal = dfsDist.filter((x, i) => x !== dist[i]).length;

  rows.push({
    name: cfg.name,
    size: cfg.rows + "x" + cfg.cols,
    density: cfg.density,
    mazes: N,
    avgAttempts: +mean(attempts).toFixed(2),
    maxAttempts: max(attempts),
    metMinStepsPct: +((metMinSteps / N) * 100).toFixed(1),
    avgShortest: +mean(dist).toFixed(1),
    avgVisited: +mean(visited).toFixed(1),
    avgVisitedPct: +mean(openRatio).toFixed(1),
    avgTimeMs: +mean(timesMs).toFixed(4),
    maxTimeMs: +max(timesMs).toFixed(4),
    mismatchVsDijkstra: mismatch,
    dfsAvgLen: +mean(dfsDist).toFixed(1),
    dfsLongerPct: +((dfsNotOptimal / N) * 100).toFixed(1),
    dfsAvgOverheadPct: +dfsOverhead.toFixed(1),
    dfsAvgVisited: +mean(dfsVisited).toFixed(1),
  });
}

console.table(rows);

const outDir = path.join(__dirname, "..", "report");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "evaluation.json"), JSON.stringify({ node: process.version, N, REPEAT, rows }, null, 2));
console.log("Tersimpan: report/evaluation.json");

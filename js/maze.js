(function (root, factory) {
  const solver = typeof module === "object" && module.exports ? require("./bfs.js") : root.BFSSolver;
  const api = factory(solver);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.MazeGenerator = api;
})(typeof self !== "undefined" ? self : this, function (BFSSolver) {
  "use strict";

  function createRng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randomInt(rng, n) {
    return Math.floor(rng() * n);
  }

  function pickOpenCell(grid, rng, colFrom, colTo) {
    const candidates = [];
    for (let r = 0; r < grid.length; r++) {
      for (let c = colFrom; c < colTo; c++) {
        if (grid[r][c] === 0) candidates.push({ r, c });
      }
    }
    if (candidates.length === 0) return null;
    return candidates[randomInt(rng, candidates.length)];
  }

  function generate(opts) {
    const rows = opts.rows;
    const cols = opts.cols;
    const density = opts.density !== undefined ? opts.density : 0.28;
    const seed = opts.seed !== undefined ? opts.seed >>> 0 : (Math.random() * 4294967296) >>> 0;
    const minSteps = opts.minSteps !== undefined ? opts.minSteps : Math.floor((rows + cols) * 0.7);
    const maxAttempts = opts.maxAttempts || 500;
    const rng = createRng(seed);

    let best = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const grid = [];
      for (let r = 0; r < rows; r++) {
        const row = new Array(cols);
        for (let c = 0; c < cols; c++) row[c] = rng() < density ? 1 : 0;
        grid.push(row);
      }

      const zone = Math.max(1, Math.floor(cols * 0.25));
      const start = pickOpenCell(grid, rng, 0, zone);
      const goal = pickOpenCell(grid, rng, cols - zone, cols);
      if (!start || !goal) continue;

      const solution = BFSSolver.solve(grid, start, goal);
      if (!solution.found) continue;

      const candidate = { grid, start, goal, solution, attempts: attempt, seed, rows, cols };
      if (!best || solution.distance > best.solution.distance) best = candidate;

      if (solution.distance >= minSteps) return candidate;
    }

    if (best) return best;

    const grid = Array.from({ length: rows }, () => new Array(cols).fill(0));
    const start = { r: 0, c: 0 };
    const goal = { r: rows - 1, c: cols - 1 };
    return { grid, start, goal, solution: BFSSolver.solve(grid, start, goal), attempts: maxAttempts, seed, rows, cols };
  }

  return { generate, createRng };
});

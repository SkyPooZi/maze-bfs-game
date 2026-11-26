(function (root, factory) {
  const isNode = typeof module === "object" && module.exports;
  const deps = isNode
    ? { BFSSolver: require("./bfs.js"), MazeGenerator: require("./maze.js") }
    : { BFSSolver: root.BFSSolver, MazeGenerator: root.MazeGenerator };
  const api = factory(deps.BFSSolver, deps.MazeGenerator);
  if (isNode) module.exports = api;
  else root.GameEngine = api;
})(typeof self !== "undefined" ? self : this, function (BFSSolver, MazeGenerator) {
  "use strict";

  const DIFFICULTIES = {
    easy: { label: "Easy", rows: 10, cols: 10, density: 0.22 },
    medium: { label: "Medium", rows: 15, cols: 15, density: 0.28 },
    hard: { label: "Hard", rows: 22, cols: 22, density: 0.32 },
  };

  const MOVES = {
    up: [-1, 0],
    down: [1, 0],
    left: [0, -1],
    right: [0, 1],
  };

  const BEST_KEY = "mazeRunner.best.";

  function loadBest(difficulty) {
    try {
      const raw = localStorage.getItem(BEST_KEY + difficulty);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function isBetter(a, b) {
    if (!b) return true;
    if (a.efficiency !== b.efficiency) return a.efficiency > b.efficiency;
    return a.timeMs < b.timeMs;
  }

  function saveBest(difficulty, record) {
    try {
      localStorage.setItem(BEST_KEY + difficulty, JSON.stringify(record));
    } catch (e) {
    }
  }

  function starsFor(efficiency) {
    if (efficiency >= 90) return 3;
    if (efficiency >= 70) return 2;
    return 1;
  }

  class Game {
    constructor(opts) {
      this.now = (opts && opts.now) || (() => (typeof performance !== "undefined" ? performance.now() : Date.now()));
      this.seed = opts && opts.seed;
      this.difficulty = "medium";
      this.maze = null;
      this.state = "idle";
    }

    newGame(difficulty) {
      if (difficulty) this.difficulty = difficulty;
      const cfg = DIFFICULTIES[this.difficulty];
      this.maze = MazeGenerator.generate({
        rows: cfg.rows,
        cols: cfg.cols,
        density: cfg.density,
        seed: this.seed,
      });
      this._resetRun();
      return this.maze;
    }

    useMaze(maze) {
      this.maze = maze;
      this._resetRun();
      return maze;
    }

    restart() {
      this._resetRun();
    }

    _resetRun() {
      this.player = { r: this.maze.start.r, c: this.maze.start.c };
      this.playerPath = [{ r: this.player.r, c: this.player.c }];
      this.steps = 0;
      this.startTime = null;
      this.endTime = null;
      this.result = null;
      this.state = "idle";
    }

    get grid() {
      return this.maze.grid;
    }

    get elapsedMs() {
      if (this.startTime === null) return 0;
      return (this.endTime !== null ? this.endTime : this.now()) - this.startTime;
    }

    move(dir) {
      if (this.state === "finished") return { moved: false, reason: "finished", finished: true };
      const d = MOVES[dir];
      if (!d) return { moved: false, finished: false };

      const nr = this.player.r + d[0];
      const nc = this.player.c + d[1];
      const rows = this.maze.rows;
      const cols = this.maze.cols;

      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) return { moved: false, reason: "bounds", finished: false };
      if (this.grid[nr][nc] === 1) return { moved: false, reason: "wall", finished: false };

      if (this.state === "idle") {
        this.state = "playing";
        this.startTime = this.now();
      }

      this.player = { r: nr, c: nc };
      this.playerPath.push({ r: nr, c: nc });
      this.steps++;

      if (nr === this.maze.goal.r && nc === this.maze.goal.c) {
        this._finish();
        return { moved: true, finished: true };
      }
      return { moved: true, finished: false };
    }

    _finish() {
      this.state = "finished";
      this.endTime = this.now();

      const bfs = BFSSolver.solve(this.grid, this.maze.start, this.maze.goal);
      const optimal = bfs.distance;
      const efficiency = Math.round((optimal / this.steps) * 1000) / 10;
      const record = { steps: this.steps, timeMs: this.elapsedMs, efficiency };

      const previousBest = loadBest(this.difficulty);
      const newBest = isBetter(record, previousBest);
      if (newBest) saveBest(this.difficulty, record);

      this.result = {
        steps: this.steps,
        optimalSteps: optimal,
        efficiency,
        stars: starsFor(efficiency),
        isOptimal: this.steps === optimal,
        timeMs: this.elapsedMs,
        playerPath: this.playerPath,
        bfsPath: bfs.path,
        visitedOrder: bfs.visitedOrder,
        visitedCount: bfs.visitedCount,
        newBest,
        previousBest,
      };
      return this.result;
    }
  }

  function formatTime(ms) {
    const total = Math.floor(ms / 100) / 10;
    const m = Math.floor(total / 60);
    const s = (total - m * 60).toFixed(1);
    return (m > 0 ? m + ":" : "") + (m > 0 && Number(s) < 10 ? "0" : "") + s + (m > 0 ? "" : " s");
  }

  return { Game, DIFFICULTIES, MOVES, loadBest, formatTime, starsFor };
});

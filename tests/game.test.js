const test = require("node:test");
const assert = require("node:assert/strict");

function installFakeStorage() {
  const store = new Map();
  global.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
  return store;
}

const { Game, DIFFICULTIES, loadBest, formatTime, starsFor } = require("../js/game.js");

const FIXTURE = () => ({
  grid: [
    [0, 0, 1],
    [1, 0, 1],
    [1, 0, 0],
  ],
  start: { r: 0, c: 0 },
  goal: { r: 2, c: 2 },
  rows: 3,
  cols: 3,
  seed: 1,
});

function newFixtureGame() {
  let t = 0;
  const game = new Game({ now: () => (t += 500) });
  game.useMaze(FIXTURE());
  return game;
}

test("pemain mulai di S dengan 0 langkah", () => {
  installFakeStorage();
  const g = newFixtureGame();
  assert.deepEqual(g.player, { r: 0, c: 0 });
  assert.equal(g.steps, 0);
  assert.equal(g.state, "idle");
  assert.equal(g.elapsedMs, 0);
});

test("menabrak tembok tidak menambah langkah dan tidak memulai timer", () => {
  installFakeStorage();
  const g = newFixtureGame();
  const res = g.move("down");
  assert.equal(res.moved, false);
  assert.equal(res.reason, "wall");
  assert.equal(g.steps, 0);
  assert.equal(g.state, "idle");
});

test("keluar dari batas grid ditolak", () => {
  installFakeStorage();
  const g = newFixtureGame();
  assert.equal(g.move("up").reason, "bounds");
  assert.equal(g.move("left").reason, "bounds");
  assert.equal(g.steps, 0);
});

test("gerakan valid menambah langkah dan mencatat jalur", () => {
  installFakeStorage();
  const g = newFixtureGame();
  assert.equal(g.move("right").moved, true);
  assert.equal(g.state, "playing");
  assert.equal(g.steps, 1);
  assert.deepEqual(g.player, { r: 0, c: 1 });
  assert.equal(g.playerPath.length, 2);
});

test("sampai di G: game selesai dan BFS dihitung", () => {
  installFakeStorage();
  const g = newFixtureGame();
  g.move("right");
  g.move("down");
  const last = g.move("down");
  assert.equal(last.finished, false);
  const fin = g.move("right");
  assert.equal(fin.finished, true);
  assert.equal(g.state, "finished");
  assert.equal(g.result.steps, 4);
  assert.equal(g.result.optimalSteps, 4);
  assert.equal(g.result.efficiency, 100);
  assert.equal(g.result.isOptimal, true);
  assert.equal(g.result.stars, 3);
  assert.equal(g.result.bfsPath.length, 5);
});

test("setelah selesai, input berikutnya diabaikan", () => {
  installFakeStorage();
  const g = newFixtureGame();
  ["right", "down", "down", "right"].forEach((d) => g.move(d));
  const res = g.move("left");
  assert.equal(res.moved, false);
  assert.equal(g.steps, 4);
});

test("jalur berputar-putar menurunkan efisiensi", () => {
  installFakeStorage();
  const g = newFixtureGame();
  ["right", "left", "right", "down", "down", "right"].forEach((d) => g.move(d));
  assert.equal(g.state, "finished");
  assert.equal(g.result.steps, 6);
  assert.equal(g.result.optimalSteps, 4);
  assert.equal(g.result.efficiency, 66.7);
  assert.equal(g.result.isOptimal, false);
  assert.equal(g.result.stars, 1);
});

test("restart mengembalikan pemain ke S tanpa mengganti labirin", () => {
  installFakeStorage();
  const g = newFixtureGame();
  g.move("right");
  g.restart();
  assert.deepEqual(g.player, { r: 0, c: 0 });
  assert.equal(g.steps, 0);
  assert.equal(g.state, "idle");
  assert.equal(g.maze.grid[0][1], 0);
});

test("rekor tersimpan, lalu hanya diganti kalau lebih baik", () => {
  installFakeStorage();
  const g = newFixtureGame();
  g.difficulty = "easy";
  ["right", "down", "down", "right"].forEach((d) => g.move(d));
  assert.equal(g.result.newBest, true);
  assert.equal(loadBest("easy").efficiency, 100);

  g.restart();
  ["right", "left", "right", "down", "down", "right"].forEach((d) => g.move(d));
  assert.equal(g.result.newBest, false);
  assert.equal(loadBest("easy").efficiency, 100);
});

test("newGame membuat labirin sesuai tingkat kesulitan", () => {
  installFakeStorage();
  for (const key of Object.keys(DIFFICULTIES)) {
    const g = new Game();
    const m = g.newGame(key);
    assert.equal(m.rows, DIFFICULTIES[key].rows);
    assert.equal(m.cols, DIFFICULTIES[key].cols);
    assert.equal(m.solution.found, true);
  }
});

test("pemain bisa menyelesaikan labirin acak dengan mengikuti jalur BFS", () => {
  installFakeStorage();
  const dirOf = (a, b) => (b.r < a.r ? "up" : b.r > a.r ? "down" : b.c < a.c ? "left" : "right");
  for (let seed = 1; seed <= 50; seed++) {
    const g = new Game({ seed });
    g.newGame("medium");
    const path = g.maze.solution.path;
    for (let i = 1; i < path.length; i++) g.move(dirOf(path[i - 1], path[i]));
    assert.equal(g.state, "finished");
    assert.equal(g.result.efficiency, 100);
  }
});

test("starsFor dan formatTime", () => {
  assert.equal(starsFor(100), 3);
  assert.equal(starsFor(90), 3);
  assert.equal(starsFor(89.9), 2);
  assert.equal(starsFor(70), 2);
  assert.equal(starsFor(69.9), 1);
  assert.equal(formatTime(12345), "12.3 s");
  assert.equal(formatTime(65400), "1:05.4");
});

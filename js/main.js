(function () {
  "use strict";

  const { Game, DIFFICULTIES, loadBest, formatTime } = window.GameEngine;
  const $ = (id) => document.getElementById(id);

  const game = new Game();
  const renderer = new window.Renderer($("board"));
  renderer.start();

  let hudTimer = null;
  let resultTimer = null;
  let starTimers = [];

  function showScreen(name) {
    $("screen-menu").classList.toggle("active", name === "menu");
    $("screen-game").classList.toggle("active", name === "game");
  }

  function showPanel(name) {
    $("panel-play").hidden = name !== "play";
    $("panel-result").hidden = name !== "result";
  }

  function bestText(diff) {
    const b = loadBest(diff);
    return b ? b.efficiency + "% · " + formatTime(b.timeMs) : null;
  }

  function refreshMenuBest() {
    for (const diff of Object.keys(DIFFICULTIES)) {
      const t = bestText(diff);
      $("best-" + diff).textContent = t ? "Best: " + t : "No record yet";
    }
  }

  function updateHud() {
    $("hud-steps").textContent = game.steps;
    $("hud-time").textContent = (game.elapsedMs / 1000).toFixed(1);
    $("hud-best").textContent = bestText(game.difficulty) || "–";
  }

  function startHudTimer() {
    clearInterval(hudTimer);
    hudTimer = setInterval(() => {
      if (game.state === "playing") $("hud-time").textContent = (game.elapsedMs / 1000).toFixed(1);
    }, 100);
  }

  function clearPending() {
    clearTimeout(resultTimer);
    starTimers.forEach(clearTimeout);
    starTimers = [];
  }

  function beginPlay(isNewMaze) {
    clearPending();
    showScreen("game");
    showPanel("play");
    if (isNewMaze) {
      renderer.setMaze(game.maze);
    } else {
      renderer.resetRun();
    }
    $("diff-badge").textContent = DIFFICULTIES[game.difficulty].label;
    $("maze-seed").textContent = (game.maze.seed % 100000).toString().padStart(5, "0");
    updateHud();
    startHudTimer();
  }

  function startNew(diff) {
    game.newGame(diff);
    beginPlay(true);
  }

  function restartSame() {
    game.restart();
    beginPlay(false);
  }

  function handleMove(dir) {
    if (!$("screen-game").classList.contains("active")) return;
    if (game.state === "finished") return;

    const res = game.move(dir);
    if (res.moved) {
      renderer.setPlayer(game.player);
      $("hud-steps").textContent = game.steps;
      if (res.finished) onFinish();
    } else if (res.reason === "wall" || res.reason === "bounds") {
      renderer.bump(dir);
    }
  }

  function onFinish() {
    $("hud-time").textContent = (game.elapsedMs / 1000).toFixed(1);
    renderer.celebrate();
    resultTimer = setTimeout(showResult, 900);
  }

  function samePath(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i].r !== b[i].r || a[i].c !== b[i].c) return false;
    return true;
  }

  function countOpen(grid) {
    let n = 0;
    for (const row of grid) for (const v of row) if (v === 0) n++;
    return n;
  }

  function verdictFor(res) {
    if (res.isOptimal) return "Nice! Your step count matches the BFS shortest path.";
    if (res.efficiency >= 90) return "Almost perfect. Only a few steps more than BFS.";
    if (res.efficiency >= 70) return "Not bad. A few turns could have been cut short.";
    return "BFS wins this time. Replay the animation to see which path is shorter.";
  }

  function titleFor(stars) {
    return stars === 3 ? "Outstanding!" : stars === 2 ? "Well done!" : "Finished!";
  }

  const STAR_SVG =
    '<svg class="star" viewBox="0 0 24 24"><path d="M12 2.6l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.6l1.2-6.5L2.5 9.5l6.6-.9z"/></svg>';

  function renderStars(count) {
    const box = $("res-stars");
    box.innerHTML = STAR_SVG.repeat(3);
    const nodes = box.querySelectorAll(".star");
    for (let i = 0; i < count; i++) {
      starTimers.push(setTimeout(() => nodes[i].classList.add("on"), 250 + i * 280));
    }
  }

  function showResult() {
    const res = game.result;
    if (!res) return;

    showPanel("result");
    $("res-title").textContent = titleFor(res.stars);
    renderStars(res.stars);
    $("res-verdict").textContent = verdictFor(res);
    $("res-steps").textContent = res.steps;
    $("res-optimal").textContent = res.optimalSteps;
    $("res-eff").textContent = res.efficiency + "%";
    $("res-time").textContent = formatTime(res.timeMs);

    const open = countOpen(game.grid);
    let extra = "BFS checked " + res.visitedCount + " of " + open + " open cells before finding G.";
    if (res.isOptimal && !samePath(res.playerPath, res.bfsPath)) {
      extra += " Your path differs from the BFS path, but it is just as short (there can be more than one shortest path).";
    }
    if (res.newBest) extra += " New record for this difficulty!";
    $("res-extra").textContent = extra;

    renderer.setLayers({
      player: $("tog-player").checked,
      bfs: $("tog-bfs").checked,
      explore: $("tog-explore").checked,
    });
    renderer.showResult({
      playerPath: res.playerPath,
      bfsPath: res.bfsPath,
      visitedOrder: res.visitedOrder,
    });
    refreshMenuBest();
  }

  const KEYMAP = {
    ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
    w: "up", s: "down", a: "left", d: "right",
    W: "up", S: "down", A: "left", D: "right",
  };

  window.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const dir = KEYMAP[e.key];
    if (!dir) return;
    if ($("screen-game").classList.contains("active")) e.preventDefault();
    handleMove(dir);
  });

  document.querySelectorAll(".dpad-btn").forEach((btn) => {
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      handleMove(btn.dataset.dir);
    });
  });

  document.querySelectorAll(".diff-card").forEach((card) => {
    card.addEventListener("click", () => startNew(card.dataset.diff));
  });

  $("btn-restart").addEventListener("click", restartSame);
  $("btn-new").addEventListener("click", () => startNew());
  $("btn-again").addEventListener("click", () => startNew());
  $("btn-replay").addEventListener("click", () => renderer.replayBfs());

  function toMenu() {
    clearPending();
    clearInterval(hudTimer);
    refreshMenuBest();
    showScreen("menu");
  }
  $("btn-menu").addEventListener("click", toMenu);
  $("btn-menu2").addEventListener("click", toMenu);

  $("tog-player").addEventListener("change", (e) => renderer.setLayers({ player: e.target.checked }));
  $("tog-bfs").addEventListener("change", (e) => renderer.setLayers({ bfs: e.target.checked }));
  $("tog-explore").addEventListener("change", (e) => renderer.setLayers({ explore: e.target.checked }));

  refreshMenuBest();

  window.mazeDebug = { game, renderer };
})();

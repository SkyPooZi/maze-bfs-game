(function (root) {
  "use strict";

  const COLORS = {
    floorA: "#f2ead5",
    floorB: "#eee4cc",
    floorLine: "rgba(120,100,70,0.10)",
    floorMark: "rgba(232,150,135,0.30)",
    ink: "#2b2f38",
    cream: "#fff6e4",
    start: "#86d4c6",
    startEdge: "#2f8f83",
    goal: "#f7d57a",
    goalEdge: "#c28a1c",
    trail: "rgba(232,96,76,0.20)",
    playerPath: "#e8604c",
    bfsPath: "#2f8f83",
    shadow: "rgba(70,60,90,0.16)",
  };

  const WALL_SETS = [
    ["#ef8a73", "#cf6a58"],
    ["#ef8a73", "#cf6a58"],
    ["#eaaaa2", "#c98a86"],
    ["#9ec7a4", "#6f9f7c"],
    ["#bfb3dd", "#8f84b8"],
  ];

  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
      this.cell = 32;
      this.maze = null;
      this.staticLayer = document.createElement("canvas");

      this.target = { r: 0, c: 0 };
      this.display = { r: 0, c: 0 };
      this.trail = [];
      this.shake = { t: 0, dr: 0, dc: 0 };
      this.particles = [];

      this.result = null;
      this.layers = { player: true, bfs: true, explore: true };
      this.anim = { phase: "done", explore: 0, path: 0 };

      this.time = 0;
      this._last = 0;
      this._running = false;

      const onResize = () => this.resize();
      if (typeof ResizeObserver !== "undefined") {
        const wrap = canvas.closest(".board-wrap");
        if (wrap) new ResizeObserver(onResize).observe(wrap);
      }
      window.addEventListener("resize", onResize);
    }

    setMaze(maze) {
      this.maze = maze;
      this.result = null;
      this.trail = [{ r: maze.start.r, c: maze.start.c }];
      this.target = { r: maze.start.r, c: maze.start.c };
      this.display = { r: maze.start.r, c: maze.start.c };
      this.particles = [];
      this.anim = { phase: "done", explore: 0, path: 0 };
      this.resize();
    }

    resetRun() {
      const s = this.maze.start;
      this.result = null;
      this.trail = [{ r: s.r, c: s.c }];
      this.target = { r: s.r, c: s.c };
      this.display = { r: s.r, c: s.c };
      this.particles = [];
    }

    setPlayer(pos) {
      this.target = { r: pos.r, c: pos.c };
      this.trail.push({ r: pos.r, c: pos.c });
    }

    bump(dir) {
      const v = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] }[dir] || [0, 0];
      this.shake = { t: 0.22, dr: v[0], dc: v[1] };
    }

    celebrate() {
      const g = this.maze.goal;
      const cx = (g.c + 0.5) * this.cell;
      const cy = (g.r + 0.5) * this.cell;
      const palette = ["#e8604c", "#ef8a73", "#9ec7a4", "#bfb3dd", "#f0b44c", "#2f8f83"];
      for (let i = 0; i < 70; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 70 + Math.random() * 230;
        this.particles.push({
          x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
          life: 0.9 + Math.random() * 0.7, age: 0, size: 2.5 + Math.random() * 3.5,
          color: palette[(Math.random() * palette.length) | 0],
        });
      }
    }

    showResult(result) {
      this.result = result;
      this.replayBfs();
    }

    setLayers(layers) {
      Object.assign(this.layers, layers);
    }

    replayBfs() {
      if (!this.result) return;
      this.anim = { phase: this.layers.explore ? "explore" : "path", explore: 0, path: 0 };
    }

    start() {
      if (this._running) return;
      this._running = true;
      this._last = performance.now();
      const loop = (now) => {
        if (!this._running) return;
        const dt = Math.min(0.05, (now - this._last) / 1000);
        this._last = now;
        this.time += dt;
        this._update(dt);
        this._draw();
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }

    resize() {
      if (!this.maze) return;
      const wrap = this.canvas.closest(".board-wrap");
      let availW = 520;
      if (wrap && wrap.clientWidth > 0) {
        const cs = getComputedStyle(wrap);
        availW = wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 20; // 20 = padding frame
      }
      const availH = Math.max(280, window.innerHeight * 0.8);
      const byW = availW / this.maze.cols;
      const byH = availH / this.maze.rows;
      this.cell = Math.max(14, Math.floor(Math.min(byW, byH, 54)));

      const w = this.cell * this.maze.cols;
      const h = this.cell * this.maze.rows;
      this.dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
      for (const cv of [this.canvas, this.staticLayer]) {
        cv.width = Math.round(w * this.dpr);
        cv.height = Math.round(h * this.dpr);
      }
      this.canvas.style.width = w + "px";
      this.canvas.style.height = h + "px";
      this._renderStatic();
    }

    _renderStatic() {
      const ctx = this.staticLayer.getContext("2d");
      const n = this.cell;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, this.maze.cols * n, this.maze.rows * n);

      for (let r = 0; r < this.maze.rows; r++) {
        for (let c = 0; c < this.maze.cols; c++) {
          const x = c * n;
          const y = r * n;
          ctx.fillStyle = (r + c) % 2 === 0 ? COLORS.floorA : COLORS.floorB;
          ctx.fillRect(x, y, n, n);
          ctx.strokeStyle = COLORS.floorLine;
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 0.5, y + 0.5, n - 1, n - 1);
          this._diamond(ctx, x + n / 2, y + n / 2, n * 0.09, COLORS.floorMark);
        }
      }
      for (let r = 0; r < this.maze.rows; r++) {
        for (let c = 0; c < this.maze.cols; c++) {
          if (this.maze.grid[r][c] === 1) this._drawWall(ctx, c * n, r * n, n, r, c);
        }
      }
    }

    _diamond(ctx, cx, cy, s, color) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(cx, cy - s);
      ctx.lineTo(cx + s, cy);
      ctx.lineTo(cx, cy + s);
      ctx.lineTo(cx - s, cy);
      ctx.closePath();
      ctx.fill();
    }

    _drawWall(ctx, x, y, n, r, c) {
      const set = WALL_SETS[(r * 7 + c * 13 + r * c) % WALL_SETS.length];
      const pad = n * 0.07;
      const depth = n * 0.2;
      const w = n - pad * 2;
      const topH = n - pad * 2 - depth;
      const rad = n * 0.14;

      ctx.fillStyle = COLORS.shadow;
      this._roundRect(ctx, x + pad + n * 0.03, y + pad + n * 0.06, w, topH + depth, rad);
      ctx.fill();

      ctx.fillStyle = set[1];
      this._roundRect(ctx, x + pad, y + pad, w, topH + depth, rad);
      ctx.fill();

      ctx.fillStyle = set[0];
      this._roundRect(ctx, x + pad, y + pad, w, topH, rad);
      ctx.fill();

      ctx.fillStyle = "rgba(255,255,255,0.28)";
      this._roundRect(ctx, x + pad * 1.8, y + pad * 1.6, w - pad * 1.6, n * 0.08, rad * 0.5);
      ctx.fill();

      this._diamond(ctx, x + n / 2, y + pad + topH / 2, n * 0.12, "rgba(255,246,228,0.62)");
    }

    _roundRect(ctx, x, y, w, h, r) {
      r = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    _update(dt) {
      const k = 1 - Math.exp(-dt * 24);
      this.display.r += (this.target.r - this.display.r) * k;
      this.display.c += (this.target.c - this.display.c) * k;
      if (Math.abs(this.target.r - this.display.r) < 0.002) this.display.r = this.target.r;
      if (Math.abs(this.target.c - this.display.c) < 0.002) this.display.c = this.target.c;

      if (this.shake.t > 0) this.shake.t = Math.max(0, this.shake.t - dt);

      for (const p of this.particles) {
        p.age += dt;
        p.vy += 520 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      this.particles = this.particles.filter((p) => p.age < p.life);

      if (this.result) {
        const total = this.result.visitedOrder.length;
        if (this.anim.phase === "explore") {
          this.anim.explore += Math.max(1, total / 1.7) * dt;
          if (this.anim.explore >= total) {
            this.anim.explore = total;
            this.anim.phase = "path";
          }
        } else if (this.anim.phase === "path") {
          this.anim.explore = total;
          const len = this.result.bfsPath.length;
          this.anim.path += Math.max(8, len / 0.9) * dt;
          if (this.anim.path >= len) {
            this.anim.path = len;
            this.anim.phase = "done";
          }
        } else {
          this.anim.explore = total;
          this.anim.path = this.result.bfsPath.length;
        }
      }
    }

    _draw() {
      if (!this.maze) return;
      const ctx = this.ctx;
      const n = this.cell;
      const W = this.maze.cols * n;
      const H = this.maze.rows * n;

      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      ctx.save();
      if (this.shake.t > 0) {
        const amp = (this.shake.t / 0.22) * n * 0.12;
        const wob = Math.sin(this.shake.t * 70);
        ctx.translate(this.shake.dc * amp * wob, this.shake.dr * amp * wob);
      }

      ctx.drawImage(this.staticLayer, 0, 0, W, H);

      if (this.result) {
        this._drawExplored(ctx, n);
        this._drawStartGoal(ctx, n);
        if (this.layers.bfs) {
          const bp = this.result.bfsPath;
          this._drawPolyline(ctx, bp, this.anim.path, "rgba(255,248,232,0.95)", n * 0.38, false);
          this._drawPolyline(ctx, bp, this.anim.path, COLORS.bfsPath, n * 0.25, true);
        }
        if (this.layers.player) {
          const pp = this.result.playerPath;
          this._drawPolyline(ctx, pp, pp.length, "rgba(43,47,56,0.7)", n * 0.2, false);
          this._drawPolyline(ctx, pp, pp.length, COLORS.playerPath, n * 0.11, false);
        }
        this._drawPerson(ctx, (this.maze.start.c + 0.5) * n, (this.maze.start.r + 0.5) * n, n, 1);
      } else {
        this._drawTrail(ctx, n);
        this._drawStartGoal(ctx, n);
        this._drawPerson(ctx, (this.display.c + 0.5) * n, (this.display.r + 0.5) * n, n, 1 + Math.sin(this.time * 5) * 0.03);
      }

      this._drawParticles(ctx);
      ctx.restore();
    }

    _drawTrail(ctx, n) {
      if (this.trail.length < 2) return;
      const seen = new Set();
      ctx.fillStyle = COLORS.trail;
      for (const p of this.trail) {
        const key = p.r * 1000 + p.c;
        if (seen.has(key)) continue;
        seen.add(key);
        this._roundRect(ctx, p.c * n + n * 0.16, p.r * n + n * 0.16, n * 0.68, n * 0.68, n * 0.18);
        ctx.fill();
      }
    }

    _drawExplored(ctx, n) {
      if (!this.layers.explore) return;
      const order = this.result.visitedOrder;
      const total = order.length;
      const upto = Math.floor(this.anim.explore);
      for (let i = 0; i < upto && i < total; i++) {
        const p = order[i];
        const t = i / Math.max(1, total - 1);
        const hue = 175 + t * 95;
        ctx.fillStyle = "hsla(" + hue + ",42%,60%,0.55)";
        this._roundRect(ctx, p.c * n + n * 0.1, p.r * n + n * 0.1, n * 0.8, n * 0.8, n * 0.2);
        ctx.fill();
      }
      if (this.anim.phase === "explore" && upto > 0 && upto <= total) {
        const p = order[Math.min(upto, total) - 1];
        ctx.fillStyle = "rgba(232,96,76,0.8)";
        this._roundRect(ctx, p.c * n + n * 0.22, p.r * n + n * 0.22, n * 0.56, n * 0.56, n * 0.16);
        ctx.fill();
      }
    }

    _drawPolyline(ctx, path, progress, color, width, glow) {
      if (path.length < 2 || progress <= 0) return;
      const n = this.cell;
      const pt = (p) => [(p.c + 0.5) * n, (p.r + 0.5) * n];
      ctx.save();
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      if (glow) {
        ctx.shadowColor = "rgba(47,143,131,0.55)";
        ctx.shadowBlur = n * 0.35;
      }
      ctx.beginPath();
      const first = pt(path[0]);
      ctx.moveTo(first[0], first[1]);
      const whole = Math.min(path.length - 1, Math.floor(progress));
      for (let i = 1; i <= whole; i++) {
        const q = pt(path[i]);
        ctx.lineTo(q[0], q[1]);
      }
      if (whole < path.length - 1) {
        const a = pt(path[whole]);
        const b = pt(path[whole + 1]);
        const f = progress - whole;
        ctx.lineTo(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f);
      }
      ctx.stroke();
      ctx.restore();
    }

    _drawStartGoal(ctx, n) {
      const s = this.maze.start;
      const g = this.maze.goal;
      const pulse = 0.5 + 0.5 * Math.sin(this.time * 3);

      this._tile(ctx, s.c, s.r, n, COLORS.start, COLORS.startEdge, 0.0 + pulse * 0.05);
      this._badge(ctx, s.c, s.r, n, "S");

      this._tile(ctx, g.c, g.r, n, COLORS.goal, COLORS.goalEdge, 0.04 + pulse * 0.1);
      this._flag(ctx, (g.c + 0.5) * n, (g.r + 0.5) * n, n);
      this._badge(ctx, g.c, g.r, n, "G");
    }

    _tile(ctx, c, r, n, fill, edge, glowAlpha) {
      ctx.save();
      ctx.fillStyle = fill;
      this._roundRect(ctx, c * n + n * 0.06, r * n + n * 0.06, n * 0.88, n * 0.88, n * 0.2);
      ctx.fill();
      ctx.lineWidth = Math.max(1.5, n * 0.045);
      ctx.strokeStyle = edge;
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255," + glowAlpha + ")";
      this._roundRect(ctx, c * n + n * 0.06, r * n + n * 0.06, n * 0.88, n * 0.88, n * 0.2);
      ctx.fill();
      ctx.restore();
    }

    _badge(ctx, c, r, n, letter) {
      const rad = Math.max(6, n * 0.19);
      const cx = c * n + rad + n * 0.08;
      const cy = r * n + rad + n * 0.08;
      ctx.save();
      ctx.fillStyle = COLORS.cream;
      ctx.strokeStyle = COLORS.ink;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = COLORS.ink;
      ctx.font = "700 " + Math.round(rad * 1.25) + "px Futura, 'Avenir Next', 'Segoe UI', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(letter, cx, cy + rad * 0.06);
      ctx.restore();
    }

    _flag(ctx, cx, cy, n) {
      ctx.save();
      const wave = Math.sin(this.time * 4) * n * 0.03;
      const poleX = cx - n * 0.02;
      const top = cy - n * 0.26;
      const bottom = cy + n * 0.28;
      ctx.strokeStyle = COLORS.ink;
      ctx.lineWidth = Math.max(1.5, n * 0.05);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(poleX, top);
      ctx.lineTo(poleX, bottom);
      ctx.stroke();
      ctx.fillStyle = COLORS.cream;
      ctx.beginPath();
      ctx.moveTo(poleX, top);
      ctx.quadraticCurveTo(poleX + n * 0.2, top + n * 0.02 + wave, poleX + n * 0.3, top + n * 0.1);
      ctx.quadraticCurveTo(poleX + n * 0.2, top + n * 0.18 - wave, poleX, top + n * 0.22);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = Math.max(1, n * 0.025);
      ctx.stroke();
      ctx.restore();
    }

    _drawPerson(ctx, cx, cy, n, scale) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.lineJoin = "round";

      ctx.fillStyle = "rgba(43,47,56,0.18)";
      ctx.beginPath();
      ctx.ellipse(0, n * 0.27, n * 0.2, n * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = COLORS.ink;
      ctx.beginPath();
      ctx.moveTo(-n * 0.08, -n * 0.1);
      ctx.lineTo(n * 0.08, -n * 0.1);
      ctx.lineTo(n * 0.18, n * 0.25);
      ctx.quadraticCurveTo(0, n * 0.3, -n * 0.18, n * 0.25);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = COLORS.playerPath;
      this._roundRect(ctx, -n * 0.11, -n * 0.115, n * 0.22, n * 0.06, n * 0.03);
      ctx.fill();

      ctx.fillStyle = "#fff2dc";
      ctx.beginPath();
      ctx.arc(0, -n * 0.2, n * 0.105, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = COLORS.ink;
      ctx.lineWidth = Math.max(1.2, n * 0.035);
      ctx.stroke();
      ctx.restore();
    }

    _drawParticles(ctx) {
      for (const p of this.particles) {
        const a = Math.max(0, 1 - p.age / p.life);
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size * 0.6);
      }
      ctx.globalAlpha = 1;
    }
  }

  root.Renderer = Renderer;
})(typeof self !== "undefined" ? self : this);

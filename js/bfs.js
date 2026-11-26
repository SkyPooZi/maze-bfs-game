(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.BFSSolver = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const DIRS = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  function solve(grid, start, goal) {
    const rows = grid.length;
    const cols = rows > 0 ? grid[0].length : 0;
    const notFound = { found: false, path: [], distance: -1, visitedOrder: [], visitedCount: 0 };

    const inBounds = (p) => p && p.r >= 0 && p.r < rows && p.c >= 0 && p.c < cols;
    if (!inBounds(start) || !inBounds(goal)) return notFound;
    if (grid[start.r][start.c] === 1 || grid[goal.r][goal.c] === 1) return notFound;

    const total = rows * cols;
    const parent = new Int32Array(total).fill(-2);
    const queue = new Int32Array(total);
    const visitedOrder = [];
    let head = 0;
    let tail = 0;

    const startId = start.r * cols + start.c;
    const goalId = goal.r * cols + goal.c;

    parent[startId] = -1;
    queue[tail++] = startId;

    let reached = false;
    while (head < tail) {
      const cur = queue[head++];
      const cr = (cur / cols) | 0;
      const cc = cur - cr * cols;
      visitedOrder.push({ r: cr, c: cc });

      if (cur === goalId) {
        reached = true;
        break;
      }

      for (let i = 0; i < 4; i++) {
        const nr = cr + DIRS[i][0];
        const nc = cc + DIRS[i][1];
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        if (grid[nr][nc] === 1) continue;
        const nid = nr * cols + nc;
        if (parent[nid] !== -2) continue;
        parent[nid] = cur;
        queue[tail++] = nid;
      }
    }

    if (!reached) {
      return { found: false, path: [], distance: -1, visitedOrder, visitedCount: visitedOrder.length };
    }

    const path = [];
    for (let id = goalId; id !== -1; id = parent[id]) {
      const r = (id / cols) | 0;
      path.push({ r, c: id - r * cols });
    }
    path.reverse();

    return {
      found: true,
      path,
      distance: path.length - 1,
      visitedOrder,
      visitedCount: visitedOrder.length,
    };
  }

  return { solve, DIRS };
});

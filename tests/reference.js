function dijkstra(grid, start, goal) {
  const rows = grid.length;
  const cols = grid[0].length;
  if (grid[start.r][start.c] === 1 || grid[goal.r][goal.c] === 1) return -1;

  const dist = Array.from({ length: rows }, () => new Array(cols).fill(Infinity));
  const heap = [[0, start.r, start.c]];
  dist[start.r][start.c] = 0;

  const push = (item) => {
    heap.push(item);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p][0] <= heap[i][0]) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length > 0) {
      heap[0] = last;
      let i = 0;
      for (; ;) {
        let m = i;
        const l = 2 * i + 1;
        const r = 2 * i + 2;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]];
        i = m;
      }
    }
    return top;
  };

  while (heap.length) {
    const [d, r, c] = pop();
    if (d > dist[r][c]) continue;
    if (r === goal.r && c === goal.c) return d;
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || grid[nr][nc] === 1) continue;
      if (d + 1 < dist[nr][nc]) {
        dist[nr][nc] = d + 1;
        push([d + 1, nr, nc]);
      }
    }
  }
  return -1;
}

function dfs(grid, start, goal) {
  const rows = grid.length;
  const cols = grid[0].length;
  const parent = new Int32Array(rows * cols).fill(-2);
  const stack = [start.r * cols + start.c];
  parent[stack[0]] = -1;
  const goalId = goal.r * cols + goal.c;
  let visited = 0;

  while (stack.length) {
    const cur = stack.pop();
    visited++;
    if (cur === goalId) {
      let len = 0;
      for (let id = cur; parent[id] !== -1; id = parent[id]) len++;
      return { found: true, distance: len, visited };
    }
    const r = (cur / cols) | 0;
    const c = cur - r * cols;
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || grid[nr][nc] === 1) continue;
      const nid = nr * cols + nc;
      if (parent[nid] !== -2) continue;
      parent[nid] = cur;
      stack.push(nid);
    }
  }
  return { found: false, distance: -1, visited };
}

module.exports = { dijkstra, dfs };

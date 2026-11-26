# Maze Runner · BFS Challenge
 
A web-based maze game. The player starts at **S** and has to reach **G**. The maze (walls, S, and G) is generated randomly by the game. When the player finishes, the game runs **Breadth-First Search (BFS)** and shows the player's path next to the shortest path, along with an animation of how BFS explored the maze.
 
- Language: vanilla JavaScript, HTML, CSS. No framework and no build step.
- Hosting: Vercel (static site).
- Algorithm: BFS (shortest path). BFS is also used to check that every generated maze is solvable.
## Run
 
Open `index.html` in a browser, or use a local server:
 
```bash
npx serve
```
 
## Tests and evaluation
 
Requires Node.js 18+. No dependencies.
 
```bash
node --test tests/*.test.js     # 22 unit tests (BFS, maze generator, game engine)
node tests/evaluate.js          # BFS vs DFS comparison
```
 
## Project structure
 
```
maze-bfs-game/
├── index.html                 # Member 3
├── css/style.css              # Member 3
├── js/
│   ├── bfs.js                 # Member 1  BFS algorithm
│   ├── maze.js                # Member 1  random maze generator + BFS solvability check
│   ├── game.js                # Member 2  game engine: movement, steps, time, score, best record
│   ├── main.js                # Member 2  keyboard/d-pad input, HUD, screen flow, result panel
│   └── renderer.js            # Member 3  canvas drawing: walls, S, G, player, animations, result
├── tests/
│   ├── bfs.test.js            # Member 1
│   ├── reference.js           # Member 1  Dijkstra and DFS references (tests only)
│   ├── evaluate.js            # Member 1
│   └── game.test.js           # Member 2
└── README.md                  # Member 1
```
 
## Contributions
 
- **Moch Siril Wafa Zidane Feliano (5053251041)** (Member 1) — 33.33%: Implemented the BFS algorithm and maze generator, performed the analysis and evaluation, and deployed the game to Vercel.
- **Alvian Faza Wafda Reonaldi (5053251029)** (Member 2) — 33.33%: Handled the game logic and module integration, tested the game, and wrote the final report.
- **La Ode Muhammad Ghofaruddin S (5053251030)** (Member 3) — 33.33%: Designed the user interface and rendering, and wrote the README.
 

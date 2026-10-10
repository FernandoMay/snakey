/**
 * snakey UI wiring: keyboard/touch input → engine → canvas.
 * The engine (src/engine.js) is pure and tested; this file only glues.
 */
import { createGame, setAction, step, reset, snapshot } from './engine.js';
import { createRenderer } from './renderer.js';

const canvas = document.getElementById('gc');
const TILE_COUNT = 10;
const FPS = 10;

const game = createGame({ tileCount: TILE_COUNT, walls: false, fixedTail: false });
const renderer = createRenderer(canvas, TILE_COUNT);

let timer = null;

function render() {
  renderer.draw(snapshot(game));
}

function tick() {
  step(game);
  render();
  if (game.dead) {
    clearInterval(timer);
    timer = null;
  }
}

function play() {
  if (timer || game.dead) return;
  timer = setInterval(tick, 1000 / FPS);
}

function restart() {
  clearInterval(timer);
  timer = null;
  reset(game);
  render();
  play();
}

function move(action) {
  setAction(game, action);
  render();
  play();
}

// --- keyboard ---
const KEYMAP = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { restart(); return; }
  const action = KEYMAP[e.key];
  if (action) { move(action); e.preventDefault(); }
});

// --- touch buttons ---
document.querySelectorAll('[data-action]').forEach((btn) => {
  btn.addEventListener('click', () => move(btn.dataset.action));
});

render();

// exposed for debugging / RL experiments
window.Snake = { game, step, setAction, reset, snapshot, render, restart };

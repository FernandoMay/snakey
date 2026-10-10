/**
 * snakey engine — pure game logic (zero DOM, zero dependencies).
 *
 * The original game.js mixed simulation and canvas rendering in one
 * IIFE. This module keeps only the rules: movement, wrapping, walls,
 * fruit, scoring, self-collision. It's fully testable under Node and
 * usable as an RL environment (state is plain JSON-able data).
 *
 * Rewards (kept from the original design):
 *   -0.1 per tick   (survive, keep moving)
 *   +1   per fruit
 *   -1   on death (wall mode or self-collision)
 */

export const ACTIONS = Object.freeze(['up', 'down', 'left', 'right']);

const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };
const DELTA = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

export const INITIAL_TAIL = 4;

export function createGame({
  tileCount = 10,
  walls = false,
  fixedTail = false,
  rng = Math.random,
} = {}) {
  const cx = Math.floor(tileCount / 2);
  const game = {
    tileCount,
    walls,
    fixedTail,
    rng,
    player: { x: cx, y: cx },
    velocity: { x: 0, y: 0 },
    trail: [{ x: cx, y: cx }],
    tail: INITIAL_TAIL,
    fruit: { x: 1, y: 1 }, // fixed start, like the original (RandomFruit only on eat)
    points: 0,
    pointsMax: 0,
    reward: -1,
    dead: false,
    lastAction: 'none',
  };
  return game;
}

export function reset(game) {
  const cx = Math.floor(game.tileCount / 2);
  game.player = { x: cx, y: cx };
  game.velocity = { x: 0, y: 0 };
  game.trail = [{ x: cx, y: cx }];
  game.tail = INITIAL_TAIL;
  game.points = 0;
  game.reward = -1;
  game.dead = false;
  game.lastAction = 'none';
  game.fruit = { x: 1, y: 1 };
  return game;
}

/** Set direction. 180° turns are ignored (you can't reverse into yourself). */
export function setAction(game, action) {
  if (!ACTIONS.includes(action)) return;
  if (game.lastAction !== 'none' && OPPOSITE[action] === game.lastAction) return;
  if (game.velocity.x !== 0 || game.velocity.y !== 0) {
    // already moving: same reversal protection on live velocity
    const [dx, dy] = DELTA[action];
    if (dx === -game.velocity.x && dy === -game.velocity.y && (dx !== 0 || dy !== 0)) {
      return;
    }
  }
  const [dx, dy] = DELTA[action];
  game.velocity = { x: dx, y: dy };
  game.lastAction = action;
}

function randomFruitPosition(game) {
  const t = game.tileCount;
  if (game.walls) {
    return { x: 1 + Math.floor(game.rng() * (t - 2)), y: 1 + Math.floor(game.rng() * (t - 2)) };
  }
  return { x: Math.floor(game.rng() * t), y: Math.floor(game.rng() * t) };
}

function spawnFruit(game) {
  let guard = 0;
  do {
    game.fruit = randomFruitPosition(game);
    guard++;
  } while (guard < 500 && game.trail.some((s) => s.x === game.fruit.x && s.y === game.fruit.y));
}

/**
 * Advance one tick. Returns { reward, dead }.
 * When stopped (no direction yet) nothing moves.
 */
export function step(game) {
  if (game.dead) return { reward: game.reward, dead: true };

  game.reward = -0.1;
  const stopped = game.velocity.x === 0 && game.velocity.y === 0;

  if (!stopped) {
    game.player.x += game.velocity.x;
    game.player.y += game.velocity.y;
  }

  // --- bounds ---
  if (game.walls) {
    const t = game.tileCount;
    if (game.player.x < 1 || game.player.x > t - 2 ||
        game.player.y < 1 || game.player.y > t - 2) {
      game.dead = true;
      game.reward = -1;
      return { reward: game.reward, dead: true };
    }
  } else {
    // wrap-around
    if (game.player.x < 0) game.player.x = game.tileCount - 1;
    if (game.player.x >= game.tileCount) game.player.x = 0;
    if (game.player.y < 0) game.player.y = game.tileCount - 1;
    if (game.player.y >= game.tileCount) game.player.y = 0;
  }

  // --- self collision (checked before pushing the new head) ---
  if (!stopped && game.trail.some((s) => s.x === game.player.x && s.y === game.player.y)) {
    game.dead = true;
    game.reward = -1;
    return { reward: game.reward, dead: true };
  }

  // --- move the trail ---
  if (!stopped) {
    game.trail.push({ x: game.player.x, y: game.player.y });
    while (game.trail.length > game.tail) game.trail.shift();
  }

  // --- fruit ---
  if (game.player.x === game.fruit.x && game.player.y === game.fruit.y) {
    if (!game.fixedTail) game.tail++;
    game.points++;
    if (game.points > game.pointsMax) game.pointsMax = game.points;
    game.reward = 1;
    spawnFruit(game);
  }

  return { reward: game.reward, dead: game.dead };
}

/** Snapshot for RL/render: safe to JSON.stringify. */
export function snapshot(game) {
  return {
    player: { ...game.player },
    velocity: { ...game.velocity },
    trail: game.trail.map((s) => ({ ...s })),
    fruit: { ...game.fruit },
    points: game.points,
    pointsMax: game.pointsMax,
    dead: game.dead,
    tileCount: game.tileCount,
    walls: game.walls,
  };
}

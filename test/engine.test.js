/**
 * snakey engine tests. Run: node --test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createGame, reset, setAction, step, snapshot, INITIAL_TAIL } from '../src/engine.js';

/** RNG that always returns 0.5 → fruit lands mid-grid. */
const MID = () => 0.5;

function started(tileCount = 10) {
  const g = createGame({ tileCount, rng: MID });
  setAction(g, 'right');
  return g;
}

test('game starts centered with initial tail and a fruit on the board', () => {
  const g = createGame({ rng: MID });
  assert.deepEqual(g.player, { x: 5, y: 5 });
  assert.equal(g.tail, INITIAL_TAIL);
  assert.equal(g.trail.length, 1);
  assert.ok(g.fruit.x >= 0 && g.fruit.x < g.tileCount);
});

test('stopped snake does not move until a direction is set', () => {
  const g = createGame({ rng: MID });
  const before = snapshot(g);
  const r = step(g);
  assert.deepEqual(snapshot(g).player, before.player);
  assert.equal(r.reward, -0.1); // still a survived tick
});

test('moving applies velocity and extends the trail up to tail length', () => {
  const g = started();
  step(g);
  assert.deepEqual(g.player, { x: 6, y: 5 });
  assert.equal(g.trail.length, 2); // head + initial segment
  for (let i = 0; i < 5; i++) step(g);
  assert.equal(g.trail.length, INITIAL_TAIL); // capped at tail
  assert.deepEqual(g.trail[g.trail.length - 1], { x: 1, y: 5 }); // 6 moves from x=5, wrapped
});

test('no-wall mode wraps around the board', () => {
  const g = started();
  for (let i = 0; i < 5; i++) step(g); // from x=5: 5 steps right → x=0 (wrap)
  assert.equal(g.player.x, 0);
  assert.equal(g.dead, false);
});

test('wall mode kills the snake at the border', () => {
  const g = createGame({ tileCount: 10, walls: true, rng: MID });
  setAction(g, 'right');
  let r;
  for (let i = 0; i < 10 && !g.dead; i++) r = step(g);
  assert.equal(g.dead, true);
  assert.equal(r.reward, -1);
});

test('180° reversals are ignored', () => {
  const g = createGame({ rng: MID });
  setAction(g, 'right');
  step(g);
  setAction(g, 'left'); // ignored
  assert.deepEqual(g.velocity, { x: 1, y: 0 });
  setAction(g, 'up'); // allowed
  assert.deepEqual(g.velocity, { x: 0, y: -1 });
  setAction(g, 'down'); // ignored
  assert.deepEqual(g.velocity, { x: 0, y: -1 });
});

test('eating fruit gives +1 and grows the tail (fixedTail=false)', () => {
  const g = createGame({ rng: MID });
  g.fruit = { x: 6, y: 5 };
  setAction(g, 'right');
  const tailBefore = g.tail;
  const r = step(g);
  assert.equal(r.reward, 1);
  assert.equal(g.points, 1);
  assert.equal(g.tail, tailBefore + 1);
  assert.ok(g.pointsMax >= 1);
});

test('fixedTail mode scores without growing the tail', () => {
  const g = createGame({ fixedTail: true, rng: MID });
  g.fruit = { x: 6, y: 5 };
  setAction(g, 'right');
  const tailBefore = g.tail;
  step(g);
  assert.equal(g.points, 1);
  assert.equal(g.tail, tailBefore);
});

test('fruit never respawns on the snake body', () => {
  const g = createGame({ rng: MID });
  g.trail = [
    { x: 5, y: 5 }, { x: 5, y: 6 }, { x: 5, y: 7 }, { x: 5, y: 8 },
    { x: 6, y: 8 }, { x: 7, y: 8 }, { x: 8, y: 8 }, { x: 9, y: 8 },
  ];
  g.fruit = { x: 6, y: 5 };
  setAction(g, 'right');
  step(g); // eats → respawn
  assert.equal(g.points, 1);
  assert.ok(!g.trail.some((s) => s.x === g.fruit.x && s.y === g.fruit.y));
});

test('self collision kills the snake', () => {
  // Head at (3,6) moving left into its own body at (2,6).
  const g = createGame({ tileCount: 10, rng: MID });
  g.trail = [
    { x: 2, y: 6 }, // body directly ahead
    { x: 3, y: 6 },
    { x: 4, y: 6 },
    { x: 5, y: 6 },
    { x: 6, y: 6 },
  ];
  g.player = { x: 3, y: 6 };
  g.velocity = { x: -1, y: 0 };
  g.lastAction = 'left';
  const r = step(g);
  assert.equal(g.dead, true);
  assert.equal(r.reward, -1);
});

test('reset restores a fresh game', () => {
  const g = started();
  step(g); step(g);
  g.points = 5;
  reset(g);
  assert.deepEqual(g.player, { x: 5, y: 5 });
  assert.equal(g.points, 0);
  assert.equal(g.dead, false);
  assert.equal(g.trail.length, 1);
});

test('dead game ignores further steps', () => {
  const g = createGame({ walls: true, rng: MID });
  setAction(g, 'right');
  while (!g.dead) step(g);
  const playerAtDeath = { ...g.player };
  const r = step(g);
  assert.deepEqual(g.player, playerAtDeath);
  assert.equal(r.dead, true);
});

test('snapshot is JSON-serializable (RL-friendly state)', () => {
  const g = started();
  step(g);
  const s = snapshot(g);
  assert.deepEqual(JSON.parse(JSON.stringify(s)), s);
});

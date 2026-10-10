/**
 * snakey renderer — draws a game snapshot onto a canvas.
 * Pure presentation: no game rules here.
 */
export function createRenderer(canvas, tileCount = 10) {
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const tile = size / tileCount;

  function clear() {
    ctx.fillStyle = 'grey';
    ctx.fillRect(0, 0, size, size);
  }

  function draw(game) {
    clear();

    // fruit
    ctx.fillStyle = 'red';
    ctx.fillRect(game.fruit.x * tile + 1, game.fruit.y * tile + 1, tile - 2, tile - 2);

    // snake: body segments darker, head lime
    for (let i = 0; i < game.trail.length; i++) {
      const s = game.trail[i];
      ctx.fillStyle = i === game.trail.length - 1 ? 'lime' : 'green';
      ctx.fillRect(s.x * tile + 1, s.y * tile + 1, tile - 2, tile - 2);
    }

    // HUD
    ctx.fillStyle = 'white';
    ctx.font = 'bold small-caps 16px Helvetica';
    ctx.fillText(`points: ${game.points}`, 288, 40);
    ctx.fillText(`top: ${game.pointsMax}`, 292, 60);

    if (game.dead) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = 'white';
      ctx.font = 'bold small-caps 20px Helvetica';
      ctx.fillText('GAME OVER', 140, 195);
      ctx.font = 'small-caps 14px Helvetica';
      ctx.fillText('press ESC to restart', 133, 220);
      return;
    }
    if (game.velocity.x === 0 && game.velocity.y === 0) {
      ctx.fillStyle = 'rgba(250,250,250,0.8)';
      ctx.font = 'small-caps bold 14px Helvetica';
      ctx.fillText('press ARROW KEYS to START...', 24, 374);
    }
  }

  return { draw };
}

import { state } from '../state.js';
import { GRID_SIZE } from '../config.js';

export function toPixel(gx, gy) {
  return {
    px: state.origin.x + gx * state.zoom,
    py: state.origin.y - gy * state.zoom,
  };
}

export function toGrid(px, py) {
  return {
    gx: Math.round((px - state.origin.x) / state.zoom),
    gy: Math.round((state.origin.y - py) / state.zoom),
  };
}

export function zoomGrid(factor, centerPx) {
  const old = state.zoom;
  const nw  = Math.min(90, Math.max(14, old * factor));
  state.origin.x = centerPx.x - (centerPx.x - state.origin.x) * (nw / old);
  state.origin.y = centerPx.y - (centerPx.y - state.origin.y) * (nw / old);
  state.zoom = nw;
}

export function drawGrid(ctx, w, h) {
  const { origin, zoom } = state;
  const cs = getComputedStyle(document.documentElement);
  const lineColor = cs.getPropertyValue('--grid-line').trim();
  const dotColor  = cs.getPropertyValue('--grid-dot').trim();

  ctx.save();

  // Uniform grid lines — no special axis lines
  ctx.strokeStyle = lineColor;
  ctx.lineWidth   = 0.5;
  const sx = ((origin.x % zoom) + zoom) % zoom;
  const sy = ((origin.y % zoom) + zoom) % zoom;
  for (let x = sx; x < w; x += zoom) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = sy; y < h; y += zoom) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  // Intersection dots
  ctx.fillStyle = dotColor;
  for (let x = sx; x < w; x += zoom) {
    for (let y = sy; y < h; y += zoom) {
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

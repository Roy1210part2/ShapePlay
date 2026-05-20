import { state }  from '../state.js';
import { renderAll, drawShape, drawGhost, drawShapeScaled } from '../canvas/Renderer.js';
import { drawGrid } from '../canvas/Grid.js';

function ease(t) { return t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t; }

function getCtx() { return document.getElementById('main-canvas').getContext('2d'); }
function getSize() {
  const el = document.getElementById('main-canvas');
  const dpr = window.devicePixelRatio || 1;
  return { w: el.width / dpr, h: el.height / dpr };
}

function drawOthers(ctx) {
  state.shapes.forEach(s => { if (s.id !== state._animatingId) drawShape(ctx, s); });
  if (state.mode === 'mission' && state.missionTarget) drawGhost(ctx, state.missionTarget);
}

export function playMorph(shape, targetVerts, onDone) {
  state.animating = true;
  state._animatingId = shape.id;
  const origVerts = shape.vertices.map(v => ({ ...v }));
  const start = performance.now();
  const DURATION = 900;
  const ctx = getCtx();

  const frame = (now) => {
    const t  = Math.min((now - start) / DURATION, 1);
    const et = ease(t);
    const interVerts = origVerts.map((v, i) => ({
      x: v.x + (targetVerts[i].x - v.x) * et,
      y: v.y + (targetVerts[i].y - v.y) * et,
    }));
    const { w, h } = getSize();
    ctx.clearRect(0, 0, w, h);
    drawGrid(ctx, w, h);
    drawOthers(ctx);
    drawShape(ctx, shape, interVerts);
    if (t < 1) requestAnimationFrame(frame);
    else { state.animating = false; state._animatingId = null; onDone(); }
  };
  requestAnimationFrame(frame);
}

export function playFlip(shape, targetVerts, onDone) {
  state.animating = true;
  state._animatingId = shape.id;
  const origVerts = shape.vertices.map(v => ({ ...v }));
  const start = performance.now();
  const DURATION = 900;
  const ctx = getCtx();

  const frame = (now) => {
    const t = Math.min((now - start) / DURATION, 1);
    const { w, h } = getSize();
    ctx.clearRect(0, 0, w, h);
    drawGrid(ctx, w, h);
    drawOthers(ctx);

    let scaleX, verts;
    if (t < 0.5) {
      scaleX = 1 - ease(t * 2);
      verts  = origVerts;
    } else {
      scaleX = ease((t - 0.5) * 2);
      verts  = targetVerts;
    }
    drawShapeScaled(ctx, shape, verts, scaleX);

    if (t < 1) requestAnimationFrame(frame);
    else { state.animating = false; state._animatingId = null; onDone(); }
  };
  requestAnimationFrame(frame);
}

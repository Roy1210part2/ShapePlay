import { state } from '../state.js';
import { drawGrid } from './Grid.js';
import { toPixel } from './Grid.js';
import { POINT_RADIUS, CLOSE_THRESHOLD } from '../config.js';

function getCtx() {
  return document.getElementById('main-canvas').getContext('2d');
}
function getSize() {
  const el  = document.getElementById('main-canvas');
  const dpr = window.devicePixelRatio || 1;
  return { w: el.width / dpr, h: el.height / dpr };
}

export function renderAll() {
  if (state.animating) return;
  const ctx = getCtx();
  const { w, h } = getSize();
  ctx.clearRect(0, 0, w, h);
  drawGrid(ctx, w, h);
  if (state.mode === 'mission' && state.missionTarget) drawGhost(ctx, state.missionTarget);
  state.shapes.forEach(s => drawShape(ctx, s));
  if (state.mode === 'drawing') drawPreview(ctx);
}

export function drawShape(ctx, shape, verts) {
  // Draw previous-position ghost first (only when drawing actual shape, not during animation)
  if (!verts && shape.prevVerts) {
    drawPrevGhost(ctx, shape);
  }
  if (shape.type === 'point') { drawPointShape(ctx, shape); return; }
  const vertices = verts || shape.vertices;
  if (vertices.length < 2) return;
  const pixels   = vertices.map(v => toPixel(v.x, v.y));
  const isActive = shape.id === state.activeShapeId;

  ctx.save();
  ctx.beginPath();
  pixels.forEach((p, i) => i === 0 ? ctx.moveTo(p.px, p.py) : ctx.lineTo(p.px, p.py));
  ctx.closePath();
  ctx.fillStyle   = shape.fillColor;
  ctx.strokeStyle = shape.strokeColor;
  ctx.lineWidth   = isActive ? 2.5 : 2;
  ctx.fill();
  ctx.stroke();
  if (isActive) {
    ctx.shadowColor = shape.strokeColor;
    ctx.shadowBlur  = 10;
    ctx.stroke();
    ctx.shadowBlur  = 0;
  }
  pixels.forEach((p, i) => {
    ctx.beginPath();
    ctx.arc(p.px, p.py, isActive ? 5 : 4, 0, Math.PI * 2);
    ctx.fillStyle   = shape.strokeColor;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.fill();
    ctx.stroke();
  });
  // shape label
  if (isActive) {
    const cx = pixels.reduce((s, p) => s + p.px, 0) / pixels.length;
    const cy = pixels.reduce((s, p) => s + p.py, 0) / pixels.length;
    ctx.fillStyle = shape.strokeColor;
    ctx.font = 'bold 11px Pretendard, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 0;
    ctx.fillText(shape.label, cx, cy);
  }
  ctx.restore();
}

function drawPointShape(ctx, shape) {
  const v = shape.vertices[0];
  if (!v) return;
  const { px, py } = toPixel(v.x, v.y);
  const isActive = shape.id === state.activeShapeId;
  ctx.save();
  ctx.beginPath();
  ctx.arc(px, py, isActive ? POINT_RADIUS + 2 : POINT_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle   = shape.fillColor;
  ctx.strokeStyle = shape.strokeColor;
  ctx.lineWidth   = 2.5;
  ctx.fill();
  ctx.stroke();
  if (isActive) {
    ctx.shadowColor = shape.strokeColor;
    ctx.shadowBlur  = 10;
    ctx.stroke();
  }
  ctx.restore();
}

// Ghost of the shape's position before the last transform
function drawPrevGhost(ctx, shape) {
  const verts = shape.prevVerts;
  if (!verts) return;

  if (shape.type === 'point') {
    const v = verts[0];
    if (!v) return;
    const { px, py } = toPixel(v.x, v.y);
    ctx.save();
    ctx.beginPath();
    ctx.arc(px, py, POINT_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle   = shape.fillColor.replace(/[\d.]+\)$/, '0.25)');
    ctx.strokeStyle = shape.strokeColor.replace(/[\d.]+\)$/, '0.45)');
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return;
  }

  const pixels = verts.map(v => toPixel(v.x, v.y));
  ctx.save();
  ctx.beginPath();
  pixels.forEach((p, i) => i === 0 ? ctx.moveTo(p.px, p.py) : ctx.lineTo(p.px, p.py));
  ctx.closePath();
  ctx.setLineDash([5, 4]);
  ctx.strokeStyle = shape.strokeColor.replace(/[\d.]+\)$/, '0.45)');
  ctx.lineWidth   = 1.5;
  ctx.fillStyle   = shape.fillColor.replace(/[\d.]+\)$/, '0.12)');
  ctx.fill();
  ctx.stroke();

  // Vertex dots for the ghost
  pixels.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.px, p.py, 3, 0, Math.PI * 2);
    ctx.fillStyle = shape.strokeColor.replace(/[\d.]+\)$/, '0.4)');
    ctx.setLineDash([]);
    ctx.fill();
  });
  ctx.restore();
}

export function drawGhost(ctx, vertices) {
  const pixels = vertices.map(v => toPixel(v.x, v.y));
  ctx.save();
  ctx.beginPath();
  pixels.forEach((p, i) => i === 0 ? ctx.moveTo(p.px, p.py) : ctx.lineTo(p.px, p.py));
  ctx.closePath();
  ctx.setLineDash([6, 4]);
  ctx.strokeStyle = 'hsla(145, 50%, 50%, 0.55)';
  ctx.lineWidth   = 2.5;
  ctx.fillStyle   = 'hsla(145, 50%, 60%, 0.1)';
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawPreview(ctx) {
  if (state.drawSubMode === 'point') {
    drawPointPreview(ctx);
    return;
  }
  const verts = state.drawingVertices;
  if (verts.length === 0) return;
  const pixels = verts.map(v => toPixel(v.x, v.y));

  ctx.save();
  ctx.setLineDash([5, 4]);
  ctx.strokeStyle = 'hsla(250, 60%, 60%, 0.75)';
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  pixels.forEach((p, i) => i === 0 ? ctx.moveTo(p.px, p.py) : ctx.lineTo(p.px, p.py));
  if (state.mousePos) ctx.lineTo(state.mousePos.x, state.mousePos.y);
  ctx.stroke();
  ctx.setLineDash([]);

  pixels.forEach((p, i) => {
    ctx.beginPath();
    ctx.arc(p.px, p.py, i === 0 ? 7 : 4, 0, Math.PI * 2);
    ctx.fillStyle   = i === 0 ? 'hsla(250, 70%, 60%, 0.9)' : 'hsla(250, 50%, 70%, 0.9)';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.fill();
    ctx.stroke();
  });

  // close hint when near first vertex
  if (verts.length >= 3 && state.mousePos) {
    const first = pixels[0];
    const dist  = Math.hypot(state.mousePos.x - first.px, state.mousePos.y - first.py);
    if (dist < CLOSE_THRESHOLD * 2) {
      ctx.beginPath();
      ctx.arc(first.px, first.py, CLOSE_THRESHOLD, 0, Math.PI * 2);
      ctx.strokeStyle = 'hsla(250, 70%, 55%, 0.4)';
      ctx.lineWidth   = 1;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawPointPreview(ctx) {
  const p = state.pendingPoint;
  if (!p) return;
  const { px, py } = toPixel(p.x, p.y);
  ctx.save();
  ctx.beginPath();
  ctx.arc(px, py, POINT_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle   = 'hsla(250, 70%, 65%, 0.7)';
  ctx.strokeStyle = 'hsla(250, 60%, 45%, 0.9)';
  ctx.lineWidth   = 2;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawShapeScaled(ctx, shape, verts, scaleX) {
  if (shape.type === 'point') return;
  const pixels = verts.map(v => toPixel(v.x, v.y));
  const xs = pixels.map(p => p.px);
  const ys = pixels.map(p => p.py);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(Math.max(0.001, scaleX), 1);
  ctx.translate(-cx, -cy);
  ctx.beginPath();
  pixels.forEach((p, i) => i === 0 ? ctx.moveTo(p.px, p.py) : ctx.lineTo(p.px, p.py));
  ctx.closePath();
  ctx.fillStyle   = shape.fillColor;
  ctx.strokeStyle = shape.strokeColor;
  ctx.lineWidth   = 2;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

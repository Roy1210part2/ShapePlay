import { state }   from '../state.js';
import { POINT_COLOR, CLOSE_THRESHOLD } from '../config.js';

// Generate maximally distinct colors using the golden angle (137.508°)
// so each new shape gets a visually different hue from all previous ones.
function generateColor(idx) {
  const hue = Math.round((idx * 137.508) % 360);
  // Keep lightness/saturation in a comfortable pastel-but-visible range
  return {
    fill:   `hsla(${hue}, 55%, 72%, 0.28)`,
    stroke: `hsla(${hue}, 50%, 42%, 0.9)`,
  };
}
import { toPixel, toGrid } from '../canvas/Grid.js';
import { renderAll }       from '../canvas/Renderer.js';
import { pushHistory }     from '../history/History.js';

let polygonCount = 0;
let pointCount   = 0;
let colorIdx     = 0;

export function resetShapeCounters() {
  polygonCount = 0;
  pointCount   = 0;
  colorIdx     = 0;
}

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function addPolygon(vertices) {
  const color = generateColor(colorIdx);
  colorIdx++;
  polygonCount++;
  const shape = {
    id: makeId(),
    type: 'polygon',
    vertices: vertices.map(v => ({ ...v })),
    fillColor:   color.fill,
    strokeColor: color.stroke,
    label: `도형 ${polygonCount}`,
  };
  state.shapes.push(shape);
  state.activeShapeId = shape.id;
  return shape;
}

export function addPoint(gx, gy) {
  pointCount++;
  const shape = {
    id: makeId(),
    type: 'point',
    vertices: [{ x: gx, y: gy }],
    fillColor:   POINT_COLOR.fill,
    strokeColor: POINT_COLOR.stroke,
    label: `점 ${pointCount}`,
  };
  state.shapes.push(shape);
  state.activeShapeId = shape.id;
  return shape;
}

export function getActive() {
  return state.shapes.find(s => s.id === state.activeShapeId) || null;
}

export function getById(id) {
  return state.shapes.find(s => s.id === id) || null;
}

export function pointInShape(px, py, shape) {
  if (shape.type === 'point') {
    const v = shape.vertices[0];
    const { px: spx, py: spy } = toPixel(v.x, v.y);
    return Math.hypot(px - spx, py - spy) < 14;
  }
  const pixels = shape.vertices.map(v => toPixel(v.x, v.y));
  let inside = false;
  for (let i = 0, j = pixels.length - 1; i < pixels.length; j = i++) {
    const xi = pixels[i].px, yi = pixels[i].py;
    const xj = pixels[j].px, yj = pixels[j].py;
    if (((yi > py) !== (yj > py)) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

// Called from Events.js on canvas click
export function handleCanvasClick(px, py) {
  if (state.mode === 'idle' || state.mode === 'mission') return; // handled by Events.js

  if (state.mode !== 'drawing') return;

  if (state.drawSubMode === 'point') {
    const { gx, gy } = toGrid(px, py);
    state.pendingPoint = { x: gx, y: gy };
    renderAll();
    return;
  }

  // polygon mode
  const { gx, gy } = toGrid(px, py);
  const verts = state.drawingVertices;

  if (verts.length >= 3) {
    const firstPx = toPixel(verts[0].x, verts[0].y);
    if (Math.hypot(px - firstPx.px, py - firstPx.py) < CLOSE_THRESHOLD) {
      closePolygon();
      return;
    }
  }

  if (!verts.some(v => v.x === gx && v.y === gy)) {
    verts.push({ x: gx, y: gy });
    renderAll();
  }
}

function closePolygon() {
  const verts = state.drawingVertices;
  if (verts.length < 3) return;
  addPolygon(verts);
  state.drawingVertices = [];
  state.mode = 'idle';
  pushHistory();
  renderAll();
  // Dispatch event for UI update
  document.dispatchEvent(new CustomEvent('shapeCreated'));
}

export function confirmPoint() {
  const p = state.pendingPoint;
  if (!p) return;
  addPoint(p.x, p.y);
  state.pendingPoint = null;
  state.mode = 'idle';
  pushHistory();
  renderAll();
  document.dispatchEvent(new CustomEvent('shapeCreated'));
}

export function deleteShape(id) {
  const idx = state.shapes.findIndex(s => s.id === id);
  if (idx === -1) return;
  state.shapes.splice(idx, 1);
  if (state.activeShapeId === id) state.activeShapeId = null;
  pushHistory();
  renderAll();
}

export function clearAll() {
  state.shapes = [];
  state.activeShapeId = null;
  state.drawingVertices = [];
  state.pendingPoint = null;
  resetShapeCounters();
}

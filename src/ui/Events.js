import { state }                                  from '../state.js';
import { handleCanvasClick, pointInShape, confirmPoint } from '../shapes/ShapeManager.js';
import { toGrid, zoomGrid }                        from '../canvas/Grid.js';
import { renderAll }                               from '../canvas/Renderer.js';

// Pan state
let panStart        = null;
let originAtPanStart = null;
let panMoved        = false;
const PAN_THRESHOLD = 5; // px before we commit to panning

export function bindCanvasEvents() {
  const canvas = document.getElementById('main-canvas');

  // ── Mousedown: begin potential pan ──────────────────────────
  canvas.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    const rect = canvas.getBoundingClientRect();
    panStart         = { x: e.clientX, y: e.clientY };
    originAtPanStart = { x: state.origin.x, y: state.origin.y };
    panMoved         = false;
  });

  // ── Mousemove: pan OR drawing preview ───────────────────────
  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    // Pan while dragging (any mode)
    if (panStart) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      if (!panMoved && Math.hypot(dx, dy) > PAN_THRESHOLD) {
        panMoved = true;
      }
      if (panMoved) {
        state.origin.x = originAtPanStart.x + dx;
        state.origin.y = originAtPanStart.y + dy;
        canvas.style.cursor = 'grabbing';
        renderAll();
        return;
      }
    }

    // Normal hover/preview when not panning
    if (state.mode === 'drawing') {
      if (state.drawSubMode === 'point') {
        const { gx, gy } = toGrid(px, py);
        state.pendingPoint = { x: gx, y: gy };
      } else {
        state.mousePos = { x: px, y: py };
      }
      canvas.style.cursor = 'crosshair';
      renderAll();
    } else {
      const hit = state.shapes.some(s => pointInShape(px, py, s));
      canvas.style.cursor = hit ? 'pointer' : 'grab';
    }
  });

  // ── Mouseup: end pan OR dispatch click ───────────────────────
  canvas.addEventListener('mouseup', e => {
    if (e.button !== 0) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const wasPanning = panMoved;

    panStart  = null;
    panMoved  = false;
    canvas.style.cursor = state.mode === 'drawing' ? 'crosshair' : 'grab';

    if (wasPanning) return; // drag → pan, not click

    // Treat as click
    handleClick(px, py);
  });

  // Double-click to confirm a point in point mode
  canvas.addEventListener('dblclick', e => {
    if (state.mode === 'drawing' && state.drawSubMode === 'point' && state.pendingPoint) {
      e.preventDefault();
      confirmPoint();
    }
  });

  canvas.addEventListener('mouseleave', () => {
    panStart = null;
    panMoved = false;
    state.mousePos = null;
    if (state.drawSubMode === 'point') state.pendingPoint = null;
    renderAll();
  });

  // ── Wheel: zoom ──────────────────────────────────────────────
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const rect   = canvas.getBoundingClientRect();
    const center = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    zoomGrid(e.deltaY < 0 ? 1.12 : 0.88, center);
    renderAll();
  }, { passive: false });

  // ── Touch: pinch-to-zoom ─────────────────────────────────────
  let lastTouchDist = null;
  let touchPanStart = null;
  let touchOrigin   = null;

  canvas.addEventListener('touchstart', e => {
    if (e.touches.length === 1) {
      const rect = canvas.getBoundingClientRect();
      touchPanStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      touchOrigin   = { x: state.origin.x, y: state.origin.y };
      panMoved = false;
    }
  }, { passive: true });

  canvas.addEventListener('touchmove', e => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx   = e.touches[0].clientX - e.touches[1].clientX;
      const dy   = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      if (lastTouchDist !== null) {
        const rect = canvas.getBoundingClientRect();
        const cx   = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        const cy   = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
        zoomGrid(dist / lastTouchDist, { x: cx, y: cy });
        renderAll();
      }
      lastTouchDist = dist;
    } else if (e.touches.length === 1 && touchPanStart) {
      // single-finger pan on touch
      const dx = e.touches[0].clientX - touchPanStart.x;
      const dy = e.touches[0].clientY - touchPanStart.y;
      if (Math.hypot(dx, dy) > PAN_THRESHOLD) {
        panMoved = true;
        state.origin.x = touchOrigin.x + dx;
        state.origin.y = touchOrigin.y + dy;
        renderAll();
      }
    }
  }, { passive: false });

  canvas.addEventListener('touchend', e => {
    lastTouchDist = null;
    if (e.changedTouches.length === 1 && touchPanStart && !panMoved) {
      // tap → treat as click for drawing
      const rect = canvas.getBoundingClientRect();
      handleClick(e.changedTouches[0].clientX - rect.left, e.changedTouches[0].clientY - rect.top);
    }
    touchPanStart = null;
    touchOrigin   = null;
    panMoved      = false;
  });
}

// ── Shared click handler ─────────────────────────────────────
function handleClick(px, py) {
  if (state.mode === 'idle' || state.mode === 'mission') {
    const hit = [...state.shapes].reverse().find(s => pointInShape(px, py, s));
    if (hit) {
      import('../modals/TransformModal.js').then(m => {
        state.activeShapeId = hit.id;
        renderAll();
        m.openTransformModal();
      });
    }
    return;
  }
  handleCanvasClick(px, py);
}

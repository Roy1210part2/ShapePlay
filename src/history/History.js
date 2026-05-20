import { state } from '../state.js';
import { renderAll } from '../canvas/Renderer.js';

const MAX = 60;

function snap() {
  return {
    shapes: state.shapes.map(s => ({
      ...s,
      prevVerts: null, // don't persist ghost in history snapshots
      vertices: s.vertices.map(v => ({ ...v })),
    })),
    activeShapeId: state.activeShapeId,
  };
}

export function pushHistory() {
  const stack = state.historyStack;
  stack.splice(state.historyIndex + 1);
  stack.push(snap());
  if (stack.length > MAX) stack.shift();
  state.historyIndex = stack.length - 1;
  updateHistoryButtons();
}

export function undo() {
  if (state.historyIndex <= 0) return;
  state.historyIndex--;
  restore();
}

export function redo() {
  if (state.historyIndex >= state.historyStack.length - 1) return;
  state.historyIndex++;
  restore();
}

function restore() {
  const snap = state.historyStack[state.historyIndex];
  state.shapes = snap.shapes.map(s => ({
    ...s,
    vertices: s.vertices.map(v => ({ ...v })),
  }));
  state.activeShapeId = snap.activeShapeId;
  renderAll();
  updateHistoryButtons();
}

export function updateHistoryButtons() {
  const undoBtn = document.getElementById('btn-undo');
  const redoBtn = document.getElementById('btn-redo');
  if (undoBtn) undoBtn.disabled = state.historyIndex <= 0;
  if (redoBtn) redoBtn.disabled = state.historyIndex >= state.historyStack.length - 1;
}

import { state }         from '../state.js';
import { MISSIONS }      from './missions.js';
import { addPolygon, clearAll, resetShapeCounters } from '../shapes/ShapeManager.js';
import { pushHistory }   from '../history/History.js';
import { renderAll }     from '../canvas/Renderer.js';
import { openMissionSuccessModal } from '../modals/MissionSuccessModal.js';

export function startMission(idx) {
  const m = MISSIONS[idx % MISSIONS.length];
  state.missionIndex = idx % MISSIONS.length;
  state.mode = 'mission';
  state.missionTarget = m.target.map(v => ({ ...v }));

  // Reset shapes
  state.shapes = [];
  state.activeShapeId = null;
  state.drawingVertices = [];
  state.pendingPoint = null;
  resetShapeCounters();

  addPolygon(m.start);

  state.historyStack = [];
  state.historyIndex = -1;
  pushHistory();
  renderAll();

  // Show/update mission info bar
  updateMissionBar(m);

  // Enable transform button
  const btn = document.getElementById('btn-transform');
  if (btn) btn.disabled = false;

  document.dispatchEvent(new CustomEvent('modeChanged', { detail: { mode: 'mission' } }));
}

function updateMissionBar(m) {
  let bar = document.getElementById('mission-info');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'mission-info';
    document.getElementById('canvas-area').appendChild(bar);
  }
  bar.textContent = `미션 ${state.missionIndex + 1}: ${m.desc}`;
  bar.style.display = '';
}

export function checkAnswer() {
  const shape = state.shapes.find(s => s.id === state.activeShapeId);
  if (!shape || !state.missionTarget) return;
  const target = state.missionTarget;
  if (shape.vertices.length !== target.length) return;

  const sortKey = v => `${Math.round(v.x * 10)},${Math.round(v.y * 10)}`;
  const activeSet = new Set(shape.vertices.map(sortKey));
  const match = target.every(v => activeSet.has(sortKey(v)));

  if (match) {
    setTimeout(() => {
      const m = MISSIONS[state.missionIndex];
      openMissionSuccessModal(m, state.missionIndex);
    }, 600);
  }
}

export function exitMission() {
  state.mode = 'idle';
  state.missionTarget = null;
  state.shapes = [];
  state.activeShapeId = null;
  state.drawingVertices = [];
  state.pendingPoint = null;
  state.historyStack = [];
  state.historyIndex = -1;
  resetShapeCounters();
  pushHistory();
  renderAll();
  const bar = document.getElementById('mission-info');
  if (bar) bar.style.display = 'none';
  document.dispatchEvent(new CustomEvent('modeChanged', { detail: { mode: 'idle' } }));
}

export { MISSIONS };

import { state }           from '../state.js';
import { renderAll }       from '../canvas/Renderer.js';
import { pushHistory, undo, redo } from '../history/History.js';
import { clearAll, confirmPoint }  from '../shapes/ShapeManager.js';
import { openShapeSelectModal }    from '../modals/ShapeSelectModal.js';
import { openTutorialModal }       from '../modals/TutorialModal.js';

export function initSidebar() {
  // Drawing mode toggle (polygon vs point)
  document.getElementById('draw-sub-polygon')?.addEventListener('click', () => {
    state.drawSubMode = 'polygon';
    updateDrawSubMode();
  });
  document.getElementById('draw-sub-point')?.addEventListener('click', () => {
    state.drawSubMode = 'point';
    state.drawingVertices = [];
    updateDrawSubMode();
    renderAll();
  });

  // Main menu buttons
  document.getElementById('btn-draw')?.addEventListener('click', () => {
    if (state.mode === 'mission') { state.mode = 'idle'; }
    state.mode = 'drawing';
    state.drawingVertices = [];
    state.pendingPoint = null;
    setActiveMenu('btn-draw');
    updateDrawSubMode();
    updateHint();
    renderAll();
    updateModeLabel();
  });

  document.getElementById('btn-transform')?.addEventListener('click', () => {
    if (state.mode === 'drawing' && state.drawingVertices.length > 0) {
      if (!confirm('도형 그리기를 취소할까요?')) return;
      state.drawingVertices = [];
    }
    state.mode = 'idle';
    state.pendingPoint = null;
    setActiveMenu('btn-transform');
    updateDrawSubMode();
    updateHint();
    renderAll();
    updateModeLabel();
    openShapeSelectModal();
  });

  // History
  document.getElementById('btn-undo')?.addEventListener('click', undo);
  document.getElementById('btn-redo')?.addEventListener('click', redo);

  // Clear
  document.getElementById('btn-clear')?.addEventListener('click', () => {
    if (state.shapes.length === 0 && state.drawingVertices.length === 0 && state.pendingPoint === null) return;
    if (!confirm('모든 도형을 지울까요?')) return;
    clearAll();
    state.historyStack = [];
    state.historyIndex = -1;
    pushHistory();
    renderAll();
  });

  // Tutorial
  document.getElementById('btn-tutorial')?.addEventListener('click', () => {
    openTutorialModal(0);
  });

  // Listen to mode changes from mission
  document.addEventListener('modeChanged', e => {
    const { mode } = e.detail;
    if (mode === 'mission') setActiveMenu('btn-mission');
    else { setActiveMenu(null); }
    updateDrawSubMode();
    updateModeLabel();
    updateHint();
  });

  // After shape created
  document.addEventListener('shapeCreated', () => {
    setActiveMenu(null);
    updateDrawSubMode();
    updateModeLabel();
    updateHint();
  });

  updateDrawSubMode();
  updateModeLabel();
  updateHint();
}

function setActiveMenu(id) {
  document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
  if (id) document.getElementById(id)?.classList.add('active');
}

export function updateModeLabel() {
  const labels = {
    drawing: state.drawSubMode === 'point' ? '점 만들기 모드' : '도형 만들기 모드',
    idle:    '이동하기 모드',
    mission: '미션 모드',
  };
  const el = document.getElementById('mode-label');
  if (el) el.textContent = labels[state.mode] || '';
}

export function updateHint() {
  const hintEl = document.getElementById('drawing-hint');
  if (!hintEl) return;
  if (state.mode === 'drawing') {
    if (state.drawSubMode === 'point') {
      hintEl.textContent = '격자 위를 클릭해 위치를 잡고, 더블클릭으로 점을 확정해요.';
    } else {
      hintEl.textContent = '격자 위를 클릭해 꼭짓점을 찍어요. 첫 점 근처를 클릭하면 도형이 완성돼요.';
    }
    hintEl.classList.remove('hidden');
  } else {
    hintEl.classList.add('hidden');
  }
}

function updateDrawSubMode() {
  const polyBtn   = document.getElementById('draw-sub-polygon');
  const pointBtn  = document.getElementById('draw-sub-point');
  const confirmEl = document.getElementById('confirm-point-area');
  if (polyBtn)  polyBtn.classList.toggle('active',  state.drawSubMode === 'polygon');
  if (pointBtn) pointBtn.classList.toggle('active', state.drawSubMode === 'point');
  if (confirmEl) confirmEl.classList.toggle('hidden', state.drawSubMode !== 'point' || state.mode !== 'drawing');
}

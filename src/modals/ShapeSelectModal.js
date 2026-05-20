import { state } from '../state.js';
import { renderAll } from '../canvas/Renderer.js';
import { openTransformModal } from './TransformModal.js';

let overlay = null;

function createOverlay() {
  overlay = document.createElement('div');
  overlay.className = 'modal-overlay hidden';
  overlay.id = 'shape-select-overlay';
  overlay.innerHTML = `
    <div class="modal-card" id="shape-select-modal" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h2 class="modal-title">어떤 도형을 움직일까요?</h2>
        <button class="modal-close-btn" id="sselect-close">X</button>
      </div>
      <p class="modal-desc">움직이고 싶은 도형을 골라봐요!</p>
      <div id="shape-select-list" class="shape-select-list"></div>
      <div class="modal-footer">
        <button class="btn-secondary" id="sselect-cancel">취소</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('#sselect-close').addEventListener('click', closeShapeSelectModal);
  overlay.querySelector('#sselect-cancel').addEventListener('click', closeShapeSelectModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeShapeSelectModal(); });
}

export function openShapeSelectModal() {
  if (!overlay) createOverlay();
  // Populate list
  const list = overlay.querySelector('#shape-select-list');
  list.innerHTML = '';

  if (state.shapes.length === 0) {
    list.innerHTML = '<p class="shape-select-empty">도형이 없어요. 먼저 도형을 만들어봐요!</p>';
  } else {
    state.shapes.forEach(shape => {
      const btn = document.createElement('button');
      btn.className = 'shape-select-item' + (shape.id === state.activeShapeId ? ' selected' : '');
      btn.innerHTML = `
        <span class="shape-item-dot" style="background:${shape.strokeColor}"></span>
        <span class="shape-item-label">${shape.label}</span>
        <span class="shape-item-type">${shape.type === 'point' ? '점' : '다각형'}</span>
      `;
      btn.addEventListener('click', () => {
        state.activeShapeId = shape.id;
        renderAll();
        closeShapeSelectModal();
        openTransformModal();
      });
      list.appendChild(btn);
    });
  }

  overlay.classList.remove('hidden');
}

export function closeShapeSelectModal() {
  if (overlay) overlay.classList.add('hidden');
}

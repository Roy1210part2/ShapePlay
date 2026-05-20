import { state }                      from '../state.js';
import { getActive, deleteShape }     from '../shapes/ShapeManager.js';
import { applyOperations }            from '../transforms/applyOps.js';

let overlay = null;

function createOverlay() {
  overlay = document.createElement('div');
  overlay.className = 'modal-overlay hidden';
  overlay.id = 'transform-overlay';
  overlay.innerHTML = `
    <div class="modal-card" id="transform-modal" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h2 class="modal-title">도형 이동하기</h2>
        <button class="modal-close-btn" id="trans-close">X</button>
      </div>
      <p class="modal-desc">사용할 이동 블록을 켜고, 빈칸을 채워봐요!</p>

      <div class="blocks-container">

        <!-- 밀기 block -->
        <div class="transform-block" id="block-translate">
          <label class="block-toggle-label">
            <input type="checkbox" id="use-translate" class="block-checkbox">
            <span class="block-chip chip-translate">밀기</span>
          </label>
          <div class="block-sentence">
            <select id="inp-dir" class="sent-select">
              <option value="right">오른쪽</option>
              <option value="left">왼쪽</option>
              <option value="up">위</option>
              <option value="down">아래</option>
            </select>
            <span class="sent-word">쪽으로</span>
            <input id="inp-dist" type="text" inputmode="numeric" placeholder="?" class="sent-input">
            <span class="sent-word">칸 밀기</span>
            <span class="error-msg" id="err-dist">숫자!</span>
          </div>
        </div>

        <!-- 뒤집기 block (hidden for points) -->
        <div class="transform-block" id="block-flip">
          <label class="block-toggle-label">
            <input type="checkbox" id="use-flip" class="block-checkbox">
            <span class="block-chip chip-flip">뒤집기</span>
          </label>
          <div class="block-sentence">
            <select id="inp-flip-dir" class="sent-select">
              <option value="right">오른쪽으로</option>
              <option value="left">왼쪽으로</option>
              <option value="up">위로</option>
              <option value="down">아래로</option>
            </select>
            <span class="sent-word">뒤집기</span>
          </div>
        </div>

        <!-- 돌리기 block (hidden for points) -->
        <div class="transform-block" id="block-rotate">
          <label class="block-toggle-label">
            <input type="checkbox" id="use-rotate" class="block-checkbox">
            <span class="block-chip chip-rotate">돌리기</span>
          </label>
          <div class="block-sentence">
            <select id="inp-rotdir" class="sent-select">
              <option value="ccw">반시계 방향</option>
              <option value="cw">시계 방향</option>
            </select>
            <span class="sent-word">으로</span>
            <select id="inp-angle" class="sent-select">
              <option value="90">90도</option>
              <option value="180">180도</option>
              <option value="270">270도</option>
            </select>
            <span class="sent-word">만큼</span>
            <input id="inp-rotcount" type="text" inputmode="numeric" placeholder="1" value="1" class="sent-input">
            <span class="sent-word">번 돌리기</span>
            <span class="error-msg" id="err-rotcount">숫자!</span>
          </div>
        </div>

      </div>

      <div class="modal-footer">
        <button class="btn-danger" id="trans-delete">삭제하기</button>
        <button class="btn-secondary" id="trans-cancel">취소</button>
        <button class="btn-primary" id="trans-apply">적용하기</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#trans-close').addEventListener('click', closeTransformModal);
  overlay.querySelector('#trans-cancel').addEventListener('click', closeTransformModal);
  overlay.querySelector('#trans-apply').addEventListener('click', applyModal);
  overlay.querySelector('#trans-delete').addEventListener('click', () => {
    const shape = getActive();
    if (!shape) { closeTransformModal(); return; }
    if (confirm(`"${shape.label}"을 삭제할까요?`)) {
      closeTransformModal();
      deleteShape(shape.id);
    }
  });
  overlay.addEventListener('click', e => { if (e.target === overlay) closeTransformModal(); });

  // Live input validation
  overlay.querySelectorAll('.sent-input').forEach(inp => {
    inp.addEventListener('input', () => {
      if (!/^-?\d*$/.test(inp.value)) {
        inp.value = inp.value.replace(/[^-\d]/g, '').replace(/(?!^)-/g, '');
        shake();
      }
    });
  });
}

export function openTransformModal() {
  if (!overlay) createOverlay();

  // Hide flip/rotate for points
  const shape = getActive();
  const isPoint = shape && shape.type === 'point';
  overlay.querySelector('#block-flip').style.display   = isPoint ? 'none' : '';
  overlay.querySelector('#block-rotate').style.display = isPoint ? 'none' : '';

  // Reset checkboxes
  ['use-translate', 'use-flip', 'use-rotate'].forEach(id => {
    const el = overlay.querySelector(`#${id}`);
    if (el) el.checked = false;
  });

  overlay.classList.remove('hidden');
}

export function closeTransformModal() {
  if (overlay) overlay.classList.add('hidden');
}

function getVal(id) { return (overlay.querySelector(`#${id}`)?.value || '').trim(); }
function getInt(id, fb = 0) { const n = parseInt(getVal(id), 10); return isNaN(n) ? fb : n; }

function collectOps() {
  const ops = [];
  if (overlay.querySelector('#use-translate')?.checked) {
    ops.push({ type: 'translate', params: { dir: getVal('inp-dir'), dist: getInt('inp-dist', 1) } });
  }
  if (overlay.querySelector('#use-flip')?.checked) {
    // direction values: 'right' | 'left' | 'up' | 'down'
    ops.push({ type: 'flip', params: { direction: getVal('inp-flip-dir') } });
  }
  if (overlay.querySelector('#use-rotate')?.checked) {
    ops.push({ type: 'rotate', params: {
      rotDir: getVal('inp-rotdir'),
      angle:  parseInt(getVal('inp-angle'), 10) || 90,
      count:  getInt('inp-rotcount', 1),
    }});
  }
  return ops;
}

function validate() {
  const intRe = /^-?\d+$/;
  let ok = true;
  const check = (inpId, errId) => {
    const val   = getVal(inpId);
    const valid = intRe.test(val);
    overlay.querySelector(`#${errId}`)?.classList.toggle('visible', !valid);
    overlay.querySelector(`#${inpId}`)?.classList.toggle('error', !valid);
    if (!valid) ok = false;
  };
  if (overlay.querySelector('#use-translate')?.checked) check('inp-dist', 'err-dist');
  if (overlay.querySelector('#use-rotate')?.checked)    check('inp-rotcount', 'err-rotcount');
  return ok;
}

function applyModal() {
  const anyChecked = ['use-translate', 'use-flip', 'use-rotate']
    .some(id => overlay.querySelector(`#${id}`)?.checked);
  if (!anyChecked) { shake(); return; }
  if (!validate())  { shake(); return; }
  const ops = collectOps();
  closeTransformModal();
  applyOperations(ops);
}

function shake() {
  const modal = overlay.querySelector('#transform-modal');
  modal.classList.remove('shake');
  void modal.offsetWidth;
  modal.classList.add('shake');
}

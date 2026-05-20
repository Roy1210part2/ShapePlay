import { startMission } from '../mission/Mission.js';

let overlay = null;
let pendingIdx = 0;

function createOverlay() {
  overlay = document.createElement('div');
  overlay.className = 'modal-overlay hidden';
  overlay.id = 'mission-intro-overlay';
  overlay.innerHTML = `
    <div class="modal-card mission-intro-card" id="mission-intro-modal" role="dialog" aria-modal="true">
      <div class="mission-badge" id="mission-badge">미션 1</div>
      <h2 class="mission-intro-title" id="mission-intro-title">첫 번째 미션!</h2>
      <p class="mission-intro-desc" id="mission-intro-desc"></p>
      <div class="mission-motivation-box">
        <p class="mission-motivation-text" id="mission-motivation-text"></p>
      </div>
      <div class="modal-footer" style="justify-content:center">
        <button class="btn-secondary" id="mission-intro-cancel">취소</button>
        <button class="btn-primary btn-mission-start" id="mission-intro-start">미션 시작!</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('#mission-intro-start').addEventListener('click', () => {
    closeMissionIntroModal();
    startMission(pendingIdx);
  });
  overlay.querySelector('#mission-intro-cancel').addEventListener('click', closeMissionIntroModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeMissionIntroModal(); });
}

export function openMissionIntroModal(mission, idx) {
  if (!overlay) createOverlay();
  pendingIdx = idx;
  overlay.querySelector('#mission-badge').textContent      = `미션 ${idx + 1}`;
  overlay.querySelector('#mission-intro-title').textContent  = mission.introTitle;
  overlay.querySelector('#mission-intro-desc').textContent   = mission.introDesc;
  overlay.querySelector('#mission-motivation-text').textContent = mission.motivationText;
  overlay.classList.remove('hidden');
}

export function closeMissionIntroModal() {
  if (overlay) overlay.classList.add('hidden');
}

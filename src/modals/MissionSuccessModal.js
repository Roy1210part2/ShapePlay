import { startMission, exitMission } from '../mission/Mission.js';
import { MISSIONS } from '../mission/missions.js';

let overlay = null;

function createOverlay() {
  overlay = document.createElement('div');
  overlay.className = 'modal-overlay hidden';
  overlay.id = 'mission-success-overlay';
  overlay.innerHTML = `
    <div class="modal-card success-card" id="mission-success-modal" role="dialog" aria-modal="true">
      <div class="success-stars">* * *</div>
      <h2 class="success-title" id="success-title">완벽해!</h2>
      <p class="success-desc" id="success-desc">미션 클리어!</p>
      <div class="success-actions">
        <button class="btn-primary btn-wide" id="btn-next-mission">다음 미션</button>
        <button class="btn-secondary btn-wide" id="btn-exit-mission">나가기</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#btn-next-mission').addEventListener('click', () => {
    const nextIdx = (parseInt(overlay.dataset.missionIdx, 10) + 1) % MISSIONS.length;
    closeMissionSuccessModal();
    // Import openMissionIntroModal lazily to avoid circular
    import('./MissionIntroModal.js').then(m => {
      m.openMissionIntroModal(MISSIONS[nextIdx], nextIdx);
    });
  });
  overlay.querySelector('#btn-exit-mission').addEventListener('click', () => {
    closeMissionSuccessModal();
    exitMission();
  });
}

export function openMissionSuccessModal(mission, missionIdx) {
  if (!overlay) createOverlay();
  overlay.dataset.missionIdx = String(missionIdx);
  overlay.querySelector('#success-title').textContent = mission.successTitle;
  overlay.querySelector('#success-desc').textContent  = mission.successDesc;
  overlay.classList.remove('hidden');
}

export function closeMissionSuccessModal() {
  if (overlay) overlay.classList.add('hidden');
}

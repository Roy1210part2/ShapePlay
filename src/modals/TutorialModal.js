let overlay = null;
let currentStep = 0;

const STEPS = [
  {
    title: '도형놀이에 오신 것을 환영해요!',
    content: '도형놀이는 격자 위에서 도형을 직접 만들고, 밀기·뒤집기·돌리기를 눈으로 보며 공간 감각을 키우는 수학 학습 도구예요. 격자를 드래그해서 화면을 이동하고, 스크롤로 확대·축소할 수 있어요!',
    icon: 'grid',
  },
  {
    title: '다각형 만들기',
    content: '[도형 만들기] 메뉴 → [다각형] 탭을 선택하세요. 격자 위를 클릭해 꼭짓점을 하나씩 찍어요. 꼭짓점 3개 이상 찍은 뒤 첫 번째 점 근처를 클릭하면 도형이 완성돼요. 도형은 만들 때마다 서로 다른 색으로 표시돼요!',
    icon: 'polygon',
  },
  {
    title: '점 만들기',
    content: '[도형 만들기] 메뉴 → [점] 탭을 선택하세요. 격자 위를 클릭해 원하는 위치에 점을 올려두고, 그 자리에서 더블클릭하면 점이 확정돼요. 점은 밀기(이동)만 할 수 있어요.',
    icon: 'point',
  },
  {
    title: '도형 이동하기',
    content: '[도형 이동하기]를 누르면 움직일 도형을 고르는 창이 나와요. 도형을 고른 후 이동 창에서 밀기·뒤집기·돌리기를 하나 이상 체크하고 값을 입력한 뒤 [적용하기]를 눌러봐요. 이동 후에는 이전 위치가 점선으로 남아 변화를 확인할 수 있어요!',
    icon: 'move',
  },
  {
    title: '뒤집기 — 4가지 방향',
    content: '뒤집기는 오른쪽·왼쪽·위·아래 총 4방향이 있어요. 오른쪽으로 뒤집으면 가장 오른쪽 꼭짓점을 기준으로 수선을 그어 반사시켜요. 마치 그 선에 거울을 세워놓은 것처럼 도형이 옆에 나타나요!',
    icon: 'flip',
  },
  {
    title: '돌리기 — 정사각형 안에서 회전',
    content: '돌리기는 도형을 감싸는 정사각형의 중심을 기준으로 회전해요. 시계 방향 또는 반시계 방향으로 90°·180°·270° 돌릴 수 있어요. 90° 돌리면 도형이 같은 자리에서 방향만 바뀌는 것을 확인해봐요!',
    icon: 'rotate',
  },
  {
    title: '도형 삭제하기',
    content: '[도형 이동하기]로 도형을 선택하면 이동 창 왼쪽 아래에 빨간색 [삭제하기] 버튼이 있어요. 필요없는 도형은 여기서 지울 수 있어요. [처음부터] 버튼은 모든 도형을 한번에 지워요.',
    icon: 'delete',
  },
  {
    title: '되돌리기',
    content: '실수했을 때 걱정하지 마요! 왼쪽 상단 [←] 버튼으로 이전 상태로 돌아가고, [→] 버튼으로 다시 앞으로 갈 수 있어요. 최대 60번까지 기억해요.',
    icon: 'history',
  },
  {
    title: '미션 풀어보기',
    content: '[미션 풀어보기]를 누르면 도전 미션이 시작돼요! 격자에 흐릿하게 표시된 목표 도형을 보고, 주어진 도형을 이동시켜 정확히 맞춰봐요. 밀기·뒤집기·돌리기를 조합해서 도전해봐요!',
    icon: 'mission',
  },
];

const ICON_SVG = {
  grid:    `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="5" width="30" height="30" rx="2"/><line x1="5" y1="15" x2="35" y2="15"/><line x1="5" y1="25" x2="35" y2="25"/><line x1="15" y1="5" x2="15" y2="35"/><line x1="25" y1="5" x2="25" y2="35"/></svg>`,
  polygon: `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2"><polygon points="20,5 35,30 5,30" fill="hsla(250,60%,75%,0.3)"/><circle cx="20" cy="5" r="3" fill="currentColor"/><circle cx="35" cy="30" r="3" fill="currentColor"/><circle cx="5" cy="30" r="3" fill="currentColor"/></svg>`,
  point:   `<svg viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="7" fill="hsla(250,70%,65%,0.9)" stroke="currentColor" stroke-width="2"/></svg>`,
  move:    `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 5 L20 35M5 20 L35 20"/><polyline points="15,10 20,5 25,10"/><polyline points="30,15 35,20 30,25"/><polyline points="25,30 20,35 15,30"/><polyline points="10,25 5,20 10,15"/></svg>`,
  flip:    `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5,30 5,10 18,20" fill="hsla(160,55%,65%,0.3)"/><polygon points="35,30 35,10 22,20" fill="hsla(160,55%,65%,0.3)"/><line x1="20" y1="5" x2="20" y2="35" stroke-dasharray="3,2"/></svg>`,
  rotate:  `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 20 A12 12 0 1 1 20 32" stroke-linecap="round"/><polyline points="5,30 8,20 18,23"/></svg>`,
  history: `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10 A10 10 0 1 0 30 20" stroke-linecap="round"/><polyline points="20,5 20,12 27,12"/></svg>`,
  delete:  `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2"><polyline points="8,12 32,12"/><path d="M16,12V9a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2v3"/><rect x="10" y="12" width="20" height="20" rx="2" fill="hsla(0,60%,70%,0.15)"/><line x1="16" y1="19" x2="16" y2="27"/><line x1="24" y1="19" x2="24" y2="27"/></svg>`,
  mission: `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2"><circle cx="20" cy="20" r="14"/><circle cx="20" cy="20" r="7" fill="hsla(340,55%,70%,0.3)"/><circle cx="20" cy="20" r="2" fill="currentColor"/></svg>`,
};

function createOverlay() {
  overlay = document.createElement('div');
  overlay.className = 'modal-overlay hidden';
  overlay.id = 'tutorial-overlay';
  overlay.innerHTML = `
    <div class="modal-card tutorial-card" id="tutorial-modal" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h2 class="modal-title">사용 방법</h2>
        <button class="modal-close-btn" id="tutorial-close">X</button>
      </div>
      <div class="tutorial-body">
        <div class="tutorial-icon" id="tutorial-icon"></div>
        <div class="tutorial-step-badge" id="tutorial-step-badge">1 / ${STEPS.length}</div>
        <h3 class="tutorial-step-title" id="tutorial-step-title"></h3>
        <p class="tutorial-step-content" id="tutorial-step-content"></p>
      </div>
      <div class="tutorial-progress">
        ${STEPS.map((_, i) => `<div class="tutorial-dot" data-idx="${i}"></div>`).join('')}
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" id="tutorial-prev">이전</button>
        <button class="btn-primary" id="tutorial-next">다음</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('#tutorial-close').addEventListener('click', closeTutorialModal);
  overlay.querySelector('#tutorial-prev').addEventListener('click', prevStep);
  overlay.querySelector('#tutorial-next').addEventListener('click', nextStep);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeTutorialModal(); });
}

function renderStep() {
  const step = STEPS[currentStep];
  overlay.querySelector('#tutorial-icon').innerHTML = ICON_SVG[step.icon] || '';
  overlay.querySelector('#tutorial-step-badge').textContent = `${currentStep + 1} / ${STEPS.length}`;
  overlay.querySelector('#tutorial-step-title').textContent = step.title;
  overlay.querySelector('#tutorial-step-content').textContent = step.content;
  overlay.querySelector('#tutorial-prev').disabled = currentStep === 0;
  const nextBtn = overlay.querySelector('#tutorial-next');
  nextBtn.textContent = currentStep === STEPS.length - 1 ? '완료' : '다음';
  overlay.querySelectorAll('.tutorial-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === currentStep);
    dot.classList.toggle('done', i < currentStep);
  });
}

function prevStep() { if (currentStep > 0) { currentStep--; renderStep(); } }
function nextStep() {
  if (currentStep < STEPS.length - 1) { currentStep++; renderStep(); }
  else closeTutorialModal();
}

export function openTutorialModal(startStep = 0) {
  if (!overlay) createOverlay();
  currentStep = startStep;
  renderStep();
  overlay.classList.remove('hidden');
}

export function closeTutorialModal() {
  if (overlay) overlay.classList.add('hidden');
}

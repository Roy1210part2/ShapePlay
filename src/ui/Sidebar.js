import { state }           from '../state.js';
import { renderAll }       from '../canvas/Renderer.js';
import { pushHistory, undo, redo } from '../history/History.js';
import { clearAll, confirmPoint }  from '../shapes/ShapeManager.js';
import { openShapeSelectModal }    from '../modals/ShapeSelectModal.js';
import { openTutorialModal }       from '../modals/TutorialModal.js';

export function initSidebar() {
  initTheme();
  initSidebarCollapse();
  initMobileSidebar();

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

// ── Theme toggle ─────────────────────────────────────────────
function initTheme() {
  const btn = document.getElementById('btn-theme-toggle');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const isDark =
      document.documentElement.getAttribute('data-theme') === 'dark' ||
      (!document.documentElement.getAttribute('data-theme') &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    const next = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    btn.setAttribute('aria-label', next === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환');
  });
}

// ── Sidebar collapse ──────────────────────────────────────────
function initSidebarCollapse() {
  const btn     = document.getElementById('btn-collapse-sidebar');
  const sidebar = document.getElementById('sidebar');
  if (!btn || !sidebar) return;

  const saved = localStorage.getItem('sidebar-collapsed');
  if (saved === 'true') {
    // Restore collapsed state without animation
    sidebar.style.transition = 'none';
    sidebar.classList.add('collapsed');
    btn.setAttribute('aria-label', '사이드바 펼치기');
    btn.setAttribute('title', '사이드바 펼치기');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        sidebar.style.transition = '';
        document.documentElement.removeAttribute('data-sidebar-collapsed');
      });
    });
  }

  btn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    const isCollapsed = sidebar.classList.contains('collapsed');
    localStorage.setItem('sidebar-collapsed', isCollapsed);
    btn.setAttribute('aria-label', isCollapsed ? '사이드바 펼치기' : '사이드바 접기');
    btn.setAttribute('title', isCollapsed ? '사이드바 펼치기' : '사이드바 접기');
    // Resize canvas after sidebar transition ends
    sidebar.addEventListener('transitionend', () => {
      window.dispatchEvent(new Event('resize'));
    }, { once: true });
  });
}

// ── Mobile sidebar drawer ─────────────────────────────────────
function initMobileSidebar() {
  const menuBtn  = document.getElementById('btn-mobile-menu');
  const backdrop = document.getElementById('sidebar-backdrop');
  const sidebar  = document.getElementById('sidebar');
  if (!menuBtn || !backdrop || !sidebar) return;

  function openDrawer() {
    sidebar.classList.add('mobile-open');
    backdrop.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    sidebar.classList.remove('mobile-open');
    backdrop.classList.add('hidden');
    document.body.style.overflow = '';
  }

  menuBtn.addEventListener('click', openDrawer);
  backdrop.addEventListener('click', closeDrawer);

  // Close drawer when a main-menu button is clicked (navigation happened)
  document.querySelectorAll('.menu-btn').forEach(b => {
    b.addEventListener('click', () => {
      if (window.innerWidth < 768) closeDrawer();
    });
  });
}

function updateDrawSubMode() {
  const polyBtn   = document.getElementById('draw-sub-polygon');
  const pointBtn  = document.getElementById('draw-sub-point');
  const confirmEl = document.getElementById('confirm-point-area');
  if (polyBtn)  polyBtn.classList.toggle('active',  state.drawSubMode === 'polygon');
  if (pointBtn) pointBtn.classList.toggle('active', state.drawSubMode === 'point');
  if (confirmEl) confirmEl.classList.toggle('hidden', state.drawSubMode !== 'point' || state.mode !== 'drawing');
}

import { initCanvas }    from './canvas/Canvas.js';
import { pushHistory }   from './history/History.js';
import { initSidebar, updateModeLabel, updateHint } from './ui/Sidebar.js';
import { bindCanvasEvents } from './ui/Events.js';
import { renderAll }     from './canvas/Renderer.js';

document.addEventListener('DOMContentLoaded', () => {
  initCanvas();
  pushHistory();
  initSidebar();
  bindCanvasEvents();
  updateModeLabel();
  updateHint();
  renderAll();
});

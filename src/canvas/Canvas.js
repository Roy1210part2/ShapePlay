import { state }     from '../state.js';
import { renderAll } from './Renderer.js';
import { zoomGrid }  from './Grid.js';

export function initCanvas() {
  const el  = document.getElementById('main-canvas');
  const dpr = window.devicePixelRatio || 1;

  function resize() {
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    el.width  = w * dpr;
    el.height = h * dpr;
    el.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    state.origin = { x: w / 2, y: h / 2 };
    renderAll();
  }

  resize();
  window.addEventListener('resize', resize);
}

export { renderAll };

export function getLogicalSize() {
  const el  = document.getElementById('main-canvas');
  const dpr = window.devicePixelRatio || 1;
  return { w: el.width / dpr, h: el.height / dpr };
}

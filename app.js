'use strict';

// ==================== State ====================
const state = {
  zoom: 36,
  origin: { x: 0, y: 0 },
  shapes: [],
  activeShapeId: null,
  drawingVertices: [],
  mousePos: null,
  mode: 'drawing', // 'drawing' | 'idle' | 'transforming' | 'mission'
  historyStack: [],
  historyIndex: -1,
  animating: false,
  missionIndex: 0,
  missionTarget: null,
  missionStartVerts: null,
};

// ==================== Config ====================
const SHAPE_COLORS = [
  { fill: 'hsla(210, 40%, 68%, 0.28)', stroke: 'hsla(210, 40%, 48%, 0.9)'  },
  { fill: 'hsla(150, 38%, 60%, 0.28)', stroke: 'hsla(150, 38%, 40%, 0.9)'  },
  { fill: 'hsla(30,  45%, 65%, 0.28)', stroke: 'hsla(30,  45%, 45%, 0.9)'  },
  { fill: 'hsla(280, 35%, 65%, 0.28)', stroke: 'hsla(280, 35%, 48%, 0.9)'  },
];
const CLOSE_THRESHOLD = 12;
const GRID_SIZE = 20;
const ANIM_DURATION = 480;

// ==================== Grid =====================
const grid = {
  toPixel(gx, gy) {
    return {
      px: state.origin.x + gx * state.zoom,
      py: state.origin.y - gy * state.zoom,
    };
  },
  toGrid(px, py) {
    return {
      gx: Math.round((px - state.origin.x) / state.zoom),
      gy: Math.round((state.origin.y - py) / state.zoom),
    };
  },
  zoom(factor, centerPx) {
    const old = state.zoom;
    const nw  = Math.min(90, Math.max(14, old * factor));
    state.origin.x = centerPx.x - (centerPx.x - state.origin.x) * (nw / old);
    state.origin.y = centerPx.y - (centerPx.y - state.origin.y) * (nw / old);
    state.zoom = nw;
    canvas.render();
  },
};

// ==================== Canvas ===================
const canvas = {
  el: null,
  ctx: null,

  init() {
    this.el  = document.getElementById('main-canvas');
    this.ctx = this.el.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
  },

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const w   = this.el.offsetWidth;
    const h   = this.el.offsetHeight;
    this.el.width  = w * dpr;
    this.el.height = h * dpr;
    this.ctx.scale(dpr, dpr);
    state.origin = { x: w / 2, y: h / 2 };
    this.render();
  },

  getLogicalSize() {
    const dpr = window.devicePixelRatio || 1;
    return { w: this.el.width / dpr, h: this.el.height / dpr };
  },

  render() {
    if (state.animating) return;
    const ctx = this.ctx;
    const { w, h } = this.getLogicalSize();
    ctx.clearRect(0, 0, w, h);
    this._drawGrid(ctx, w, h);
    if (state.mode === 'mission' && state.missionTarget) {
      this._drawGhost(ctx);
    }
    state.shapes.forEach(s => this._drawShape(ctx, s));
    if (state.mode === 'drawing') {
      this._drawPreview(ctx);
    }
  },

  _drawGrid(ctx, w, h) {
    const { origin, zoom } = state;
    const cs = getComputedStyle(document.documentElement);
    const lineColor = cs.getPropertyValue('--grid-line').trim();
    const axisColor = cs.getPropertyValue('--grid-axis').trim();
    const dotColor  = cs.getPropertyValue('--grid-dot').trim();

    // grid lines
    ctx.save();
    ctx.strokeStyle = lineColor;
    ctx.lineWidth   = 0.5;
    const sx = ((origin.x % zoom) + zoom) % zoom;
    const sy = ((origin.y % zoom) + zoom) % zoom;
    for (let x = sx; x < w; x += zoom) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = sy; y < h; y += zoom) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // axis lines
    ctx.strokeStyle = axisColor;
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(origin.x, 0); ctx.lineTo(origin.x, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, origin.y); ctx.lineTo(w, origin.y); ctx.stroke();

    // grid dots at intersections
    ctx.fillStyle = dotColor;
    for (let x = sx; x < w; x += zoom) {
      for (let y = sy; y < h; y += zoom) {
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // axis labels
    ctx.fillStyle  = axisColor;
    ctx.font       = `${Math.max(9, zoom * 0.3)}px monospace`;
    ctx.textAlign  = 'center';
    ctx.textBaseline = 'top';
    for (let gx = -GRID_SIZE; gx <= GRID_SIZE; gx++) {
      if (gx === 0) continue;
      const px = origin.x + gx * zoom;
      if (px < 4 || px > w - 4) continue;
      ctx.fillText(String(gx), px, origin.y + 3);
    }
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'middle';
    for (let gy = -GRID_SIZE; gy <= GRID_SIZE; gy++) {
      if (gy === 0) continue;
      const py = origin.y - gy * zoom;
      if (py < 4 || py > h - 4) continue;
      ctx.fillText(String(gy), origin.x - 4, py);
    }
    ctx.restore();
  },

  _drawShape(ctx, shape, verts) {
    const vertices = verts || shape.vertices;
    if (vertices.length < 2) return;
    const pixels    = vertices.map(v => grid.toPixel(v.x, v.y));
    const isActive  = shape.id === state.activeShapeId;

    ctx.save();
    ctx.beginPath();
    pixels.forEach((p, i) => i === 0 ? ctx.moveTo(p.px, p.py) : ctx.lineTo(p.px, p.py));
    ctx.closePath();
    ctx.fillStyle   = shape.fillColor;
    ctx.strokeStyle = isActive ? shape.strokeColor.replace('0.9)', '1)') : shape.strokeColor;
    ctx.lineWidth   = isActive ? 2.5 : 2;
    ctx.fill();
    ctx.stroke();

    // selection glow
    if (isActive) {
      ctx.shadowColor = shape.strokeColor;
      ctx.shadowBlur  = 8;
      ctx.stroke();
      ctx.shadowBlur  = 0;
    }

    // vertex dots
    pixels.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.px, p.py, isActive ? 5 : 4, 0, Math.PI * 2);
      ctx.fillStyle = shape.strokeColor;
      ctx.fill();
    });
    ctx.restore();
  },

  _drawGhost(ctx) {
    const target = state.missionTarget;
    const pixels = target.map(v => grid.toPixel(v.x, v.y));

    ctx.save();
    ctx.beginPath();
    pixels.forEach((p, i) => i === 0 ? ctx.moveTo(p.px, p.py) : ctx.lineTo(p.px, p.py));
    ctx.closePath();
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = 'hsla(145, 50%, 50%, 0.55)';
    ctx.lineWidth   = 2.5;
    ctx.fillStyle   = 'hsla(145, 50%, 60%, 0.1)';
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  },

  _drawPreview(ctx) {
    const verts = state.drawingVertices;
    if (verts.length === 0) return;
    const pixels = verts.map(v => grid.toPixel(v.x, v.y));

    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = 'hsla(210, 40%, 50%, 0.75)';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    pixels.forEach((p, i) => i === 0 ? ctx.moveTo(p.px, p.py) : ctx.lineTo(p.px, p.py));
    if (state.mousePos) ctx.lineTo(state.mousePos.x, state.mousePos.y);
    ctx.stroke();
    ctx.setLineDash([]);

    pixels.forEach((p, i) => {
      ctx.beginPath();
      ctx.arc(p.px, p.py, i === 0 ? 7 : 4, 0, Math.PI * 2);
      ctx.fillStyle   = i === 0 ? 'hsla(210, 60%, 55%, 0.9)' : 'hsla(210, 40%, 68%, 0.9)';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth   = 1.5;
      ctx.fill();
      ctx.stroke();
    });
    ctx.restore();
  },
};

// ==================== Shapes ===================
const shapes = {
  nextColorIdx: 0,

  add(vertices) {
    const color = SHAPE_COLORS[this.nextColorIdx % SHAPE_COLORS.length];
    this.nextColorIdx++;
    const shape = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      vertices: vertices.map(v => ({ ...v })),
      fillColor:   color.fill,
      strokeColor: color.stroke,
    };
    state.shapes.push(shape);
    state.activeShapeId = shape.id;
    return shape;
  },

  getActive() {
    return state.shapes.find(s => s.id === state.activeShapeId) || null;
  },

  // Ray-casting point-in-polygon (pixel coords)
  _pointInShape(px, py, shape) {
    const pixels = shape.vertices.map(v => grid.toPixel(v.x, v.y));
    let inside = false;
    for (let i = 0, j = pixels.length - 1; i < pixels.length; j = i++) {
      const xi = pixels[i].px, yi = pixels[i].py;
      const xj = pixels[j].px, yj = pixels[j].py;
      if (((yi > py) !== (yj > py)) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
    return inside;
  },

  handleCanvasClick(px, py) {
    // In idle/mission mode: click on shape to select & open modal
    if (state.mode === 'idle' || state.mode === 'mission') {
      const hit = [...state.shapes].reverse().find(s => this._pointInShape(px, py, s));
      if (hit) {
        state.activeShapeId = hit.id;
        canvas.render();
        modal.open();
        return;
      }
    }

    if (state.mode !== 'drawing') return;
    const { gx, gy } = grid.toGrid(px, py);
    const verts = state.drawingVertices;

    if (verts.length >= 3) {
      const firstPx = grid.toPixel(verts[0].x, verts[0].y);
      const dist = Math.hypot(px - firstPx.px, py - firstPx.py);
      if (dist < CLOSE_THRESHOLD) {
        this._closePolygon();
        return;
      }
    }

    const dup = verts.some(v => v.x === gx && v.y === gy);
    if (!dup) {
      verts.push({ x: gx, y: gy });
      canvas.render();
    }
  },

  _closePolygon() {
    const verts = state.drawingVertices;
    if (verts.length < 3) return;
    const shape = this.add(verts);
    state.drawingVertices = [];
    state.mode = 'idle';
    history_.push();
    canvas.render();
    ui.updateModeLabel('idle');
    ui.updateDrawingHint(false);
    document.getElementById('btn-draw').classList.remove('active');
    document.getElementById('btn-transform').disabled = false;
  },
};

// ==================== Transform ================
const transform = {
  translate(vertices, dx, dy) {
    return vertices.map(v => ({ x: v.x + dx, y: v.y + dy }));
  },

  reflect(vertices, axis, axisVal) {
    return vertices.map(v => {
      if (axis === 'x') return { x: v.x,               y: 2 * axisVal - v.y };
      if (axis === 'y') return { x: 2 * axisVal - v.x, y: v.y               };
      return v;
    });
  },

  rotate(vertices, cx, cy, deg) {
    const rad = (deg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return vertices.map(v => {
      const dx = v.x - cx;
      const dy = v.y - cy;
      return {
        x: Math.round((cx + dx * cos - dy * sin) * 100) / 100,
        y: Math.round((cy + dx * sin + dy * cos) * 100) / 100,
      };
    });
  },

  // New API: accepts list of {type, params} operations
  // params for translate: { dir: 'right'|'left'|'up'|'down', dist: int }
  // params for reflect:   { axis: 'x'|'y', count: int }
  // params for rotate:    { cx, cy, rotDir: 'cw'|'ccw', angle: int, count: int }
  applyList(operations) {
    const shape = shapes.getActive();
    if (!shape || state.animating) return;

    // Compute final vertex positions by composing all transforms
    let verts = shape.vertices.map(v => ({ ...v }));
    let hasFlip = false;

    for (const op of operations) {
      if (op.type === 'translate') {
        const { dir, dist } = op.params;
        const dirMap = { right: [dist, 0], left: [-dist, 0], up: [0, dist], down: [0, -dist] };
        const [dx, dy] = dirMap[dir] || [0, 0];
        verts = this.translate(verts, dx, dy);
      } else if (op.type === 'reflect') {
        const { axis, count } = op.params;
        const effectiveCount = ((count % 2) + 2) % 2; // only odd counts matter
        for (let i = 0; i < effectiveCount; i++) {
          verts = this.reflect(verts, axis, 0);
          hasFlip = true;
        }
      } else if (op.type === 'rotate') {
        const { cx, cy, rotDir, angle, count } = op.params;
        const sign = rotDir === 'cw' ? -1 : 1;
        const totalAngle = sign * angle * count;
        verts = this.rotate(verts, cx, cy, totalAngle);
      }
    }

    const finalVerts = verts;
    const onDone = () => {
      shape.vertices = finalVerts;
      history_.push();
      canvas.render();
      if (state.mode === 'mission') mission.checkAnswer();
    };

    if (hasFlip && operations.length === 1) {
      anim.playFlip(shape, finalVerts, onDone);
    } else {
      anim.playMorph(shape, finalVerts, onDone);
    }
  },
};

// ==================== Animation ================
const anim = {
  _ease(t) { return t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t; },

  // General morph (translate/rotate): interpolate vertex positions
  playMorph(shape, targetVerts, onDone) {
    state.animating = true;
    const origVerts = shape.vertices.map(v => ({ ...v }));
    const start     = performance.now();
    const ctx       = canvas.ctx;

    const frame = (now) => {
      const t  = Math.min((now - start) / ANIM_DURATION, 1);
      const et = this._ease(t);

      const interVerts = origVerts.map((v, i) => ({
        x: v.x + (targetVerts[i].x - v.x) * et,
        y: v.y + (targetVerts[i].y - v.y) * et,
      }));

      const { w, h } = canvas.getLogicalSize();
      ctx.clearRect(0, 0, w, h);
      canvas._drawGrid(ctx, w, h);
      if (state.mode === 'mission' && state.missionTarget) canvas._drawGhost(ctx);

      // Draw other shapes normally
      state.shapes.forEach(s => { if (s.id !== shape.id) canvas._drawShape(ctx, s); });
      canvas._drawShape(ctx, shape, interVerts);

      if (t < 1) requestAnimationFrame(frame);
      else { state.animating = false; onDone(); }
    };
    requestAnimationFrame(frame);
  },

  // 3D flip: scaleX 1→0 (original) then 0→1 (flipped) - paper fold effect
  playFlip(shape, targetVerts, onDone) {
    state.animating = true;
    const origVerts = shape.vertices.map(v => ({ ...v }));
    const start     = performance.now();
    const ctx       = canvas.ctx;

    const frame = (now) => {
      const t  = Math.min((now - start) / ANIM_DURATION, 1);
      const { w, h } = canvas.getLogicalSize();
      ctx.clearRect(0, 0, w, h);
      canvas._drawGrid(ctx, w, h);
      if (state.mode === 'mission' && state.missionTarget) canvas._drawGhost(ctx);
      state.shapes.forEach(s => { if (s.id !== shape.id) canvas._drawShape(ctx, s); });

      let scaleX, verts;
      if (t < 0.5) {
        scaleX = 1 - this._ease(t * 2);
        verts  = origVerts;
      } else {
        scaleX = this._ease((t - 0.5) * 2);
        verts  = targetVerts;
      }

      this._drawScaled(ctx, shape, verts, scaleX);

      if (t < 1) requestAnimationFrame(frame);
      else { state.animating = false; onDone(); }
    };
    requestAnimationFrame(frame);
  },

  _drawScaled(ctx, shape, verts, scaleX) {
    const pixels = verts.map(v => grid.toPixel(v.x, v.y));
    const xs = pixels.map(p => p.px);
    const ys = pixels.map(p => p.py);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(Math.max(0.001, scaleX), 1);
    ctx.translate(-cx, -cy);

    ctx.beginPath();
    pixels.forEach((p, i) => i === 0 ? ctx.moveTo(p.px, p.py) : ctx.lineTo(p.px, p.py));
    ctx.closePath();
    ctx.fillStyle   = shape.fillColor;
    ctx.strokeStyle = shape.strokeColor;
    ctx.lineWidth   = 2;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  },
};

// ==================== History ==================
const history_ = {
  MAX: 60,

  _snap() {
    return {
      shapes: state.shapes.map(s => ({
        ...s,
        vertices: s.vertices.map(v => ({ ...v })),
      })),
      activeShapeId: state.activeShapeId,
    };
  },

  push() {
    const stack = state.historyStack;
    stack.splice(state.historyIndex + 1);
    stack.push(this._snap());
    if (stack.length > this.MAX) stack.shift();
    state.historyIndex = stack.length - 1;
    this._updateButtons();
  },

  undo() {
    if (state.historyIndex <= 0) return;
    state.historyIndex--;
    this._restore();
  },

  redo() {
    if (state.historyIndex >= state.historyStack.length - 1) return;
    state.historyIndex++;
    this._restore();
  },

  _restore() {
    const snap = state.historyStack[state.historyIndex];
    state.shapes = snap.shapes.map(s => ({
      ...s,
      vertices: s.vertices.map(v => ({ ...v })),
    }));
    state.activeShapeId = snap.activeShapeId;
    canvas.render();
    this._updateButtons();
  },

  _updateButtons() {
    const idx = state.historyIndex;
    document.getElementById('btn-undo').disabled = idx <= 0;
    document.getElementById('btn-redo').disabled = idx >= state.historyStack.length - 1;
  },
};

// ==================== Modal ====================
const modal = {
  open() {
    // uncheck all blocks
    ['use-translate', 'use-reflect', 'use-rotate'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.checked = false;
    });
    document.getElementById('modal-overlay').classList.remove('hidden');
    this._bindValidation();
  },

  close() {
    document.getElementById('modal-overlay').classList.add('hidden');
  },

  _getVal(id) {
    return (document.getElementById(id)?.value || '').trim();
  },
  _getInt(id, fallback = 0) {
    const n = parseInt(this._getVal(id), 10);
    return isNaN(n) ? fallback : n;
  },

  _collectOperations() {
    const ops = [];
    if (document.getElementById('use-translate')?.checked) {
      ops.push({
        type: 'translate',
        params: {
          dir:  document.getElementById('inp-dir')?.value || 'right',
          dist: this._getInt('inp-dist', 1),
        },
      });
    }
    if (document.getElementById('use-reflect')?.checked) {
      ops.push({
        type: 'reflect',
        params: {
          axis:  document.getElementById('inp-axis')?.value || 'x',
          count: this._getInt('inp-rcount', 1),
        },
      });
    }
    if (document.getElementById('use-rotate')?.checked) {
      ops.push({
        type: 'rotate',
        params: {
          rotDir: document.getElementById('inp-rotdir')?.value || 'ccw',
          angle:  this._getInt('inp-angle', 90),
          count:  this._getInt('inp-rotcount', 1),
          cx:     this._getInt('inp-cx', 0),
          cy:     this._getInt('inp-cy', 0),
        },
      });
    }
    return ops;
  },

  _validate() {
    const intRe = /^-?\d+$/;
    let ok = true;

    const check = (inpId, errId) => {
      const val = this._getVal(inpId);
      const valid = intRe.test(val);
      document.getElementById(errId)?.classList.toggle('visible', !valid);
      document.getElementById(inpId)?.classList.toggle('error', !valid);
      if (!valid) ok = false;
    };

    if (document.getElementById('use-translate')?.checked) {
      check('inp-dist', 'err-dist');
    }
    if (document.getElementById('use-reflect')?.checked) {
      check('inp-rcount', 'err-rcount');
    }
    if (document.getElementById('use-rotate')?.checked) {
      check('inp-rotcount', 'err-rotcount');
    }
    return ok;
  },

  apply() {
    const anyChecked = ['use-translate', 'use-reflect', 'use-rotate']
      .some(id => document.getElementById(id)?.checked);
    if (!anyChecked) { this._shake(); return; }
    if (!this._validate()) { this._shake(); return; }

    const ops = this._collectOperations();
    this.close();
    transform.applyList(ops);
  },

  _shake() {
    const mod = document.getElementById('modal');
    mod.classList.remove('shake');
    void mod.offsetWidth;
    mod.classList.add('shake');
  },

  _bindValidation() {
    const inputs = document.querySelectorAll('#modal .sent-input');
    inputs.forEach(input => {
      if (input._modalBound) return;
      input._modalBound = true;
      input.addEventListener('input', () => {
        const val = input.value;
        if (!/^-?\d*$/.test(val)) {
          input.value = val.replace(/[^-\d]/g, '').replace(/(?!^)-/g, '');
          this._shake();
        }
      });
    });
  },
};

// ==================== Mission =================
const MISSIONS = [
  {
    desc: '삼각형을 오른쪽으로 4칸, 위로 2칸 밀어보세요!',
    start:  [{ x: -4, y: -2 }, { x: -2, y: -2 }, { x: -3, y: 0 }],
    target: [{ x:  0, y:  0 }, { x:  2, y:  0 }, { x:  1, y: 2 }],
  },
  {
    desc: '사각형을 y축 기준으로 뒤집어보세요!',
    start:  [{ x: 1, y: 0 }, { x: 3, y: 0 }, { x: 3, y: 2 }, { x: 1, y: 2 }],
    target: [{ x:-1, y: 0 }, { x:-3, y: 0 }, { x:-3, y: 2 }, { x:-1, y: 2 }],
  },
  {
    desc: '삼각형을 원점 중심으로 90° (반시계) 돌려보세요!',
    start:  [{ x: 1, y: 0 }, { x: 3, y: 0 }, { x: 2, y: 2 }],
    target: [{ x: 0, y: 1 }, { x: 0, y: 3 }, { x:-2, y: 2 }],
  },
];

const mission = {
  start(idx) {
    const m = MISSIONS[idx % MISSIONS.length];
    state.missionIndex = idx % MISSIONS.length;
    state.mode = 'mission';
    state.missionTarget = m.target.map(v => ({ ...v }));

    state.shapes = [];
    state.activeShapeId = null;
    shapes.nextColorIdx = 0;
    shapes.add(m.start);

    state.historyStack = [];
    state.historyIndex = -1;
    history_.push();
    canvas.render();

    // info bar
    let bar = document.getElementById('mission-info');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'mission-info';
      document.getElementById('canvas-area').appendChild(bar);
    }
    bar.textContent = `🎯 미션 ${state.missionIndex + 1}: ${m.desc}`;
    bar.style.display = '';

    document.getElementById('btn-transform').disabled = false;
    ui.updateModeLabel('mission');
  },

  checkAnswer() {
    const shape = shapes.getActive();
    if (!shape || !state.missionTarget) return;
    const target = state.missionTarget;
    if (shape.vertices.length !== target.length) return;

    const sortKey = v => `${Math.round(v.x)},${Math.round(v.y)}`;
    const activeSet = new Set(shape.vertices.map(sortKey));
    const match = target.every(v => activeSet.has(sortKey(v)));

    if (match) {
      setTimeout(() => {
        document.getElementById('mission-success').classList.remove('hidden');
      }, 600);
    }
  },

  exitMission() {
    state.mode = 'idle';
    state.missionTarget = null;
    state.shapes = [];
    state.activeShapeId = null;
    state.historyStack = [];
    state.historyIndex = -1;
    history_.push();
    canvas.render();
    const bar = document.getElementById('mission-info');
    if (bar) bar.style.display = 'none';
    document.getElementById('mission-success').classList.add('hidden');
    ui.updateModeLabel('idle');
  },
};

// ==================== UI ====================
const ui = {
  updateModeLabel(mode) {
    const labels = {
      drawing:      '🛠 도형 만들기 모드',
      idle:         '🚀 도형 이동하기 모드',
      transforming: '🔄 이동 중...',
      mission:      '🎯 미션 모드',
    };
    document.getElementById('mode-label').textContent = labels[mode] || '';
  },

  updateDrawingHint(show) {
    document.getElementById('drawing-hint').classList.toggle('hidden', !show);
  },

  bindAll() {
    // Sidebar buttons
    document.getElementById('btn-draw').addEventListener('click', () => {
      state.mode = 'drawing';
      state.drawingVertices = [];
      document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
      document.getElementById('btn-draw').classList.add('active');
      this.updateModeLabel('drawing');
      this.updateDrawingHint(true);
      canvas.render();
    });

    document.getElementById('btn-transform').addEventListener('click', () => {
      state.mode = 'idle';
      state.drawingVertices = [];
      document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
      document.getElementById('btn-transform').classList.add('active');
      this.updateModeLabel('idle');
      this.updateDrawingHint(false);
      canvas.render();
      // If there's already an active shape, open modal immediately
      if (state.activeShapeId) modal.open();
    });

    document.getElementById('btn-mission').addEventListener('click', () => {
      mission.start(0);
      document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
      document.getElementById('btn-mission').classList.add('active');
    });

    document.getElementById('btn-undo').addEventListener('click', () => history_.undo());
    document.getElementById('btn-redo').addEventListener('click', () => history_.redo());

    document.getElementById('btn-clear').addEventListener('click', () => {
      if (state.shapes.length === 0) return;
      if (!confirm('도형을 모두 지울까요?')) return;
      state.shapes = [];
      state.activeShapeId = null;
      state.drawingVertices = [];
      history_.push();
      canvas.render();
    });

    // Modal buttons
    document.getElementById('btn-apply').addEventListener('click',       () => modal.apply());
    document.getElementById('btn-modal-close').addEventListener('click', () => modal.close());
    document.getElementById('btn-modal-cancel').addEventListener('click',() => modal.close());
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target === document.getElementById('modal-overlay')) modal.close();
    });

    // Mission success overlay
    document.getElementById('btn-next-mission').addEventListener('click', () => {
      document.getElementById('mission-success').classList.add('hidden');
      mission.start(state.missionIndex + 1);
    });
    document.getElementById('btn-exit-mission').addEventListener('click', () => {
      mission.exitMission();
    });

    // Canvas: click
    document.getElementById('main-canvas').addEventListener('click', (e) => {
      const rect = canvas.el.getBoundingClientRect();
      shapes.handleCanvasClick(e.clientX - rect.left, e.clientY - rect.top);
    });

    // Canvas: mousemove
    document.getElementById('main-canvas').addEventListener('mousemove', (e) => {
      const rect = canvas.el.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      if (state.mode === 'drawing') {
        state.mousePos = { x: px, y: py };
        canvas.el.style.cursor = 'crosshair';
        canvas.render();
      } else if (state.mode === 'idle' || state.mode === 'mission') {
        // hover cursor: pointer if over a shape
        const hit = state.shapes.some(s => shapes._pointInShape(px, py, s));
        canvas.el.style.cursor = hit ? 'pointer' : 'default';
      }
    });
    document.getElementById('main-canvas').addEventListener('mouseleave', () => {
      state.mousePos = null;
      canvas.render();
    });

    // Canvas: wheel zoom
    document.getElementById('main-canvas').addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect   = canvas.el.getBoundingClientRect();
      const center = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      grid.zoom(e.deltaY < 0 ? 1.12 : 0.88, center);
    }, { passive: false });

    // Touch pinch-to-zoom
    let lastDist = null;
    document.getElementById('main-canvas').addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dx   = e.touches[0].clientX - e.touches[1].clientX;
        const dy   = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        if (lastDist !== null) {
          const rect = canvas.el.getBoundingClientRect();
          const cx   = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
          const cy   = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
          grid.zoom(dist / lastDist, { x: cx, y: cy });
        }
        lastDist = dist;
      }
    }, { passive: false });
    document.getElementById('main-canvas').addEventListener('touchend', () => { lastDist = null; });

    // Touch tap as click for drawing
    document.getElementById('main-canvas').addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        const rect = canvas.el.getBoundingClientRect();
        shapes.handleCanvasClick(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
      }
    }, { passive: true });
  },
};

// ==================== Init ====================
document.addEventListener('DOMContentLoaded', () => {
  canvas.init();
  history_.push();
  ui.bindAll();
  ui.updateModeLabel('drawing');
  ui.updateDrawingHint(true);
});

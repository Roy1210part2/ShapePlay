import { state }         from '../state.js';
import { getActive }     from '../shapes/ShapeManager.js';
import { translateVerts } from './translate.js';
import { flipVerts }      from './flip.js';
import { rotateVerts }    from './rotate.js';
import { playMorph, playFlip } from '../animation/Animator.js';
import { pushHistory }   from '../history/History.js';
import { renderAll }     from '../canvas/Renderer.js';
import { checkAnswer }   from '../mission/Mission.js';

export function applyOperations(operations) {
  const shape = getActive();
  if (!shape || state.animating) return;
  // Save current position as ghost before transform
  shape.prevVerts = shape.vertices.map(v => ({ ...v }));
  if (shape.type === 'point') {
    // Points only support translate
    const transOps = operations.filter(o => o.type === 'translate');
    if (transOps.length === 0) return;
    let verts = shape.vertices.map(v => ({ ...v }));
    for (const op of transOps) {
      const { dir, dist } = op.params;
      const map = { right: [dist, 0], left: [-dist, 0], up: [0, dist], down: [0, -dist] };
      const [dx, dy] = map[dir] || [0, 0];
      verts = translateVerts(verts, dx, dy);
    }
    const finalVerts = verts;
    playMorph(shape, finalVerts, () => {
      shape.vertices = finalVerts;
      pushHistory();
      renderAll();
      if (state.mode === 'mission') checkAnswer();
    });
    return;
  }

  let verts = shape.vertices.map(v => ({ ...v }));
  let isFlipOnly = operations.length === 1 && operations[0].type === 'flip';

  for (const op of operations) {
    if (op.type === 'translate') {
      const { dir, dist } = op.params;
      const map = { right: [dist, 0], left: [-dist, 0], up: [0, dist], down: [0, -dist] };
      const [dx, dy] = map[dir] || [0, 0];
      verts = translateVerts(verts, dx, dy);
    } else if (op.type === 'flip') {
      verts = flipVerts(verts, op.params.direction);
    } else if (op.type === 'rotate') {
      const { rotDir, angle, count } = op.params;
      const sign = rotDir === 'cw' ? -1 : 1;
      verts = rotateVerts(verts, sign * angle * count);
    }
  }

  const finalVerts = verts;
  const done = () => {
    shape.vertices = finalVerts;
    pushHistory();
    renderAll();
    if (state.mode === 'mission') checkAnswer();
  };

  if (isFlipOnly) playFlip(shape, finalVerts, done);
  else            playMorph(shape, finalVerts, done);
}

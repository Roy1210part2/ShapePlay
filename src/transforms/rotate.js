import { GRID_SIZE } from '../config.js';

// Rotate around the center of the shape's bounding square.
// This keeps the rotated result within the same bounding area,
// matching the Korean elementary math "정사각형 안에서 돌리기" concept.
export function rotateVerts(vertices, deg) {
  const xs = vertices.map(v => v.x);
  const ys = vertices.map(v => v.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);

  // Center of bounding box (not centroid) — keeps shape in its bounding square
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const rotated = vertices.map(v => {
    const dx = v.x - cx;
    const dy = v.y - cy;
    // Round to nearest integer so vertices snap to grid intersections.
    // 90°/180°/270° rotations always land within 0.5 of a grid point.
    return {
      x: Math.round(cx + dx * cos - dy * sin),
      y: Math.round(cy + dx * sin + dy * cos),
    };
  });

  return clampWithinGrid(rotated);
}

function clampWithinGrid(vertices) {
  const LIMIT = GRID_SIZE - 1;
  const xs = vertices.map(v => v.x);
  const ys = vertices.map(v => v.y);
  let dx = 0, dy = 0;
  const maxX = Math.max(...xs), minX = Math.min(...xs);
  const maxY = Math.max(...ys), minY = Math.min(...ys);
  if (maxX >  LIMIT) dx = LIMIT - maxX;
  if (minX < -LIMIT) dx = -LIMIT - minX;
  if (maxY >  LIMIT) dy = LIMIT - maxY;
  if (minY < -LIMIT) dy = -LIMIT - minY;
  if (dx === 0 && dy === 0) return vertices;
  return vertices.map(v => ({ x: v.x + dx, y: v.y + dy }));
}

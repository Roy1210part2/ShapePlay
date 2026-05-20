// direction: 'right' | 'left' | 'up' | 'down'
// Reflects over the boundary vertex line (adjacent placement after flip)
export function flipVerts(vertices, direction) {
  if (direction === 'right') {
    // reflect over vertical line at rightmost x → shape appears to the right
    const maxX = Math.max(...vertices.map(v => v.x));
    return vertices.map(v => ({ x: 2 * maxX - v.x, y: v.y }));
  }
  if (direction === 'left') {
    // reflect over vertical line at leftmost x → shape appears to the left
    const minX = Math.min(...vertices.map(v => v.x));
    return vertices.map(v => ({ x: 2 * minX - v.x, y: v.y }));
  }
  if (direction === 'up') {
    // reflect over horizontal line at topmost y → shape appears above
    const maxY = Math.max(...vertices.map(v => v.y));
    return vertices.map(v => ({ x: v.x, y: 2 * maxY - v.y }));
  }
  if (direction === 'down') {
    // reflect over horizontal line at bottommost y → shape appears below
    const minY = Math.min(...vertices.map(v => v.y));
    return vertices.map(v => ({ x: v.x, y: 2 * minY - v.y }));
  }
  return vertices;
}

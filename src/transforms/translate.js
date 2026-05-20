export function translateVerts(vertices, dx, dy) {
  return vertices.map(v => ({ x: v.x + dx, y: v.y + dy }));
}

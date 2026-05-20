export const state = {
  zoom: 36,
  origin: { x: 0, y: 0 },
  shapes: [],           // Array of shape objects
  activeShapeId: null,  // string|null
  drawingVertices: [],  // [{x,y}] grid coords for polygon mode
  pendingPoint: null,   // {x,y} grid coord for point mode (before confirm)
  drawSubMode: 'polygon', // 'polygon' | 'point'
  mousePos: null,       // {x,y} pixel coords
  mode: 'drawing',      // 'drawing' | 'idle' | 'mission'
  historyStack: [],
  historyIndex: -1,
  animating: false,
  missionIndex: 0,
  missionTarget: null,  // [{x,y}] grid coords | null
};

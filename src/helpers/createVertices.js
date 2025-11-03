// Create vertices (same as before)
export const createVertices = (pts) => {
  if (!pts || pts.length < 2) return new Float32Array();

  const topVertices = pts.map(([long, ele, lat]) => [long, ele, lat]);
  const baseVertices = pts.map(([long, _ele, lat]) => [long, 0, lat]);

  const verts = [];
  for (let i = 0; i < pts.length - 1; i++) {
    verts.push(
      ...topVertices[i],
      ...baseVertices[i],
      ...topVertices[i + 1],
      ...topVertices[i + 1],
      ...baseVertices[i],
      ...baseVertices[i + 1],
    );
  }
  return new Float32Array(verts);
};

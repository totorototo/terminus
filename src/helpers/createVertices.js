/**
 * Build a Float32Array of slope values for the mesh geometry.
 * Each segment (pair of consecutive points) gets 6 vertices (2 triangles).
 * slopes[i+1] is used for segment i (1-based indexing from the GPX parser).
 */
export const buildSlopeAttribute = (points, slopes) => {
  if (!slopes || slopes.length === 0 || !points || points.length < 2) {
    return new Float32Array(
      (points?.length ?? 1) > 1 ? (points.length - 1) * 6 : 0,
    );
  }
  const arr = [];
  for (let i = 0; i < points.length - 1; i++) {
    const slope = slopes[i + 1] || 0;
    for (let j = 0; j < 6; j++) arr.push(slope);
  }
  return new Float32Array(arr);
};

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

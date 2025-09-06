import * as scale from "d3-scale";
import * as shape from "d3-shape";
import * as d3Array from "d3-array";

const d3 = {
  scale,
  shape,
  d3Array,
};

export const createXScale = (
  domain = { min: 0, max: 0 },
  range = { min: 0, max: 0 },
) => {
  return d3.scale
    .scaleLinear()
    .domain([domain.min, domain.max])
    .range([range.min, range.max]);
};

export const createYScale = (
  domain = { min: 0, max: 0 },
  range = { min: 0, max: 0 },
) => {
  return (
    d3.scale
      .scaleLinear()
      .domain([domain.min, domain.max])
      // We invert our range so it outputs using the axis that React uses.
      .range([range.min, range.max])
  );
};

export const getLine = (
  points,
  scaleX,
  scaleY,
) => {
  const lineShape = d3.shape
    .line() // Specify the type for line function
    .x((_, i) => scaleX(i))
    .y((d) => scaleY(d[2]))
    //.defined((d) => !d.fake)
    .curve(d3.shape.curveCatmullRom.alpha(0.5))

  return {
    path: lineShape(points),
  };
};


export const getArea = (
  points,
  scaleX,
  scaleY,
  domainMin,
) => {
  const areaShape = d3.shape
    .area() // Specify the type for area function
    .x((point) => scaleX(points.indexOf(point)))
    .y1((point) => scaleY(point[2]))
    .y0(scaleY(domainMin))
    //.defined((d) => !d.fake)
    .curve(d3.shape.curveLinear)

  return {
    path: areaShape(points),
  };
};
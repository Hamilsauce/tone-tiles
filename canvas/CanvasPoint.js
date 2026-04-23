import { Point } from "../core/Point.js";

const domPoint = (element = document.querySelector('#tile-layer'), { x, y } = new DOMPoint()) => {
  return new DOMPoint(x, y).matrixTransform(
    element.getScreenCTM().inverse()
  );
};

export class CanvasPoint extends Point {
  #x = 0;
  #y = 0;
  #self;

  constructor(x = 0, y = 0) {
    const point = domPoint(document.querySelector('#tile-layer'), { x, y });
    super(x, y);
  }

}

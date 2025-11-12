const canvas = document.querySelector('#svg');
const scene = document.querySelector('#scene');
const surface = scene.querySelector('#surface');
const viewBox = canvas.viewBox

canvas.style.width = window.innerWidth
canvas.style.height = window.innerHeight;

Object.assign(viewBox.baseVal, {
  x: -(5),
  y: -(10),
  width: (10),
  height: (20),
})

const domPoint = (element, x, y) => {
  return new DOMPoint(x, y).matrixTransform(
    element.getScreenCTM().inverse()
  );
};

const roundPoint = (p) => {
  return { x: Math.floor(p.x), y: Math.floor(p.y) }
};

let startP;
let isDrawing = false;


const initScene = (svg = new SVGSVGElement, scene = new SVGPathElement()) => {
  const sceneTransforms = scene.transform.baseVal
  const translate = svg.createSVGTransform();

  translate.setTranslate(-5, -10);

  sceneTransforms.clear()
  sceneTransforms.appendItem(translate);
  scene.setAttribute('stroke', 'black')
  scene.setAttribute('stroke-width', 0.5)
  surface.width.baseVal.value = 10
  surface.height.baseVal.value = 20
};

const drawRect = (p, s = 1, fill = 'black') => {
  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.style.fill = fill;
  rect.x.baseVal.value = p.x - (s / 2)
  rect.y.baseVal.value = p.y - (s / 2)
  rect.width.baseVal.value = s
  rect.height.baseVal.value = s
  return canvas.appendChild(rect)

};

const drawStart = (e) => {
  const p = domPoint(canvas, e.clientX, e.clientY);
  const adjustedPoint = roundPoint(p)
  startP = adjustedPoint;
  isDrawing = true;


  drawRect(p, 0.5, 'black')
  // drawRect(p,1, 'white')
};

const drawMove = (e) => {
  const p = domPoint(canvas, e.clientX, e.clientY);
  const adjustedPoint = roundPoint(p)
  // startP = adjustedPoint;
  // isDrawing = false;


  drawRect(p, 0.5, 'black')
  // drawRect(p,1, 'white')
};
const drawStop = (e) => {
  const p = domPoint(canvas, e.clientX, e.clientY);
  const adjustedPoint = roundPoint(p)
  // startP = adjustedPoint;
  isDrawing = false;

  startP = null
  drawRect(p, 0.5, 'black')
  // drawRect(p,1, 'white')
};




canvas.addEventListener('pointerdown', e => {
  drawStart(e);
});
canvas.addEventListener('pointermove', e => {
  drawMove(e);
});
canvas.addEventListener('pointerup', e => {
  drawStop(e);
});

initScene(canvas, scene)

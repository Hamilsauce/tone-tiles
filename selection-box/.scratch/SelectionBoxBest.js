const app = document.querySelector('#app');
const svg = document.querySelector('#svg');
const scene = document.querySelector('#scene');
const tileContainer = document.querySelector('#tile-container');
const appBody = document.querySelector('#app-body')
const containers = document.querySelectorAll('.container')


const selector = document.querySelector('.tile-selector');
const selectBox = document.querySelector('.selection-box');
const handleA = document.querySelector('#a-handle');
const handleB = document.querySelector('#b-handle');


const domPoint = (x, y, clamp = false) => {
  const p = new DOMPoint(x, y).matrixTransform(
    scene.getScreenCTM().inverse()
  );
  
  return !clamp ? p : {
    x: clamp === 'floor' ? Math.floor(p.x) : Math.ceil(p.x),
    y: clamp === 'floor' ? Math.floor(p.y) : Math.ceil(p.y)
  };
}


const handles = {
  a: handleA,
  b: handleB,
  isHandle(el) {
    return [this.a, this.b].includes(el)
  },
  
  setFocus(label = null) {
    if (!label && this.focus) {
      this.focus.dataset.role = undefined
      this.anchor.dataset.role = undefined
      this.focus = null;
      this.anchor = null;
      return;
    }
    
    this.focus = label ? this[label] : null;
    this.anchor = label ? this.focus === this.a ? this.b : this.a : null;
    
    this.focus.dataset.role = 'focus'
    this.anchor.dataset.role = 'anchor'
  },
  
  anchor: null,
  focus: null,
}

const points = {
  a: { x: 2, y: 2 },
  b: { x: 2, y: 2 },
  
  setFocus(label) {
    this.focus = label ? this[label] : null;
    this.anchor = label ? this.focus === this.a ? this.b : this.a : null;
  },
  
  get x() { return Math.min(this.anchor?.x, this.focus?.x); },
  get y() { return Math.min(this.anchor?.y, this.focus?.y); },
  get width() { return (Math.max(this.a.x, this.b.x) - this.x) <= 0 ? 1 : (Math.max(this.a.x, this.b.x) - this.x) + 1 },
  get height() { return (Math.max(this.a.y, this.b.y) - this.y) <= 0 ? 1 : (Math.max(this.a.y, this.b.y) - this.y) + 1 },
  anchor: null,
  focus: null,
}

const render = (pt) => {
  if (pt) {
    selectBox.setAttribute('x', pt.x)
    selectBox.setAttribute('y', pt.y)
    
    selectBox.setAttribute('width', 1);
    selectBox.setAttribute('height', 1);
    
    handles.a.setAttribute('cx', pt.x)
    handles.a.setAttribute('cy', pt.y)
    handles.b.setAttribute('cx', pt.x)
    handles.b.setAttribute('cy', pt.y)
    
    return
  }
  
  selectBox.setAttribute('x', points.x)
  selectBox.setAttribute('y', points.y)
  
  selectBox.setAttribute('width', points.width) // - points.x)
  selectBox.setAttribute('height', points.height) // - points.y)
  
  handles.focus.setAttribute('cx', points.focus.x)
  handles.focus.setAttribute('cy', points.focus.y)
}

svg.addEventListener('click', ({ target, currentTarget, clientX, clientY }) => {
  const pt = domPoint(clientX, clientY, 'floor')
  points.a.x = pt.x
  points.a.y = pt.y
  points.b.x = pt.x
  points.b.y = pt.y
  
  render(pt)
});

selector.addEventListener('pointerdown', ({ target, currentTarget, clientX, clientY }) => {
  const isTargetHandle = handles.isHandle(target)
  const handleLabel = isTargetHandle ? target.dataset.handle : null;
  
  const pt = domPoint(clientX, clientY, 'floor');
  
  handles.setFocus(handleLabel);
  points.setFocus(handleLabel);
  
  render();
})

selector.addEventListener('pointermove', ({ target, currentTarget, clientX, clientY }) => {
  const focusPoint = points.focus
  
  if (!focusPoint) return;
  
  const pt = domPoint(clientX, clientY)
  focusPoint.x = pt.x
  focusPoint.y = pt.y
  
  render();
});

selector.addEventListener('pointerup', ({ target, currentTarget, clientX, clientY }) => {
  const focusPoint = points.focus
  
  if (!focusPoint) return
  
  const pt = domPoint(clientX, clientY, 'floor')
  
  focusPoint.x = pt.x
  focusPoint.y = pt.y
  
  render();
  
  handles.setFocus(null)
});
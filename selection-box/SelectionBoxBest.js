import { EventEmitter } from 'https://hamilsauce.github.io/hamhelper/event-emitter.js';
import ham from 'https://hamilsauce.github.io/hamhelper/hamhelper1.0.0.js';

const { template, utils, sleep } = ham;

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
// await navigator.clipboard.writeText(selector.outerHTML)
// await navigator.clipboard.writeText(selector.innerHTML)

const SELECTOR_TEMPLATE = `
  <rect class="selection-box" stroke-width="0.07" stroke="green" fill="none" width="1" height="1" x="2" y="2" transform="translate(-0.5,-0.5)"></rect>
  <circle class="selection-handle" data-handle="a" id="a-handle" r="0.33" _fill="white" stroke-width="0.07" stroke="green" cx="0" cy="0" transform="translate(0,0)"></circle>
  <circle class="selection-handle" data-handle="b" id="b-handle" r="0.33" _fill="white" stroke-width="0.07" stroke="green" cx="0" cy="0" transform="translate(0,0)" data-is-dragging="false"></circle>`;


const domPoint = (x, y, clamp = false) => {
  const p = new DOMPoint(x, y).matrixTransform(
    scene.getScreenCTM().inverse()
  );
  
  return !clamp ? p : {
    x: clamp === 'floor' ? Math.floor(p.x) : Math.ceil(p.x),
    y: clamp === 'floor' ? Math.floor(p.y) : Math.ceil(p.y)
  };
}

export class TileSelector extends EventEmitter {
  #self;
  #handles = {
    handleKeys: ['a', 'b'],
    a: handleA,
    b: handleB,
    anchor: null,
    focus: null,
    
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
      
      const anchorLabel = this.handleKeys.filter(_ => _ !== label)[0]
      
      this.focus = this[label] ?? null;
      this.anchor = this[anchorLabel] ?? null;
      
      if (this.focus) {
        this.focus.dataset.role = 'focus'
        this.anchor.dataset.role = 'anchor'
      }
    },
  }
  
  #points = {
    pointKeys: ['a', 'b'],
    a: domPoint(2, 2),
    b: domPoint(2, 2),
    anchor: null,
    focus: null,
    
    get x() { return Math.min(this.anchor?.x, this.focus?.x); },
    get y() { return Math.min(this.anchor?.y, this.focus?.y); },
    get x2() { return Math.max(this.anchor?.x, this.focus?.x); },
    get y2() { return Math.max(this.anchor?.y, this.focus?.y); },
    get x3() { return (Math.max(this.anchor.x, this.focus.x)) <= 0 ? 1 : (Math.max(this.anchor.x, this.focus.x)) + 0 },
    get y3() { return (Math.max(this.anchor.y, this.focus.y)) <= 0 ? 1 : (Math.max(this.anchor.y, this.focus.y)) + 0 },
    get width() { return (this.x3 - this.x) + 1 },
    get height() { return (this.y3 - this.y) + 1 },
    // get height() { return (Math.max(this.a.y, this.b.y) - this.y) <= 0 ? 1 : (Math.max(this.a.y, this.b.y) - this.y) + 0 },
    // get width() { return (Math.max(this.anchor.x, this.b.x) - this.x) <= 0 ? 1 : (Math.max(this.a.x, this.b.x) - this.x) + 0 },
    // get height() { return (Math.max(this.a.y, this.b.y) - this.y) <= 0 ? 1 : (Math.max(this.a.y, this.b.y) - this.y) + 0 },
    
    setFocus(label) {
      const anchorLabel = this.pointKeys.filter(_ => _ !== label)[0]
      if (!label || !anchorLabel) return;
      
      this.focus = this[label] ?? null;
      this.anchor = this[anchorLabel] ?? null;
    },
    
  }
  
  constructor(svgContext, unitSize = 1) {
    super();
    this.svgContext = svgContext
    this.#self = document.createElementNS(SVG_NS, 'g');
    this.#self.classList.add('tile-selector');
    this.#self.setAttribute('transform', 'translate(0.5,0.5)');
    this.#self.innerHTML = SELECTOR_TEMPLATE;
    
    this.dragStartHandler = this.onDragStart.bind(this);
    this.dragHandler = this.onDragHandle.bind(this);
    this.dragEndHandler = this.onDragEnd.bind(this);
    
    this.svgContext.append(this.#self);
    this.render = this.#render.bind(this);
    this.emitRange = this.#emitRange.bind(this);
    this.#self.addEventListener('pointerdown', this.dragStartHandler);
    // this.#handles.a.addEventListener('pointerdown', this.dragStartHandler);
    // this.#handles.b.addEventListener('pointerdown', this.dragStartHandler);
    this.#handles.a = this.#self.querySelector('[data-handle="a"]');
    this.#handles.b = this.#self.querySelector('[data-handle="b"]');
    
    this.#self.style.touchAction = 'none'
    
    this.#handles.a.addEventListener('click', (e) => {
      e.stopPropagation();
      e.stopImmediatePropagation();
      e.preventDefault();
    });
    
    this.#handles.b.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
    });
    
  };
  
  get parent() { return this.#self.parentElement };
  
  get selectBox() { return this.#self.querySelector('.selection-box') }
  
  get isRendered() { return !!this.parent; };
  
  domPoint(x, y, clamp = false) {
    const p = new DOMPoint(x, y).matrixTransform(
      this.svgContext.getScreenCTM().inverse()
    );
    
    return !clamp ? p : {
      x: clamp === 'floor' ? Math.floor(p.x) : Math.ceil(p.x),
      y: clamp === 'floor' ? Math.floor(p.y) : Math.ceil(p.y)
    };
  }
  
  remove() {
    if (this.isRendered) { this.#self.remove(); }
    return this;
  }
  
  insertAt(x, y) {
    const isXPoint = x.x !== undefined;
    const isXDomPoint = isXPoint ? x instanceof DOMPoint : false;
    let pointX = x.x !== undefined ? +x.x : +x
    let pointY = x.y !== undefined ? +x.y : +y
    
    const pt = { x: pointX, y: pointY }
    
    this.#points.a.x = pt.x
    this.#points.a.y = pt.y
    this.#points.b.x = pt.x
    this.#points.b.y = pt.y
    
    this.remove()
    
    this.render(pt)
    this.svgContext.append(this.#self);
    
  }
  
  onDragStart(e) {
    const { target, currentTarget, clientX, clientY } = e;
    const isTargetHandle = this.#handles.isHandle(target)
    
    if (!isTargetHandle) return
    e.stopPropagation();
    // e.preventDefault();
    
    const handleLabel = isTargetHandle ? target.dataset.handle : null;
    
    this.#handles.setFocus(handleLabel);
    this.#points.setFocus(handleLabel);
    
    // this.#self.addEventListener('pointermove', this.dragHandler);
    document.addEventListener('pointermove', this.dragHandler);
    // this.#self.addEventListener('pointerup', this.dragEndHandler);
    document.addEventListener('pointerup', this.dragEndHandler);
    
    this.render();
  }
  
  onDragHandle(e) {
    const { target, currentTarget, clientX, clientY } = e;
    
    const focusPoint = this.#points.focus;
    
    if (!this.#handles.focus) return;
    
    if (!focusPoint) return;
    e.stopPropagation();
    // e.preventDefault();
    
    const pt = this.domPoint(clientX, clientY);
    focusPoint.x = pt.x;
    focusPoint.y = pt.y;
    
    this.render();
  };
  
  async onDragEnd(e) {
    const { target, currentTarget, clientX, clientY } = e;
    
    const focusPoint = this.#points.focus
    const focusHandle = this.#handles.focus
    
    if (!focusHandle || !focusPoint) return
    // e.stopPropagation();
    // e.preventDefault();
    
    const pt = this.domPoint(clientX, clientY, 'floor')
    
    focusPoint.x = pt.x
    focusPoint.y = pt.y
    
    document.removeEventListener('pointermove', this.dragHandler);
    document.removeEventListener('pointerup', this.dragEndHandler);
    
    await this.render();
    // this.#handles.setFocus(null);
    console.warn({ x: this.x })
    
    this.emitRange();
    
  }
  
  async #render(pt) {
    if (!this.isRendered) {
      this.svgContext.append(this.#self)
    }
    
    if (pt) {
      this.selectBox.setAttribute('x', pt.x)
      this.selectBox.setAttribute('y', pt.y)
      
      this.selectBox.setAttribute('width', 1);
      this.selectBox.setAttribute('height', 1);
      
      this.#handles.a.setAttribute('cx', pt.x);
      this.#handles.a.setAttribute('cy', pt.y);
      this.#handles.b.setAttribute('cx', pt.x);
      this.#handles.b.setAttribute('cy', pt.y);
      
      return;
    }
    
    this.selectBox.setAttribute('x', this.#points.x);
    this.selectBox.setAttribute('y', this.#points.y);
    
    // this.selectBox.setAttribute('width', this.#points.x2);
    // this.selectBox.setAttribute('height', this.#points.x3);
    this.selectBox.setAttribute('width', this.#points.width);
    this.selectBox.setAttribute('height', this.#points.height);
    
    if (this.#handles.focus) {
      this.#handles.focus.setAttribute('cx', this.#points.focus.x);
      this.#handles.focus.setAttribute('cy', this.#points.focus.y);
    }
  }
  
  
  #emitRange() {
    // const { a, b } = this.#points;
    // const isAGreaterX = a.x > b.x
    // const bSum = this.#points.b.x + this.#points.b.x
    // const payload = {
    //   start: aSum > bSum ? this.#points.b : this.#points.a,
    //   end: aSum > bSum ? this.#points.a : this.#points.b,
    // }
    
    const payload = {
      start: { x: this.#points.x, y: this.#points.y },
      // end: { x: this.#points.width + this.#points.x, y: this.#points.width + this.#points.y },
      end: { x: this.#points.x3+1, y: this.#points.y3+1 },
      // a: this.#points.a,
      // b: this.#points.b,
      // focus: this.#points.focus,
      // anchor: this.#points.anchor,
    }
    
    console.table(payload)
    this.emit('selection', payload);
  }
}

let SelectorInstance = null;

export const getTileSelector = (ctx = document.querySelector('#scene')) => {
  if (SelectorInstance !== null) {
    return SelectorInstance;
  }
  
  SelectorInstance = new TileSelector(ctx);
  return SelectorInstance;
};
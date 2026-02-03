import { EventEmitter } from 'https://hamilsauce.github.io/hamhelper/event-emitter.js';
import ham from 'https://hamilsauce.github.io/hamhelper/hamhelper1.0.0.js';
import { dispatchPointerEvent } from '../lib/utils.js'
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

const SELECTOR_TEMPLATE = `
  <rect class="selection-box" stroke-width="0.07" stroke="green" width="1" height="1" x="2" y="2" transform="translate(-0.5,-0.5)"></rect>
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

const ROLES = ['a', 'b']

export class TileSelector extends EventEmitter {
  #self;
  
  #handles = {
    handleKeys: ROLES,
    a: handleA,
    b: handleB,
    anchor: null,
    focus: null,
    
    isHandle(el) {
      return this.handleKeys.some(k => this[k] === el)
    },
    
    setFocus(label = null) {
      if (!label && this.focus) {
        delete this.focus.dataset.role
        delete this.anchor.dataset.role
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
    pointKeys: ROLES,
    a: domPoint(2, 2),
    b: domPoint(2, 2),
    translation: domPoint(0, 0),
    anchor: null,
    focus: null,
    
    get x() { return Math.min(this.anchor?.x, this.focus?.x); },
    get y() { return Math.min(this.anchor?.y, this.focus?.y); },
    get x2() { return (Math.max(this.anchor.x, this.focus.x)) <= 0 ? 1 : (Math.max(this.anchor.x, this.focus.x)) + 0 },
    get y2() { return (Math.max(this.anchor.y, this.focus.y)) <= 0 ? 1 : (Math.max(this.anchor.y, this.focus.y)) + 0 },
    get width() { return (this.x2 - this.x) + 1 },
    get height() { return (this.y2 - this.y) + 1 },
    
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
    this.#handles.a = this.#self.querySelector('[data-handle="a"]');
    this.#handles.b = this.#self.querySelector('[data-handle="b"]');
    
    this.#self.style.touchAction = 'none';
    
    this.#self.addEventListener('pointerdown', this.dragStartHandler);
    
    this.#handles.a.addEventListener('click', (e) => {
      e.stopPropagation();
      e.stopImmediatePropagation();
      e.preventDefault();
    });
    
    this.#handles.b.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
    });
    
    this.render = this.#render.bind(this);
    this.emitRange = this.#emitRange.bind(this);
    this.dragMode = 'handle'
  };
  
  get parent() { return this.#self.parentElement };
  
  get selectBox() { return this.#self.querySelector('.selection-box') }
  
  get isRendered() { return !!this.parent; };
  
  get isDragging() { return this.#self.dataset.isDragging === 'true' ? true : false; };
  
  set isDragging(v) { return this.#self.dataset.isDragging = v; }
  
  get isTranslating() {
    return this.#points.translation.x + this.#points.translation.y > 0;
  }
  
  
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
    const pt = {
      x: x.x !== undefined ? +x.x : +x,
      y: x.y !== undefined ? +x.y : +y,
    };
    
    Object.assign(this.#points.a, pt)
    Object.assign(this.#points.b, pt)
    
    this.render(pt);
  }
  
  onDragStart(e) {
    const { target, currentTarget, clientX, clientY } = e;
    const isTargetHandle = this.#handles.isHandle(target);
    const isSelBox = this.selectBox === target;
    e.stopPropagation();
    
    if (isTargetHandle) {
      this.dragMode = 'handle'
      
      const handleLabel = isTargetHandle ? target.dataset.handle : null;
      
      this.#handles.setFocus(handleLabel);
      this.#points.setFocus(handleLabel);
    }
    
    else if (isSelBox) {
      const pt = this.domPoint(clientX, clientY);
      this.dragMode = 'translation'
      this.pointerStart = pt
      
      this.#points.translation.x = 0
      this.#points.translation.y = 0
    }
    
    this.isDragging = true;
    
    this.render();
    
    document.addEventListener('pointermove', this.dragHandler);
    document.addEventListener('pointerup', this.dragEndHandler);
  }
  
  onDragHandle(e) {
    const { target, currentTarget, clientX, clientY } = e;
    
    const focusPoint = this.#points.focus;
    const isSelBox = this.selectBox === target
    const pt = this.domPoint(clientX, clientY);
    
    e.stopPropagation();
    
    if (this.dragMode === 'translation') {
      this.#points.translation.x = pt.x - this.pointerStart.x
      this.#points.translation.y = pt.y - this.pointerStart.y
      
      this.render();
      return
    }
    
    if (!focusPoint) return;
    
    focusPoint.x = pt.x;
    focusPoint.y = pt.y;
    
    this.render();
  };
  
  async onDragEnd(e) {
    const { target, currentTarget, clientX, clientY } = e;
    
    const focusPoint = this.#points.focus;
    const focusHandle = this.#handles.focus;
    
    if (this.dragMode === 'translation') {
      const dx = Math.floor(this.#points.translation.x)
      const dy = Math.floor(this.#points.translation.y)
      
      this.#points.a.x += dx
      this.#points.a.y += dy
      this.#points.b.x += dx
      this.#points.b.y += dy
      
      this.#points.translation.x = 0
      this.#points.translation.y = 0
      this.pointerStart = null
      this.dragMode = 'handle'
    }
    else {
      if (!focusHandle || !focusPoint) return;
      
      const pt = this.domPoint(clientX, clientY, 'floor');
      
      focusPoint.x = pt.x;
      focusPoint.y = pt.y;
    }
    
    this.#handles.setFocus(null);
    document.removeEventListener('pointermove', this.dragHandler);
    document.removeEventListener('pointerup', this.dragEndHandler);
    this.isDragging = false;
    
    await this.render();
    
    
    this.emitRange();
  }
  
  async #render(pt) {
    if (!this.isRendered) {
      this.svgContext.append(this.#self);
    }
    
    if (this.dragMode === 'translation') {
      const x = this.#points.translation.x;
      const y = this.#points.translation.y;
      this.#self.setAttribute('transform', `translate(${x+0.5},${y+0.5})`);
      return;
    }
    else {
      this.#self.setAttribute('transform', `translate(${0.5},${0.5})`);
    }
    if (pt) {
      this.selectBox.setAttribute('x', pt.x);
      this.selectBox.setAttribute('y', pt.y);
      
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
    
    this.selectBox.setAttribute('width', this.#points.width);
    this.selectBox.setAttribute('height', this.#points.height);
    
    if (this.#handles.focus) {
      this.#handles.focus.setAttribute('cx', this.#points.focus.x);
      this.#handles.focus.setAttribute('cy', this.#points.focus.y);
    }
    else {
      this.#handles.a.setAttribute('cx', this.#points.a.x);
      this.#handles.a.setAttribute('cy', this.#points.a.y);
      this.#handles.b.setAttribute('cx', this.#points.b.x);
      this.#handles.b.setAttribute('cy', this.#points.b.y);
    }
  }
  
  #emitRange() {
    const payload = {
      start: { x: this.#points.x, y: this.#points.y },
      end: { x: this.#points.x2 + 1, y: this.#points.y2 + 1 },
    }
    
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
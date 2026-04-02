import ham from 'https://hamilsauce.github.io/hamhelper/hamhelper1.0.0.js';
import { EventEmitter } from 'https://hamilsauce.github.io/hamhelper/event-emitter.js';
import { TransformList, DEFAULT_TRANSFORMS } from './TransformList.js';
import { SVGCanvas } from './SVGCanvas.js';
import { GraphNode } from '../lib/graph.model.js';
const { utils } = ham;

export const DefaultCanvasObjectModel = {
  x: 0,
  y: 0,
  width: 1,
  height: 1,
};

export const CanvasObjectDisplayState = {
  selected: false,
  active: false,
  hide: false,
};

export const DefaultCanvasObjectOptions = {
  id: '',
  model: DefaultCanvasObjectModel,
  transforms: DEFAULT_TRANSFORMS,
  dataset: CanvasObjectDisplayState,
};

export class CanvasObject extends EventEmitter {
  #context;
  #type;
  #model = { x: null, y: null, pointerEvents: true };
  #x = null;
  #y = null;
  #hide = false;
  #id;
  #self;
  #transformList;
  #subscriptions = new Map();
  
  
  constructor(context = new SVGCanvas(), type = '', options) {
    super();
    const { id, model = {}, transforms } = options;
    
    this.#context = context;
    this.#type = type;
    Object.assign(this.#model, model);
    
    this.#id = id ?? `${type}${utils.uuid()}`;
    
    this.#self = this.#context.useTemplate(type, {
      id: this.#id,
      dataset: this.#model,
    });
    
    this.#transformList = new TransformList(this.#context, this.#self, transforms);
  }
  
  get context() { return this.#context; }
  
  get dom() { return this.#self; }
  
  get model() { return this.#model; }
  
  get x() { return this.#model.x; }
  
  set x(v) { this.#model.x = v; }
  
  get y() { return this.#model.y; }
  
  set y(v) { this.#model.y = v; }
  
  get data() { return this.dom.dataset; }
  
  get isVisible() { return !this.#hide; }
  
  get transforms() { return this.#transformList; }
  
  get type() { return this.#type; }
  
  get id() { return this.#id; }
  
  get layer() { return this.dom.closest('g.layer'); }
  
  get parent() { return this.dom.parentElement; }
  
  // get isLoaded() { return !!this.parent; }
  get isLoaded() { return this.dom.style.display !== 'none'; }
  
  subscribe(eventType, unsubFn) {
    this.#subscriptions.set(eventType, unsubFn);
  }
  
  unsubscribe(eventType) {
    if (!this.#subscriptions.has(eventType)) return;
    this.#subscriptions.get(eventType)();
    
    return this;
  }
  
  domPoint(x, y) {
    return new DOMPoint(x, y).matrixTransform(
      this.dom.getScreenCTM().inverse()
    );
  }
  
  translateTo(x, y) {
    this.transforms.translateTo(x, y);
    return this;
  }
  
  rotateTo(angle, x, y) {
    this.transforms.rotateTo(angle, x, y);
    return this;
  }
  
  scaleTo(x, y) {
    this.transforms.scaleTo(x, y);
    return this;
  }
  
  remove() {
    this.#subscriptions.forEach(unsubFn => {
      unsubFn();
    });
    
    this.dom.remove();
    
    return this;
  }
  
  show() {
    this.#hide = false;
    this.render({ hide: this.#hide });
    return this;
  }
  
  hide() {
    this.#hide = true;
    this.render({ hide: this.#hide });
    return this;
  }
  
  update(attributeMap = {}) {
    if (this.#type === 'actor') {
      console.warn('AXTOR UPDATE', attributeMap, this.model)
    }
    
    let anyChanges = false
    
    for (const key in attributeMap) {
      const v = attributeMap[key];
      const modelV = this.#model[key];
      const hasChanged = v !== modelV;
   const isValid = !(v === undefined || modelV === undefined);
   
      if (v !== undefined && hasChanged) {
        this.#model[key] = v;
        anyChanges = true
      } else {
        // console.error(`[${this.constructor.name} ${this.id}] invalid Model patch: ${key}: ${v}\n\nReasons: isValid: ${isValid}, hasChanged: ${hasChanged}`);
      }
    }
    this.render();
    
    if (anyChanges) {}
    
    return this;
  }
  
  // update(attributeMap = {}) {
  
  //   const patch = Object.entries(attributeMap).reduce((ptch, [k, v]) => {
  //     const modelV = this.#model[k];
  //     const isValid = !(v === undefined || modelV === undefined);
  
  
  //     if (v === undefined && v !== modelV) {
  //       ptch = ptch ?? {};
  //       this.#model[k] = v;
  //       ptch[k] = v;
  //     } else if (!isValid) {
  //       console.error(`[${this.constructor.name} ${this.id}] invalid Model patch: ${k}: ${v}`);
  //     }
  
  //     return ptch;
  //   }, null);
  
  //   if (this.x === 5 && this.y == 5) {
  //     console.warn({ patch })
  
  //   }
  //   // if (!patch) return;
  
  //   this.render()
  
  //   return this;
  // }
  
  // render(patch) {
  //   if (!patch) {
  //     this.translateTo(this.x, this.y);
  //     Object.assign(this.data, this.model);
  //     return
  //   }
  //   for (const key in patch) {
  //     this.data[key] = patch[key];
  //   }
  
  //   if (patch.x !== undefined || patch.y !== undefined) {
  //     this.translateTo(this.x, this.y);
  //   }
  
  //   if (this.#hide === true) {
  //     this.data.hide = true;
  //   } else {
  //     delete this.data.hide;
  //   }
  
  //   return this;
  // }
  
  
  render() {
    this.translateTo(this.x, this.y);
    Object.assign(this.data, this.model);
    
    if (this.#hide === true) {
      this.data.hide = true;
    } else {
      delete this.data.hide;
    }
    
    return this;
  }
  
  activate() {
    this.show();
    this.toggleEvents(true);
    
    return this;
  }
  deactivate() {
    this.hide();
    this.toggleEvents(false);
    
    return this;
  }
  
  
  toggleEvents(v) {
    this.data.pointerEvents = v ?? !this.data.pointerEvents;
    return this;
  }
  
  getEl(selector = '') { return this.dom.querySelector(selector); }
  
  getEls(selector = '') { return [...this.dom.querySelectorAll(selector)]; }
}
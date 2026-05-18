import ham from 'ham';
import { EventEmitter } from 'https://hamilsauce.github.io/hamhelper/event-emitter.js';
import { TransformList, DEFAULT_TRANSFORMS, DEFAULT_TRANSFORM_MAP } from './TransformList.js';
import { SVGCanvas } from './SVGCanvas.js';
import { CanvasPoint } from './CanvasPoint.js';
import { DefaultModelProperties } from '../model/Model.js';
import { DefaultActorProperties } from '../model/Actor.model.js';

const { utils, sleep } = ham;


// This stuff goes into DOM.dataset
export const DefaultCanvasObjectproperties = DefaultModelProperties;

export const DefaultCanvasObjectOptions = {
  id: '',
  type: '',
  properties: DefaultActorProperties,
  spatial: null,
  traversal: null,
  transforms: DEFAULT_TRANSFORM_MAP,
};

export class CanvasObject extends EventEmitter {
  #context;
  #type;
  #id;
  #properties = { ...DefaultCanvasObjectproperties };
  #self;
  #transformList;
  #subscriptions = new Map();
  #point = { x: null, y: null };
  #isBusy = false;
  #updateQueue = [];
  #position = [];
  
  constructor(context = new SVGCanvas(), type = '', options) {
    super();
    const { id, properties = {} } = options;
    
    if (type !== 'tile') {
      console.warn('id, properties, type', id, properties, type);
      
    }
    this.#context = context;
    this.#type = type;
    
    this.#id = id ?? `${type}${utils.uuid()}`;
    
    const { template, transforms } = this.#context.createCanvasObject(type, {
      withHarness: type !== 'tile',
      id: this.#id,
      dataset: this.#properties,
      transforms: options.transforms
    });
    
    this.#self = template;
    
    this.#position = transforms.position;
    this.#transformList = transforms.transformList;
    Object.assign(this.#properties, properties)
  }
  
  get context() { return this.#context; }
  
  get dom() { return this.#self; }
  
  get properties() { return this.#properties; }
  
  get x() { return this.#properties.point?.x ?? this.#properties.x; }
  
  set x(v) {
    this.#properties.x = v;
    this.#properties.point = new CanvasPoint(v, this.y ?? 0);
  }
  
  get y() { return this.#properties.point?.y ?? this.#properties.y; }
  
  set y(v) {
    this.#properties.y = v;
    this.#properties.point = new CanvasPoint(this.x ?? 0, v);
  }
  
  get data() { return this.dom.dataset; }
  
  get isVisible() { return !this.#properties.hide; }
  
  get transforms() { return this.#transformList; }
  
  get type() { return this.#type; }
  
  get id() { return this.#id; }
  
  get isBusy() { return this.#isBusy; }
  
  set isBusy(v) {
    if (this.#isBusy && !v && this.#updateQueue.length) {
      this.#isBusy = v;
      
      const update = this.#updateQueue.shift();
      update();
    } else {
      this.#isBusy = v;
    }
  }
  
  get point() { return this.#properties.point; }
  
  get layer() { return this.dom.closest('g.layer'); }
  
  get parent() { return this.dom.parentElement; }
  
  get isLoaded() { return this.dom.style.display !== 'none'; }
  
  subscribe(eventType, cb) {
    this.#subscriptions.set(eventType, this.on(eventType, cb));
    return this;
  }
  
  unsubscribe(eventType) {
    if (!this.#subscriptions.has(eventType)) return;
    this.#subscriptions.get(eventType)();
    
    return this;
  }
  
  destroy() {
    this.#subscriptions.forEach(unsubFn => {
      unsubFn();
    });
    
    this.remove();
    
    return this;
  }
  
  domPoint(x, y) {
    return new DOMPoint(x, y).matrixTransform(
      this.dom.getScreenCTM().inverse()
    );
  }
  
  translateTo(x, y) {
    this.#position.translateTo(x, y);
    return this;
  }
  
  rotateTo(angle, x = 0, y = 0) {
    this.transforms.rotateTo(angle, x, y);
    return this;
  }
  
  scaleTo(x, y) {
    this.transforms.scaleTo(x, y);
    return this;
  }
  
  remove() {
    this.dom.remove();
    
    return this;
  }
  
  show() {
    // this.#hide = false;
    // this.render({ hide: this.#hide });
    this.update({ hide: false });
    return this;
  }
  
  hide() {
    // this.#hide = true;
    // this.render({ hide: this.#hide });
    this.update({ hide: true });
    
    return this;
  }
  
  update(attributeMap = {}) {
    const { spatial, traversal, properties } = attributeMap
    // const normalizedPatch = attributeMap.point ? this.#normalizeSpatialPatch(attributeMap) : attributeMap;
    // console.warn('attributeMap', attributeMap)
    for (const key in properties) {
      const v = properties[key];
      const propertiesV = this.#properties[key];
      const isValid = !(v === undefined || propertiesV === undefined);
      
      if (!isValid) {
        console.error(`[${this.constructor.name} ${this.id}] invalid properties patch: ${key}: ${v}`);
        continue;
      }
      
      const hasChanged = !this.#valuesMatch(v, propertiesV);
      
      if (hasChanged) {
        this.#properties[key] = v;
      }
    }
    
    this.render();
    
    return this;
  }
  
  render() {
    this.translateTo(this.x, this.y);
    const { point, ...properties } = this.properties;
    Object.assign(this.data, properties, { x: this.x, y: this.y });
    
    // if (this.#hide === true) {
    //   this.data.hide = true;
    // } else {
    //   delete this.data.hide;
    // }
    
    return this;
  }
  
  async wait(time = 0) {
    await sleep(time);
    return this;
  }
  
  toggle(attributeMap, { time = 25, retries = 0 }) {
    if (this.isBusy) {
      this.#updateQueue.push(() => {
        this.toggle.bind(this)(attributeMap, { time, retries });
      });
      
      return this;
    }
    
    this.isBusy = true;
    
    const changedPatch = this.#getChangedPatch(attributeMap.properties);
    const restorePatch = this.#getRestorePatch(changedPatch);
    
    if (!Object.keys(changedPatch).length) {
      this.isBusy = false;
      return this;
    }
    
    this.update(changedPatch);
    
    setTimeout(() => {
      const nextRestorePatch = Object.entries(restorePatch).reduce((patch, [key, value]) => {
        if (this.#valuesMatch(this.#properties[key], changedPatch[key])) {
          patch[key] = value;
        }
        
        return patch;
      }, {});
      
      if (Object.keys(nextRestorePatch).length) {
        this.update(nextRestorePatch);
      }
      
      this.isBusy = false;
    }, time);
    
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
  
  appendDOM(obj) {
    this.dom.append(obj.dom);
    return this;
  }
  
  #getChangedPatch(normalizedPatch = {}) {
    return Object.entries(normalizedPatch).reduce((patch, [key, value]) => {
      if (value !== undefined && !this.#valuesMatch(value, this.#properties[key])) {
        patch[key] = value;
      }
      
      return patch;
    }, {});
  }
  
  #getRestorePatch(changedPatch = {}) {
    return Object.entries(changedPatch).reduce((patch, [key]) => {
      patch[key] = this.#cloneValue(this.#properties[key]);
      return patch;
    }, {});
  }
  
  #cloneValue(value) {
    return value?.clone?.() ?? value;
  }
  
  #valuesMatch(left, right) {
    if (left?.equals && typeof left.equals === 'function') {
      return left.equals(right);
    }
    
    if (right?.equals && typeof right.equals === 'function') {
      return right.equals(left);
    }
    
    return left === right;
  }
  
  toJSON() {
    return { properties: { ...this.#properties }, type: this.#type, id: this.#id };
  }
  
  
  getEl(selector = '') { return this.dom.querySelector(selector); }
  
  getEls(selector = '') { return [...this.dom.querySelectorAll(selector)]; }
}
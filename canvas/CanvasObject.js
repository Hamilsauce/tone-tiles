import { EventEmitter } from 'https://hamilsauce.github.io/hamhelper/event-emitter.js';
import { TransformList } from './TransformList.js';
import { SVGCanvas } from './SVGCanvas.js';

export const DefaultCanvasObjectOptions = {
  id: '',
  classList: [],
  dataset: {
    active: false,
    selected: false,
  },
  attributes: {
    fill: '#000000',
    stroke: '#FFFFFF',
    'stroke-width': 0.05,
    r: 0.4,
    width: 1,
    height: 1,
  },
  transforms: [],
}

export class CanvasObject extends EventEmitter {
  #context;
  #type;
  #id;
  #self;
  #transformList;
  
  constructor(context = new SVGCanvas(), type, options = DefaultCanvasObjectOptions) {
    super();
    this.#context = context;
    this.#type = type;
    this.#id = options.id;
    this.#self = this.#context.useTemplate(type, options);
    this.#transformList = new TransformList(this.#context, this.#self)
  }
  
  get context() { return this.#context; }
  
  get dom() { return this.#self; }
  
  get data() { return this.dom.dataset; }
  
  get transforms() { return this.#transformList; }
  
  get type() { return this.#type; }
  
  get id() { return this.#id; }
  
  get layer() { return this.dom.closest('g.layer') }
  
  translateTo(x, y) {
    this.transforms.translateTo(x, y);
  }
  
  rotateTo() {}
  
  scaleTo(x, y) {
    this.transforms.translateTo(x, y);
  }
  
  remove() {
    this.dom.remove();
  }
  
  show() {
    this.data.visible = true;
  }
  
  hide() {
    this.data.visible = false;
  }
  
  select() {
    this.data.selected = true;
  }
  
  deselect() {
    this.data.selected = false;
  }
  
  setData(key, value) {
    this.data[key] = value;
  }
  
  deleteData(key) {
    delete this.data[key];
  }
  
  getEl(selector = '') { return this.dom.querySelector(selector); }
  
  getEls(selector = '') { return [...this.dom.querySelectorAll(selector)]; }
}
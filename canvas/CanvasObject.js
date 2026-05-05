import ham from 'ham';
import { EventEmitter } from 'https://hamilsauce.github.io/hamhelper/event-emitter.js';
import { TransformList, DEFAULT_TRANSFORMS, DEFAULT_TRANSFORM_MAP } from './TransformList.js';
import { SVGCanvas } from './SVGCanvas.js';
import { CanvasPoint } from './CanvasPoint.js';
const { utils, sleep } = ham;

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
  transforms: DEFAULT_TRANSFORM_MAP,
  dataset: CanvasObjectDisplayState,
};

export class CanvasObject extends EventEmitter {
  #context;
  #type;
  #model = {
    x: null,
    y: null,
    pointerEvents: true,
    unload: false,
    point: { x: null, y: null },
    recoiling: false,
  };
  #x = null;
  #y = null;
  #hide = false;
  #id;
  #self;
  #transformList;
  #subscriptions = new Map();
  #point = { x: null, y: null }
  #isBusy = false;
  #updateQueue = []
  #position = []

  constructor(context = new SVGCanvas(), type = '', options) {
    super();
    const { id, model = {} } = options;

    this.#context = context;
    this.#type = type;

    this.#id = id ?? `${type}${utils.uuid()}`;

    // this.#self = this.#context.useTemplate(type, {
    //   withHarness: type !== 'tile',
    //   id: this.#id,
    //   dataset: this.#model,
    // });
    const { template, transforms } = this.#context.createCanvasObject(type, {
      withHarness: type !== 'tile',
      id: this.#id,
      dataset: this.#model,
      transforms: options.transforms
    });
    this.#self = template;

    // const translate = transforms.filter(_ => _.type === 'translate')
    // const others = transforms.filter(_ => _.type !== 'translate')
    // console.warn('template, transforms', template, transforms)
    this.#position = transforms.position;
    this.#transformList = transforms.transformList;
    Object.assign(this.#model, this.#normalizeSpatialPatch(model));


    // this.#transformList = new TransformList(this.#context, this.#self, transforms);
    // this.#position = new TransformList(this.#context, this.#self, translate);
    // this.#transformList = new TransformList(this.#context, this.#self, transforms);
  }

  get context() { return this.#context; }

  get dom() { return this.#self; }

  get model() { return this.#model; }

  get x() { return this.#model.point?.x ?? this.#model.x; }

  set x(v) {
    this.#model.x = v;
    this.#model.point = new CanvasPoint(v, this.y ?? 0);
  }

  get y() { return this.#model.point?.y ?? this.#model.y; }

  set y(v) {
    this.#model.y = v;
    this.#model.point = new CanvasPoint(this.x ?? 0, v);
  }

  get data() { return this.dom.dataset; }

  get isVisible() { return !this.#hide; }

  get transforms() { return this.#transformList; }

  get type() { return this.#type; }

  get id() { return this.#id; }

  get isBusy() { return this.#isBusy; }

  set isBusy(v) {
    if (this.#isBusy && !v && this.#updateQueue.length) {
      this.#isBusy = v;

      const update = this.#updateQueue.shift()
      update();
    } else {
      this.#isBusy = v;
    }
  }

  get point() { return this.#model.point; }

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
    const normalizedPatch = this.#normalizeSpatialPatch(attributeMap);

    for (const key in normalizedPatch) {
      const v = normalizedPatch[key];
      const modelV = this.#model[key];
      const hasChanged = v !== modelV;
      const isValid = !(v === undefined || modelV === undefined);

      if (v !== undefined && hasChanged) {
        this.#model[key] = v;
      } else if (!isValid) {
        console.error(`[${this.constructor.name} ${this.id}] invalid Model patch: ${key}: ${v}\n\nReasons: isValid: ${isValid}, hasChanged: ${hasChanged}`);
      }
    }

    this.render();

    return this;
  }

  render() {
    this.translateTo(this.x, this.y);
    const { point, ...model } = this.model;
    Object.assign(this.data, model, { x: this.x, y: this.y });

    if (this.#hide === true) {
      this.data.hide = true;
    } else {
      delete this.data.hide;
    }

    return this;
  }

  async wait(time = 0) {
    await sleep(time);
    return this;
  }

  toggle(attributeMap, { time = 25, retries = 0 }) {
    if (this.isBusy) {
      this.#updateQueue.push(() => {
        this.toggle.bind(this)(attributeMap, { time, retries })
      })

      return this;
    }

    this.isBusy = true;

    const model = { ...this.#model }
    this.update(attributeMap)

    setTimeout(() => {
      this.update(model)
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
    this.dom.append(obj.dom)
    return this;
  }

  #normalizeSpatialPatch(source = {}) {
    const basePoint = this.#model.point ?? new CanvasPoint(this.#model.x ?? 0, this.#model.y ?? 0);
    const pointSource = source.point ?? {
      x: source.x ?? basePoint.x,
      y: source.y ?? basePoint.y,
    };
    const point = CanvasPoint.from(pointSource);

    return {
      ...source,
      point,
      x: point.x,
      y: point.y,
    };
  }

  getEl(selector = '') { return this.dom.querySelector(selector); }

  getEls(selector = '') { return [...this.dom.querySelectorAll(selector)]; }
}
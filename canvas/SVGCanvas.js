import ham from 'ham';
import { rxjs } from 'rxjs';
import { createCustomEvent } from '../lib/create-event.js';
import { CanvasObject, DefaultCanvasObjectOptions } from './CanvasObject.js';
import { CanvasActor } from './CanvasActor.js';
import { initHueRoto } from '../lib/hue-rotato.js';
import { CanvasScene } from '../canvas/CanvasScene.js';
import { TileObject } from '../canvas/TileObject.js';

const { getPanZoom, template, utils, download, TwoWayMap } = ham;

const { fromEvent, operators } = rxjs;
const { filter, map, tap } = operators;
let hasInitViewBox = false;
const DRAG_DISTANCE_THRESHOLD = 4;

export class SVGCanvas extends EventTarget {
  #self = null;
  #surface = null;
  #scene = null;
  #isContextMenuActive = false;
  #pointerDown = null;
  #didDrag = false;
  #suppressNextClick = false;


  constructor(svg) {
    super();

    this.#self = svg;
    this.hueRotato = initHueRoto(this.#self);


    this.surfaceLayer = this.dom.querySelector('#surface-layer');
    this.#surface = this.surfaceLayer.querySelector('#surface');


    this.viewport = this.dom.querySelector('#viewport');
    this.minimap = this.dom.querySelector('#minimap');


    this.#scene = new CanvasScene(this, [
      {
        name: 'tile',
        id: 'tile-layer',
        transforms: [{ type: 'translate', values: [0.5, 0.5], position: 0 }]
      },
      {
        name: 'object',
        id: 'object-layer',
        transforms: [{ type: 'translate', values: [0.5, 0.5], position: 0 }]
      }]);

    this.viewport.append(this.#scene.dom);

    this.layers = {
      surface: this.dom.querySelector('#surface-layer'),
      tile: this.dom.querySelector('#tile-layer'),
      object: this.dom.querySelector('#object-layer'),
    };

    let shouldInvert = 0;


    this.#surface.addEventListener('dblclick', (e) => {
      shouldInvert = shouldInvert === 0 ? 1 : 0;
      this.layers.tile.style.filter = `hue-rotate(55deg) invert(${shouldInvert}) drop-shadow(1px 1px 0.1px #00000050)`;
    });


    document.querySelector('#map-name-text').addEventListener('dblclick', (e) => {
      this.hueRotato(false);
    });

    this.addEventListener('blurContextMenu', (e) => {
      this.#isContextMenuActive = false;
    });

    getPanZoom(this.dom);
    this.hueRotato(true);

    this.pointerDownDOM$ = fromEvent(this.#self, 'pointerdown').pipe(
      tap(({ clientX, clientY }) => {
        this.#suppressNextClick = false;
        this.#pointerDown = { x: clientX, y: clientY };
        this.#didDrag = false;
      }),
    );

    this.pointerMoveDOM$ = fromEvent(this.#self, 'pointermove').pipe(
      tap(({ clientX, clientY }) => {
        if (!this.#pointerDown || this.#didDrag) return;

        const dx = clientX - this.#pointerDown.x;
        const dy = clientY - this.#pointerDown.y;
        const distance = Math.hypot(dx, dy);

        if (distance >= DRAG_DISTANCE_THRESHOLD) {
          this.#didDrag = true;
        }
      }),
    );

    this.pointerUpDOM$ = fromEvent(this.#self, 'pointerup').pipe(
      tap(() => {
        if (this.#pointerDown && this.#didDrag) {
          this.#suppressNextClick = true;
        }

        this.#pointerDown = null;
        this.#didDrag = false;
      }),
    );

    this.clickDOM$ = fromEvent(this.#self, 'click').pipe(
      filter(() => {
        if (!this.#suppressNextClick) return true;

        this.#suppressNextClick = false;
        return false;
      }),
      tap(e => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }),
    );

    this.contextMenuDOM$ = fromEvent(this.#self, 'contextmenu').pipe(
      tap(e => {
        e.preventDefault();
        e.stopPropagation();
      }),
      map(({ type, target, clientX, clientY }) => {
        const layerDOM = target.closest('[data-type="layer"]');

        if (!layerDOM) return null;

        const layerName = layerDOM.dataset.name;

        const point = this.domPoint(clientX, clientY);
        const isTile = !!target.closest('.tile');
        const x = Math.floor(point.x);
        const y = Math.floor(point.y);

        return {
          type: `${layerName}:${type}`,
          detail: {
            id: `${x}_${y}`,
            x,
            y,
            target,
          }
        };
      }),
      filter(e => !!e),
      map(({ type, detail }) => createCustomEvent(type, detail)),
      tap((event) => this.dispatchEvent(event)),
      // tap((evt) => { console.warn(`[ CANVAS EVENT ] ${evt.type}: `); }),
    );

    this.eventEmits$ = this.clickDOM$.pipe(
      map((e) => {
        e.stopPropagation();
        e.stopImmediatePropagation();
        e.preventDefault();
        const { type, target, clientX, clientY } = e;

        const layerDOM = target.closest('[data-type="layer"]');
        const layerName = layerDOM.dataset.name;

        const point = this.domPoint(clientX, clientY);
        const isTile = !!target.closest('.tile');
        const x = Math.floor(point.x);
        const y = Math.floor(point.y);

        return {
          type: `${layerName}:${type}`,
          detail: {
            id: `${x}_${y}`,
            x,
            y,
          }
        };
      }),
      map(({ type, detail }) => createCustomEvent(type, detail)),
      tap((event) => this.dispatchEvent(event)),
      tap((evt) => { console.warn('[ CANVAS EVEVENT ]: ', evt.type); }),
    );

    this.toggleScroll = this.#toggleScroll.bind(this);
    this.pointerDownDOMSubscription = this.pointerDownDOM$.subscribe();
    this.pointerMoveDOMSubscription = this.pointerMoveDOM$.subscribe();
    this.pointerUpDOMSubscription = this.pointerUpDOM$.subscribe();
    this.clickDOMSubscription = this.eventEmits$.subscribe();
    this.contextmenuDOMSubscription = this.contextMenuDOM$.subscribe();
  }

  get dom() { return this.#self; }

  get boundingClientRect() { return this.dom.getBoundingClientRect(); }

  get bounds() {
    const { x, y, width, height } = this.boundingClientRect;

    return {
      top: y,
      right: x + width,
      bottom: y + height,
      left: x,
    };
  }

  get isContextMenuActive() { return this.#isContextMenuActive; }

  get scene() { return this.#scene; }

  get surface() { return this.#surface; }

  get parentElement() { return this.#self.parentElement; }

  get viewBox() { return this.#self.viewBox.baseVal; }

  useTemplate(templateName, options = {}) {
    const el = this.#self.querySelector(`[data-template="${templateName}"]`).cloneNode(true);

    delete el.dataset.template;

    if (options.dataset) Object.assign(el.dataset, options.dataset);

    if (options.id) el.id = options.id;

    if (options.fill) el.style.fill = options.fill;

    return el;
  };

  destroy(x, y) {
    this.pointerDownDOMSubscription.unsubscribe();
    this.pointerMoveDOMSubscription.unsubscribe();
    this.pointerUpDOMSubscription.unsubscribe();
    this.clickDOMSubscription.unsubscribe();
    this.contextmenuDOMSubscription.unsubscribe();
    this.hueRotato(false);

    this.#scene.clear();

  }

  domPoint(x, y) {
    return new DOMPoint(x, y).matrixTransform(
      this.#scene.dom.getScreenCTM().inverse()
    );
  }

  createObject(type, options = {}) {
    const normalizedOptions = options?.model ? options : {
      ...options,
      model: options,
    };
    const { model = {}, ...rest } = normalizedOptions;

    if (type === 'tile') {
      return new TileObject(this, {
        ...rest,
        id: rest.id ?? model.id ?? model.address,
        model,
      });
    }

    if (type === 'actor') {
      return new CanvasActor(this, {
        ...rest,
        id: rest.id ?? model.id,
        model,
      });
    }

    const cObj = new CanvasObject(this, type, {
      ...rest,
      id: rest.id ?? model.id,
      model,
    });

    return cObj;
  }

  createTileObject({ x, y, tileType, linkedMap, linkedNodeAddress }) {
    const model = {
      tileType,
      x,
      y,
      current: false,
      active: false,
      isPathNode: false,
      linkedNodeAddress: linkedNodeAddress ?? '',
      linkedMap,
      id: null,
    };

    return t;
  }

  #toggleScroll(x, y) {
    this.#isContextMenuActive = !this.#isContextMenuActive;

    if (this.isContextMenuActive) {
      this.dom.removeEventListener('contextmenu', this.toggleScroll);
      this.dom.addEventListener('click', this.toggleScroll);
    } else {
      this.dom.addEventListener('contextmenu', this.toggleScroll);
      this.dom.removeEventListener('click', this.toggleScroll);
    }
  }

  createTileObject({ x, y, tileType, linkedMap, linkedNodeAddress }) {
    const model = {
      tileType,
      x,
      y,
      current: false,
      active: false,
      isPathNode: false,
      linkedNodeAddress: linkedNodeAddress ?? '',
      linkedMap,
    };

    const t = this.createObject('tile', { model });

    return t;
  }

  createTile({ x, y, tileType, linkedMap }) {
    const t = this.useTemplate('tile', {
      dataset: {
        tileType,
        x,
        y,
        current: false,
        active: false,
        isPathNode: false,
      },
    });

    if (linkedMap) {
      t.dataset.linkedMap = linkedMap;
    }

    t.setAttribute('transform', `translate(${x},${y})`);

    t.id = 'rect' + utils.uuid();

    return t;
  }

  createRect({ classList, width, height, x, y, textContent, dataset }) {
    const g = document.createElementNS(SVG_NS, 'g');
    const r = document.createElementNS(SVG_NS, 'rect');

    Object.assign(g.dataset, dataset);
    g.setAttribute('transform', `translate(${dataset.x},${dataset.y})`);
    g.classList.add(...(classList || ['tile']));
    // r.classList.add('gradient');

    g.id = 'rect' + utils.uuid();

    r.setAttribute('width', width);
    r.setAttribute('height', height);

    g.append(r);

    if (textContent) {
      const t = this.createText({ textContent });
      g.append(t);
    }

    return g;
  }

  createText({ textContent }) {
    const textNode = document.createElementNS(SVG_NS, 'text');
    textNode.style.fontSize = '0.0175rem';
    textNode.style.textAnchor = 'middle';
    textNode.style.dominantBaseline = 'middle';
    textNode.textContent = textContent;
    textNode.setAttribute('transform', 'translate(0.5,0.5)');

    return textNode;
  }

  setCanvasDimensions({ width, height } = {}) {
    if (+width) {
      height = +height ? height : width;


      this.#self.setAttribute('width', width);
      this.#self.setAttribute('height', height);
    }
    else if (this.parentElement) {
      const { width, height } = this.parentElement.getBoundingClientRect();


      this.#self.setAttribute('width', width);
      this.#self.setAttribute('height', height);
    }

    else {
      this.#self.setAttribute('width', window.innerWidth);
      this.#self.setAttribute('height', window.innerHeight);
    }

    return this;
  }

  setViewBox({ x = 0, y = 0, width = 100, height = 100 }) {
    Object.assign(this.viewBox, { x, y, width, height, });

    setTimeout(() => {
      const tileBB = this.layers.tile.getBBox();
    }, 0);


    return this;
  }


  // isInView(coords) {
  //   const { x, y, width, height } = this.viewBox;


  //   return coords.x >= x &&
  //     coords.y >= y &&
  //     coords.x <= width &&
  //     coords.y <= height;
  // }


  getPixelAspectRatio() {
    const { width, height } = this.#self.getBoundingClientRect();

    return width / height;
  }

  getAspectRatio() {
    const { width, height } = this.#self.getBBox();

    return width / height;
  }

  querySelector(selector) { return this.#self.querySelector(selector); }

  querySelectorAll(selector) { return [...this.#self.querySelectorAll(selector)]; }
}

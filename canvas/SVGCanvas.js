import ham from 'https://hamilsauce.github.io/hamhelper/hamhelper1.0.0.js';
import { createCustomEvent } from '../lib/create-event.js';
import { CanvasObject, DefaultCanvasObjectOptions } from './CanvasObject.js';
import { initHueRoto } from '../lib/hue-rotato.js';
import { Scene } from '../canvas/Scene.js';

const { getPanZoom, template, utils, download, TwoWayMap } = ham;

const { fromEvent, } = rxjs;
const { flatMap, reduce, groupBy, toArray, mergeMap, switchMap, scan, map, tap, filter } = rxjs.operators;

export class SVGCanvas extends EventTarget {
  #self = null;
  #surface = null;
  #scene = null;
  #isContextMenuActive = false;

  constructor(svg) {
    super();

    this.#self = svg;
    this.hueRotato = initHueRoto(this.#self);

    this.surfaceLayer = this.dom.querySelector('#surface-layer');
    this.#surface = this.surfaceLayer.querySelector('#surface');

    this.viewport = this.dom.querySelector('#viewport');
    this.minimap = this.dom.querySelector('#minimap');

    this.#scene = new Scene(this, [
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

    // this.layers.tile.addEventListener('contextmenu', (e) => {
    //   this.#isContextMenuActive = true;

    //   this.dom.addEventListener('click', this.toggleScroll);
    //   document.querySelector('.context-menu-container').addEventListener('click', this.toggleScroll);
    // });

    let shouldInvert = 0;

    this.#surface.addEventListener('dblclick', (e) => {
      shouldInvert = shouldInvert === 0 ? 1 : 0;
      this.layers.tile.style.filter = `hue-rotate(55deg) invert(${shouldInvert}) drop-shadow(1px 1px 0.1px #00000050)`;
    });

    document.querySelector('#map-name-text').addEventListener('dblclick', (e) => {
      this.hueRotato();
    });

    this.addEventListener('blurContextMenu', (e) => {
      this.#isContextMenuActive = false;
    });

    getPanZoom(this.dom);
    this.hueRotato();

    this.clickDOM$ = fromEvent(this.#self, 'click').pipe(
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
        // e.stopImmediatePropagation();
      }),
      map(({ type, target, clientX, clientY }) => {
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
            target,
          }
        };
      }),
      map(({ type, detail }) => createCustomEvent(type, detail)),
      tap((event) => this.dispatchEvent(event)),
      tap((evt) => { console.warn(`[ CANVAS EVENT ] ${evt.type}: `, evt); }),
    );

    this.pointerMove$ = fromEvent(this.#self, 'pointermove').pipe(tap(e => {
      const vpTransform = this.viewport.transform.baseVal;
      const matrix = vpTransform.getItem(0).matrix;
      const transformFromMatrix = vpTransform.createSVGTransformFromMatrix(matrix);
      const xform = this.viewport.getAttribute('transform');

      // const minimapBB = this.minimap.getBoundingClientRect();
      // const mmBB = {
      //   left: minimapBB.x,
      //   top: minimapBB.y,
      //   right: minimapBB.x + minimapBB.width,
      //   bottom: minimapBB.y + minimapBB.height,
      // };

    }));

    this.pointerMove$.subscribe();

    this.eventEmits$ = this.clickDOM$.pipe(
      map(({ type, target, clientX, clientY }) => {
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

  domPoint(x, y) {
    return new DOMPoint(x, y).matrixTransform(
      this.#scene.dom.getScreenCTM().inverse()
    );
  }

  createObject(type, model = {}) {
    const cObj = new CanvasObject(this, type, { model });

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
    };

    const t = this.createObject('tile', model);

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
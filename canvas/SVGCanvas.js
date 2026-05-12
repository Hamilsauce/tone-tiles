import ham from 'ham';
import { rxjs } from 'rxjs';
import { createCustomEvent } from '../lib/create-event.js';
import { CanvasObject, DefaultCanvasObjectOptions } from './CanvasObject.js';
import { CanvasActor } from './CanvasActor.js';
import { initHueRoto } from '../lib/hue-rotato.js';
import { getUserEvents } from '../lib/get-user-event.js';
import { CanvasScene } from '../canvas/CanvasScene.js';
import { TileObject } from '../canvas/TileObject.js';
import { DarkSun } from '../canvas/DarkSun.js';
import { BigRupture } from '../canvas/BigRupture.js';
import { TransformList, DEFAULT_TRANSFORM_MAP, DEFAULT_TRANSFORMS } from './TransformList.js';

import { createConnectionBus } from '../core/create-connection.js';
const { getPanZoom, template, utils, download, TwoWayMap } = ham;

const { fromEvent, operators, merge } = rxjs;
const { filter, map, tap } = operators;
const DRAG_DISTANCE_THRESHOLD = 4;

const TEMPLATE_CONFIG = {
	'context-menu': {
		withHarness: false,
		transforms: {
			spatial: ['translate', 'rotate', 'scale'],
			visual: [],
		},
	},
	group: {
		withHarness: false,
		transforms: {
			spatial: ['translate'],
			visual: [],
		},
	},
	layer: {
		withHarness: false,
		transforms: {
			spatial: ['translate'],
			visual: [],
		},
	},
	
	tile: {
		withHarness: false,
		transforms: {
			spatial: ['translate'],
			visual: [],
		},
	},
	
	actor: {
		withHarness: true,
		transforms: {
			spatial: ['translate'],
			visual: ['rotate', 'scale'],
		},
	},
	
	'dark-sun': {
		withHarness: true,
		transforms: {
			spatial: ['translate'],
			visual: ['rotate', 'scale'],
		},
	},
	
	'big-rupture': {
		withHarness: true,
		transforms: {
			spatial: ['translate'],
			visual: ['rotate', 'scale'],
		},
	},
};


export class SVGCanvas extends EventTarget {
	#self = null;
	#surface = null;
	#scene = null;
	#isContextMenuActive = false;
	#pointerDown = null;
	#didDrag = false;
	#suppressNextClick = false;
	#harnessTemplate = null;
	
	
	constructor(svg) {
		super();
		createConnectionBus(this);
		
		this.#self = svg ?? document.querySelector('#canvas');
		
		this.hueRotato = initHueRoto(this.#self);
		this.surfaceLayer = this.dom.querySelector('#surface-layer');
		this.#surface = this.surfaceLayer.querySelector('#surface');
		
		this.viewport = this.dom.querySelector('#viewport');
		this.minimap = this.dom.querySelector('#minimap');
		
		this.#scene = new CanvasScene(this, [{
			name: 'tile',
			id: 'tile-layer',
			transforms: { translate: DEFAULT_TRANSFORM_MAP.translate },
		},
		{
			name: 'object',
			id: 'object-layer',
			transforms: { translate: DEFAULT_TRANSFORM_MAP.translate },
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
		
		this.toggleScroll = this.#toggleScroll.bind(this);
		
		const { eventEmits$, pointerEvents$ } = getUserEvents(this)
		eventEmits$ .pipe(
			tap(x => console.log('eventEmits$', x)),
		)

		this.in({ name: 'user-events', source$: eventEmits$ });
		
		this.pointerDOMSubscription = pointerEvents$.subscribe();
	}
	
	get dom() { return this.#self; }
	
	get harnessTemplate() {
		if (!this.#harnessTemplate) {
			this.#harnessTemplate = this.#self.querySelector(`[data-template="canvas-harness"]`);
			delete this.#harnessTemplate.dataset.template
		}
		
		return this.#harnessTemplate.cloneNode(true);
	}
	
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
	
	createCanvasObject(type, options) {
		const config = TEMPLATE_CONFIG[type];
		const defaultTransforms = options.transforms || DEFAULT_TRANSFORM_MAP
		
		const base = this.useTemplate(type, options);
		
		let template, transformTarget;
		
		if (config.withHarness) {
			const harness = this.harnessTemplate
			const slot = harness.querySelector('[data-slot="object"]');
			slot.appendChild(base);
			
			template = harness;
			transformTarget = slot;
		} else {
			template = base;
			transformTarget = base;
		}
		
		if (options.dataset) Object.assign(template.dataset, options.dataset);
		if (options.id) template.id = options.id;
		
		return {
			template,
			transforms: {
				position: new TransformList(this, template, [defaultTransforms.translate]),
				transformList: new TransformList(this, transformTarget, [{ type: 'translate', values: [0, 0] }, defaultTransforms.rotate, defaultTransforms.scale]),
			}
		};
	}
	
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
		
		if (type === 'dark-sun') {
			return new DarkSun(this, {
				...rest,
				id: rest.id ?? model.id,
				model,
			});
		}

		if (type === 'big-rupture') {
			return new BigRupture(this, {
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
		} else if (this.parentElement) {
			const { width, height } = this.parentElement.getBoundingClientRect();
			
			this.#self.setAttribute('width', width);
			this.#self.setAttribute('height', height);
		} else {
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
	
	querySelector(selector) { return this.#self.querySelector(selector); }
	
	querySelectorAll(selector) { return [...this.#self.querySelectorAll(selector)]; }
}
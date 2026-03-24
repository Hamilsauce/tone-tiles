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
}

export const CanvasObjectDisplayState = {
	selected: false,
	active: false,
	hide: false,
}

export const DefaultCanvasObjectOptions = {
	id: '',
	model: DefaultCanvasObjectModel,
	transforms: DEFAULT_TRANSFORMS,
	dataset: CanvasObjectDisplayState,
}

export class CanvasObject extends EventEmitter {
	#context;
	#type;
	#model = { x: 0, y: 0 };
	#x = 0;
	#y = 0;
	#hide = false;
	#id;
	#self;
	#transformList;

	constructor(context = new SVGCanvas(), type = '', options) {
		super();
		const { id, model = {}, transforms } = options;

		this.#context = context;
		this.#type = type;
		Object.assign(this.#model, model)
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

	get layer() { return this.dom.closest('g.layer') }

	get parent() { return this.dom.parentElement; }

	translateTo(x, y) {
		this.transforms.translateTo(x, y);
		return this;
	}

	rotateTo() {}

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
		this.render();
		return this;
	}

	hide() {
		this.#hide = true;
		this.render();
		return this;
	}

	update(attributeMap = {}) {
		for (const key in this.model) {
			this.model[key] = attributeMap[key] === undefined ? this.model[key] : attributeMap[key];
		}

		this.render();

		return this;
	}

	render() {
		this.translateTo(this.x, this.y)
		Object.assign(this.data, this.model);

		if (this.#hide === true) {
			this.data.hide = true;
		} else {
			delete this.data.hide;
		}

		return this;
	}

	deleteData(key) {
		delete this.data[key];
		return this;
	}

	disableEvents() {
		this.el.style.pointerEvents = 'none';
		return this;
	}

	getEl(selector = '') { return this.dom.querySelector(selector); }

	getEls(selector = '') { return [...this.dom.querySelectorAll(selector)]; }

}
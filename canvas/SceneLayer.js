import { CanvasObject } from './CanvasObject.js';



export class SceneLayer extends CanvasObject {
	#name = null
	#objects = new Map()
	
	constructor(ctx, name, options = {}) {
		options.model = options.model ? { ...options.model, name, type: 'layer' } : { name, type: 'layer' }
		super(ctx, 'layer', options);
		this.#name = name;
		
		if (options.objects) {
			options.objects.forEach(this.add)
		}
	};
	
	get objects() { return this.#objects }
	
	get name() { return this.#name }
	
	add(obj) {
		if (typeof obj.type !== 'string') {
			console.warn('obj', obj)
			throw new Error('No object type in layer add');
		}
		
		const cObj = obj instanceof CanvasObject ? obj : this.context.createObject(obj.type, obj)
		
		this.#objects.set(obj.id, cObj);
		this.dom.appendChild(cObj.dom);
		cObj.update()
		this.emit('object:add', cObj);
		
		return cObj;
	}
	
	load(id, data = {}) {
		const obj = this.#objects.get(id);
		if (!obj) return;
		
		
		// this.dom.appendChild(obj.dom);
		// obj.dom.style.display = ''
		obj.update({ unload: false, ...data})
		
		// this.#objects.delete(id);
		
		this.emit('object:load', obj);
	}
	
	unload(id) {
		const obj = this.#objects.get(id);
		if (!obj) return;
		
		// obj.dom.style.display = 'none'
		obj.update({ unload: true })
		
		// obj.remove();
		// this.#objects.delete(id);
		
		this.emit('object:unload', obj);
	}
	
	remove(id) {
		const obj = this.#objects.get(id);
		if (!obj) return;
		
		obj.remove();
		this.#objects.delete(id);
		
		this.emit('object:remove', obj);
	}
	
	get(id) {
		return this.#objects.get(id);
	}
	
	findAll(attributeMap = {}) {
		const entries = Object.entries(attributeMap);
		
		return [...this.#objects.values()].filter((o) => {
			return entries.every(([k, v]) => o.model[k] === v)
		});
	}
	
	findAny(attributeMap = {}) {
		const entries = Object.entries(attributeMap);
		
		return [...this.#objects.values()].filter((o) => {
			return entries.some(([k, v]) => typeof v === 'function' ? v(o.model[k]) : o.model[k] === v);
		});
	}
	
	forEach(fn) {
		this.#objects.forEach(fn);
	}
	
	clear() {
		for (const obj of this.#objects.values()) {
			obj.remove(true);
		}
		
		this.#objects.clear();
	}
	
	sort(compareFn) {
		const sorted = [...this.#objects.values()].sort(compareFn)
		
		sorted.forEach(obj => {
			this.el.appendChild(obj.el)
		})
	}
	
	bringToFront(obj) {
		this.dom.append(obj.dom);
	}
	
	sendToBack(obj) {
		this.dom.prepend(obj.dom);
	}
	
	insertBefore(obj, target) {
		this.dom.insertBefore(obj.dom, target.dom);
	}
	
	serialize() {
		return [...this.#objects.values()].map(o => o.toJSON())
	}
}
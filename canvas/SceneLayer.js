import { CanvasObject } from './CanvasObject.js';

export class SceneLayer extends CanvasObject {
	#name = null
	#objects = new Map()
	
	constructor(ctx, name, options = {}) {
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
		
		const cObj = this.context.createObject(obj.type, obj)
		
		this.#objects.set(obj.id, cObj);
		this.dom.appendChild(cObj.dom);
		cObj.update()
		this.emit('object:add', cObj);
		
		return cObj;
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
	
	forEach(fn) {
		this.#objects.forEach(fn);
	}
	
	clear() {
		for (const obj of this.#objects.values()) {
			obj.remove();
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
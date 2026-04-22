export const DefaultModelOptions = {
	type: '',
	id: '',
	properties: {},
	emitCallback: null,
};

export class Model {
	#type = null;
	#id = null
	#properties = {};
	#emit;
	
	constructor(options = DefaultModelOptions) {
		const { id, type, properties, emitCallback } = options
		this.#id = id;
		this.#type = type;
		this.#properties = { ...properties };
		this.#emit = emitCallback;
	}
	
	get id() { return this.#id; }
	
	get type() { return this.#type; }
	
	update(attributeMap = {}) {
		const patch = Object.entries(attributeMap).reduce((ptch, [k, v]) => {
			const modelV = this.#properties[k];
			const isValid = !(v === undefined || modelV === undefined);
			
			if (isValid && v !== modelV) {
				ptch = ptch ?? {};
				this.#properties[k] = v;
				ptch[k] = v;
			} else if (!isValid) {
				console.error(`[${this.constructor.name} ${this.id}] invalid Model patch: ${k}: ${v}`);
			}
			
			return ptch;
		}, null);
		
		if (!patch) return;
		
		// instantiate event or push raw data to stream?
		this.#emit({
			type: 'node:update',
			id: this.id,
			data: patch,
		});
		
		return this;
	}
	
	toJSON() {
		return { ...this.#properties, type: this.#type, id: this.#id }
	}
	
	data() {
		const { objects, ...res } = this.toJSON();
		
		Object.entries(res).forEach(([k, v]) => {
			if ([undefined].includes(v)) {
				delete res[k];
			}
		});
		
		return res;
	}
}
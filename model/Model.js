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
		const { id, type, properties, emitCallback } = options;

    if ([id, type, emitCallback].includes(undefined)) {
      throw new Error(`Model requires id, type, and emitCallback: ${JSON.stringify(options)}`);
    }

		this.#id = id ?? properties?.id ?? null;
		this.#type = type ?? properties?.type ?? null;
		this.#properties = { ...properties };
		this.#emit = emitCallback;
		this.update()
	}

	get id() { return this.#id; }

	get type() { return this.#type; }

	get properties() { return this.#properties; }

	get emit() { return this.#emit; }

	update(attributeMap = {}) {
		let patch = this.data();

		if (attributeMap) {
			patch = Object.entries(attributeMap).reduce((ptch, [k, v]) => {
				const modelV = this.#properties[k];
				const isValid = !(v === undefined || modelV === undefined);

				if (v !== undefined && v !== modelV) {
					ptch = ptch ?? {};
					this.#properties[k] = v;
					ptch[k] = v;
				} else if (!isValid) {
					console.error(`[${this.constructor.name} ${this.id}] invalid Model patch: ${k}: ${v}`);
				}

				return ptch;
			}, null);

			if (!patch) return;
		}

		// instantiate event or push raw data to stream?
		this.#emit({
			type: `${this.#type}:update`,
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

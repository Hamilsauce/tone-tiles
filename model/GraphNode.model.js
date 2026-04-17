export class GraphNode extends EventEmitter {
	#data = {
		type: 'tile',
		id: null,
		tileType: null,
		x: null,
		y: null,
		address: null,
		target: null,
		current: false,
		active: false,
		isPathNode: false,
		isVisited: false,
		linkedNodeAddress: null,
		linkedMap: null,
		selected: false,
		isLink: false,
		dir: null,
		highlight: false,
	};
	
	objects = new Set();
	#context;
	
	constructor(context, data = {}) {
		super();
		this.#context = context;
		this.update(createNodeData(data));
	}
	
	get id() { return `${this.x}_${this.y}`; }
	
	get type() { return this.#data.type; }
	
	get _data() { return this.#data; }
	
	get linkedMap() { return this.#data.linkedMap; }
	
	get current() { return this.#data.current; }
	
	get active() { return this.#data.active; }
	
	get selected() { return this.#data.selected; }
	
	get tileType() { return this.#data.tileType; }
	
	set tileType(v) { this.#data.tileType = v; }
	
	get isTraversable() { return TRAVERSABLE_TILE_TYPES.includes(this.#data.tileType); }
	
	get address() { return `${this.x}_${this.y}`; }
	
	get x() { return this.#data.x; }
	
	get y() { return this.#data.y; }
	
	get point() { return new CanvasPoint(this.x, this.y); }
	
	get linkedNodeAddress() { return this.#data.target ? [this.#data.target.x, this.#data.target.y].join('_') : null; }
	
	get target() { return this.#data.target; }
	
	set target(v) { this.#data.target = v; }
	
	get isOccupied() { return !!this.objects.size; }
	
	// GraphNode model
	update(attributeMap = {}) {
		const patch = Object.entries(attributeMap).reduce((ptch, [k, v]) => {
			const modelV = this.#data[k];
			const isValid = !(v === undefined || modelV === undefined);
			
			if (isValid && v !== modelV) {
				ptch = ptch ?? {};
				this.#data[k] = v;
				ptch[k] = v;
			} else if (!isValid) {
				console.error(`[Graph Node ${this.id}] invalid Model patch: ${k}: ${v}`);
			}
			
			return ptch;
		}, null);
		
		if (!patch) return;
		
		this.#context.emit(
			'node:update', {
				id: this.id,
				data: patch,
			});
		
		return this;
	}
	
	addObject(id) {
		this.objects.add(id)
		
		this.#context.emit(
			'node:update', {
				id: this.id,
				data: { occupied: this.isOccupied },
			});
	}
	
	deleteObject(id) {
		this.objects.delete(id)
		
		this.#context.emit(
			'node:update', {
				id: this.id,
				data: { occupied: this.isOccupied },
			});
	}
	
	hasProp(key) {
		return this.#data[key] !== undefined;
	}
	
	linkToNode({ x, y }) {
		this.#data.target = { x, y };
	}
	
	toJSON() {
		return { ...this.#data, objects: [...this.objects] };
	}
	
	data() {
		const { objects, ...res } = this.toJSON();
		
		Object.entries(res).forEach(([k, v]) => {
			if ([undefined].includes(v)) {
				delete res[k];
			}
		});
		
		res.id = this.id;
		res.address = this.address;
		res.occupied = this.isOccupied
		
		return res;
	}
}

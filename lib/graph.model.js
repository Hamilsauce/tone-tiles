import ham from 'ham';
import { EventEmitter } from 'https://hamilsauce.github.io/hamhelper/event-emitter.js';
import { CanvasPoint } from '../canvas/CanvasPoint.js';

const v1 = undefined;
const v2 = undefined;

const isvalid = v1 !== undefined && v2 !== undefined;

const { template, utils, download } = ham;

export const TILE_TYPE_INDEX = [
	'empty',
	'barrier',
	'start',
	'goal',
	'teleport',
];
export const TileTypeMap = {
	empty: 'empty',
	barrier: 'barrier',
	start: 'start',
	goal: 'goal',
	teleport: 'teleport',
};

const TileTypes = TILE_TYPE_INDEX.reduce((acc, curr, i) => {
	return { ...acc, [curr]: i };
}, {});

const DIRECTIONS = new Map([
	['up', { x: 0, y: -1 }],
	['down', { x: 0, y: 1 }],
	['left', { x: -1, y: 0 }],
	['right', { x: 1, y: 0 }],
]);

const DIR_LOOKUP = new Map(
	[...DIRECTIONS.entries()].map(([name, { x, y }]) => [
		`${x}_${y}`,
		name
	])
);

const DIRECTION_CHORD_TONE = new Map([
	['up', 0],
	['down', 2],
	['left', 4],
	['right', 6],
]);

export const getChordToneDegreeFromDir = (dir) => {
	return DIRECTION_CHORD_TONE.get(dir);
};

export const getLinkCoords = (dir = 'n', { width, height }) => {
	let x, y;

	if (dir.toLowerCase() === 'n') {
		x = Math.floor(width / 2);
		y = -1;
	}

	if (dir.toLowerCase() === 'e') {
		y = Math.floor(height / 2);
		x = width;
	}

	if (dir.toLowerCase() === 's') {
		x = Math.floor(width / 2);
		y = height;
	}

	if (dir.toLowerCase() === 'w') {
		x = -1;
		y = Math.floor(height / 2);
	}

	return { x, y };
};
export const getDirectionFromPoints = (p1, p2) => {
	if (!p1 || !p2) return null;

	const dx = p2.x - p1.x;
	const dy = p2.y - p1.y;

	return DIR_LOOKUP.get(`${dx}_${dy}`) || null;
};

const DETAULT_TILE_DATA = {
	type: 'tile',
	id: null,
	tileType: null,
	current: false,
	active: false,
	address: null,
	x: null,
	y: null,
	isPathNode: false,
	isVisited: false,
	linkedNodeAddress: null,
	linkedMap: null,
	target: null,
	selected: false,
	isLink: false,
	dir: null,
};

const createNodeData = (overrides = {}) => {
	return {
		...DETAULT_TILE_DATA,
		...overrides,
	};
};

const TRAVERSABLE_TILE_TYPES = ['empty', 'start', 'end', 'teleport', 'map-link'];


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

export class Neighbor {
	#node = null;
	#visited = false;

	constructor(node, visited = false) {
		this.#node = node;
		this.#visited = visited;
	}

	get node() { return this.#node; }

	get visited() { return this.#visited; }

	visit() {
		this.#visited = true;
	}
}

export class Graph extends EventEmitter {
	#id = null;
	#name = 'Untitled';
	#meta = {};
	#width = 0;
	#height = 0;
	#nodeData = new Map(); // tileData
	#nodes = new Map();
	#edges = new Map();
	#objectIndex = new Map();
	#linkedMaps = {};
	#goalNode;
	#startNode;

	constructor(map = []) {
		super();

		if (map && map.length) {
			this.fromMap(map);
		}

		// this.on('node:update', ({ id, patch }) => {
		// 	if (patch.x || patch.y) {

		// 	}
		// 	setTimeout(() => {
		// 		neighbor.update({ highlight: true })

		// 		setTimeout(() => {
		// 			neighbor.update({ highlight: false })
		// 		}, 50 + (50 * cnt))
		// 	}, 0 + (25 * cnt))
		// })
	}

	get id() { return this.#id; }

	get width() { return this.#width; }

	get height() { return this.#height; }

	get name() { return this.#name; }

	set name(v) { this.#name = v; }

	get nodes() { return [...this.#nodes.values()]; }

	get startNode() {
		const n = this.#startNode ?? this.nodes.find(n => this.previousMapId ? n.linkedMap === this.previousMapId : n.tileType === 'start');
		return n ?? this.getNodeByAddress('0_0');
	}

	get goalNode() { return this.#goalNode ?? this.nodes.find(n => n.tileType === 'goal'); }

	get targetNode() { return this.nodes.find(n => n.tileType === 'target'); }

	clear() {
		this.#nodes.clear();
	}

	setGoal(pt) {
		this.#goalNode = this.getNodeByAddress(this.pointToAddress(pt));
		return this;
	}

	setStart(pt) {
		this.#startNode = this.getNodeByAddress(this.pointToAddress(pt));
		return this;
	}

	pointToAddress({ x, y }) {
		return `${x}_${y}`;
	}

	addressToPoint(address = '') {
		const [x, y] = (address.includes(',') ? address.split(',') : address.split('_')).map(_ => +_);
		return new CanvasPoint(x, y);
	}

	getNodeByAddress(address) {
		return this.#nodes.get(address);
	}

	getNodeByPoint(point) {
		return this.getNodeAtPoint(point);
	}

	findNode(cb = () => {}) {
		return this.nodes.find(cb);
	}

	findNodes(cb = () => {}) {
		return this.nodes.filter(cb);
	}

	findAll(attributeMap = {}) {
		const entries = Object.entries(attributeMap);

		return [...this.nodes.values()].filter((n) => {
			return entries.every(([k, v]) => n.hasProp(k) === v);
		});
	}

	findAny(attributeMap = {}) {
		const entries = Object.entries(attributeMap);

		return [...this.nodes.values()].filter((n) => {
			return entries.some(([k, v]) => n.hasProp(k) === v);
		});
	}

	getNodeAtPoint({ x, y }) {
		return this.getNodeByAddress(this.pointToAddress({ x, y }));
	}

	* traversePoints(start = this.startNode, getGoal = () => this.goalNode) {
		for (const node of this.traverseHybrid(start, getGoal)) {
			yield node?.point ?? null;
		}
	}

	moveObject(id, point) {
		const fromId = this.#objectIndex.get(id)
		const fromNode = this.getNodeByAddress(fromId)
		const toNode = this.getNodeAtPoint(point)

		if (fromNode) {
			fromNode.deleteObject(id) //objects.delete(id);
		}

		if (toNode) {
			toNode.addObject(id) //objects.delete(id);
		}

		this.#objectIndex.set(id, toNode?.id);

		// this.emit('graph:object-move', {
		// 	id,
		// 	from: fromNode?.id,
		// 	to: toNode?.id,
		// });
	}

	pathToDirections(path = []) {
		const dirs = [];

		for (let i = 1; i < path.length; i++) {
			const prev = path[i - 1];
			const curr = path[i];

			let dir = getDirectionFromPoints(prev, curr);

			if (!dir) {
				const entry = [...this.getNeighbors(prev).entries()]
					.find(([_, n]) => n === curr);

				dir = entry?.[0] ?? null;
			}

			if (!dir) {
				console.error('FAILED TO RESOLVE DIRECTION', prev, curr);
				continue;
			}

			dirs.push(dir);
		}

		return dirs;
	};

	* traverseHybrid(start = this.startNode, getGoal = () => this.goalNode) {
		let current = start;
		let goal = getGoal();

		let path = this.getPath(current, goal) || [];
		let dirs = this.pathToDirections(path);
		let i = 0;

		while (true) {
			const nextGoal = getGoal();
			// 🔁 replan if goal changes
			if (nextGoal !== goal) {
				goal = nextGoal;
				path = this.getPath(current, goal) || [];
				dirs = this.pathToDirections(path);
				i = 0;
			}

			if (path.length && path[path.length - 1] !== goal) {
				console.warn('PATH DOES NOT REACH GOAL', {
					current: current.address,
					goal: goal?.address,
					last: path[path.length - 1]?.address
				});
			}

			// 🧭 no more directions → idle at current
			if (i >= dirs.length) {
				yield current;
				continue;
			}

			const dir = dirs[i++];

			// 🛑 guard
			if (!dir) {
				yield current;
				continue;
			}

			const next = this.getNeighbor(current, dir);

			// 🔁 fallback if world changed
			if (!next) {
				path = this.getPath(current, goal) || [];
				dirs = this.pathToDirections(path);
				i = 0;
				continue;
			}

			current = next;
			yield current;
		}
	}

	getRange({ type, points, start, end }, updateFn) {
		let range = [];

		if (type === 'line') {
			range = points.map(this.getNodeAtPoint.bind(this));
			return range;
		}

		for (let x = start.x; x < end.x; x++) {
			for (let y = start.y; y < end.y; y++) {
				const node = this.getNodeAtPoint({ x, y });
				range.push(node);
			}
		}

		return range;
	}

	getNeighbor(node, dirName = '') {
		if (dirName === 'remote') {
			const tele = this.getNodeAtPoint({
				x: node.target.x,
				y: node.target.y,
			});

			return tele;
		}

		if (!DIRECTIONS.get(dirName)) {
			return node;
		}
		const { x, y } = DIRECTIONS.get(dirName);

		const n = this.getNodeAtPoint({
			x: node.x + x,
			y: node.y + y,
		});

		if (!n || !n.isTraversable) return null;

		return n;
	}

	getNeighbors(node) {
		const neighborMap = [...DIRECTIONS.keys()]
			.reduce((map, name, i) => {
				return node && this.getNeighbor(node, name) ? map.set(name, this.getNeighbor(node, name)) : map;
			}, new Map());

		if (node.tileType === 'teleport' && node.target) {
			neighborMap.set('remote', this.getNeighbor(node, 'remote'));
		}

		return neighborMap;
	}

	getUnvisitedNeighbors(node, visited) {
		return [...this.getNeighbors(node).entries()]
			.filter(([_, n]) => n && !visited.has(n));
	}

	getPath(start = this.startNode, goal) {
		return this.bfsShortestPath(start, goal);
	}

	bfsShortestPath(start, goal) {
		const queue = [
			[start]
		];
		const visited = new Set();

		while (queue.length > 0) {
			const path = queue.shift();
			const node = path[path.length - 1];

			if (node === goal) return path;

			if (!visited.has(node)) {
				visited.add(node);

				let neighbors = [...this.getNeighbors(node).entries()]
					.filter(([_, n]) => n && !visited.has(n));

				// teleport behavior (safe, no global state)
				if (node.tileType === 'teleport' && node.linkedNodeAddress) {
					const remote = neighbors.find(([dir]) => dir === 'remote');
					if (remote) neighbors = [remote];
				}

				// let cnt = 0
				for (const [, neighbor] of neighbors) {
					// cnt++
					queue.push([...path, neighbor]);

				}
			}
		}

		return null;
	}

	toLinkedList(lastNode) {
		let pointer = 0;
		let curr = lastNode;
		let path = [];

		while (curr) {
			let previous = curr.previous;
			if (previous) {
				previous.next = curr;
				delete curr.previous;
			}
			curr = previous;
		}

		return curr;
	};

	pathToQueue(lastNode) {
		let pointer = 0;
		let curr = lastNode;
		let path = [];

		while (curr) {
			let previous = curr.previous;
			path.push(curr);
			curr = previous;
		}

		path.reverse();
		curr = path[pointer];
	};

	resetPath() {
		this.findAny({
			isVisited: true,
			isPathNode: true,
		}).forEach((n, i) => {
			n.update({
				isVisited: false,
				isPathNode: false,
			});
		});
	}

	fromStoredMap({
		name,
		tileData,
		tiles: tileChars,
		width,
		height
	}) {
		this.#nodes.clear();
		this.name = name;
		this.#width = width;
		this.#height = height;

		map.forEach((row, rowNumber) => {
			row.forEach((typeId, columnNumber) => {
				const tileType = TILE_TYPE_INDEX[typeId];

				const node = new GraphNode(this, {
					tileType: TILE_TYPE_INDEX[typeId],
					x: columnNumber,
					y: rowNumber,
					selected: false,
				});

				this.#nodes.set(node.address, node);
			});
		});
	}

	fromMap(map = {}) {
		this.#nodes.clear();

		let rows;
		this.previousMapId = this.#id ?? this.previousMapId;

		if (!Array.isArray(map)) {
			this.#height = map.height;
			this.#width = map.width;
			this.name = map.name;
			this.#id = map.id;
			this.#meta = map.meta;
			this.#linkedMaps = map.linkedMaps || {};
			this.#nodeData = new Map(Object.entries(map.tileData));

			if (Array.isArray(map.tiles)) {
				const temprows = [...(map.tiles)];

				rows = new Array(this.height).fill(null)
					.map(_ => new Array(this.width).fill(null))
					.map(_ => temprows.splice(0, this.width));
			} else {
				rows = new Array(this.height).fill(null).map(_ => new Array(this.width).fill(null));
			}
		} else {
			rows = map;
			this.#height = rows.length;
			this.#width = rows[0].length;
		}

		let hasStart = false;

		rows.forEach((row, rowNumber) => {
			row.forEach((typeId, columnNumber) => {
				const address = `${columnNumber}_${rowNumber}`;
				const tileDetail = this.#nodeData.get(address);

				let tileType = tileDetail ? tileDetail.tileType : TILE_TYPE_INDEX[typeId] ?? TileTypeMap.empty;
				tileType = tileType === 'start' && this.previousMapId ? TileTypeMap.empty : tileType;
				hasStart = tileType === 'start';
				const target = tileDetail?.target ?? 0;

				const data = createNodeData({
					tileType,
					x: columnNumber,
					y: rowNumber,
					selected: false,
					target: tileDetail?.target ?? null,
				});

				if (this.#nodes.has(address)) {
					this.#nodes.get(address).update(data);
				} else {
					const node = new GraphNode(this, data);
					this.#nodes.set(node.address, node);
				}
			});
		});

		Object.entries(this.#linkedMaps).forEach(([dir, linkedMap], i) => {
			const { x, y } = getLinkCoords(dir, { width: this.#width, height: this.#height });

			const node = new GraphNode(this, {
				tileType: linkedMap === this.previousMapId ? 'start' : 'map-link', // 'map-link',
				linkedMap,
				x,
				y,
				selected: false,
				isLink: true,
				dir,
			});

			hasStart = node.tileType === 'start';

			this.#nodes.set(node.address, node);
		});

		if (!hasStart) {
			this.#nodes.get('0_0').tileType = 'start';
		}

		this.emit('map:load', {
			name: this.#name,
			width: this.#width,
			height: this.#height,
			startNode: this.startNode,
			nodes: [...this.#nodes.values()],
		});
	}

	toStorageFormat() {
		const DO_NOT_SAVE = ['empty', 'map-link'];

		const output = [...this.#nodes.values()].reduce((out, { tileType, target, address }, i) => {
			if (tileType && !DO_NOT_SAVE.includes(tileType)) {
				const data = { tileType };

				if (tileType === 'teleport') {
					data.target = target;
				}

				out.tileData[address] = data;
			}

			return out;
		}, {
			width: this.width,
			height: this.height,
			tileData: {},
			meta: { ...this.#meta, updated: Date.now() },
			name: this.#name,
			id: this.#id,
			updated: Date.now(),
		});

		return output;
	}

	toMap(formatAsCharMatrix = true) {
		const output = new Array(this.height).fill(null).map(_ => new Array(this.width).fill(null));

		[...this.#nodes].forEach(([addressKey, node], i) => {
			const [x, y] = (addressKey.includes(',') ? addressKey.split(',').map(_ => +_) : addressKey.split('_')).map(_ => +_);
			output[y][x] = formatAsCharMatrix ? TileTypes[node.tileType] : node;
		});

		const outputJSON = JSON.stringify(output);

		return outputJSON;
	}

	toJSON() {
		return {
			name: this.#name,
			id: this.#id,
			startNode: this.#startNode,
			goalNode: this.#goalNode,
			nodes: this.nodes,
			width: this.#width,
			height: this.#height,
			nodeData: this.#nodeData,
			linkedMaps: this.#linkedMaps,
		};
	}

	async snapState(filename) {
		const state = JSON.stringify(this, null, 2);

		await navigator.clipboard.writeText(state);

		download('tone-tiles-graph-state.json', state);
	}
}


let graph;

const getGraph = () => {
	if (graph) {
		return graph;
	}

	return graph = new Graph();
};

export default getGraph;
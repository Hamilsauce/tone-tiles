import ham from 'https://hamilsauce.github.io/hamhelper/hamhelper1.0.0.js';
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

const DIRECTION_CHORD_TONE = new Map([
  ['up', 0],
  ['down', 2],
  ['left', 4],
  ['right', 6],
]);

export const getDirectionFromPoints = (p1, p2) => {
  if (!p1 || !p2) {
    return
  }
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  
  const dir = [DIRECTIONS.entries()]
    .filter(([name, { x, y }]) => x === dx && y === dy)
    .map(([name, v]) => name);
  
  return dir;
}

export const getChordToneDegreeFromDir = (dir) => {
  return DIRECTION_CHORD_TONE.get(dir)
}


export const getLinkCoords = (dir = 'n', { width, height }) => {
  let x, y;
  
  if (dir.toLowerCase() === 'n') {
    x = Math.floor(width / 2)
    y = -1
  }
  
  if (dir.toLowerCase() === 'e') {
    y = Math.floor(height / 2)
    x = width
  }
  
  if (dir.toLowerCase() === 's') {
    x = Math.floor(width / 2)
    y = height
  }
  
  if (dir.toLowerCase() === 'w') {
    x = -1
    y = Math.floor(height / 2)
  }
  
  return { x, y }
};


export class GraphNode {
  #type = 'tile';
  #tileType = null;
  #point = { x: 0, y: 0 };
  isPathNode = false;
  isVisited = false;
  previous = null;
  #target = { x: 0, y: 0 };
  #linkedNodeAddress = null;
  #linkedMap = null;
  
  constructor({ tileType, x, y, target, linkedMap }) {
    this.#tileType = tileType;
    this.#point = { x, y };
    this.#target = target;
    this.#linkedMap = linkedMap ?? null;
  }
  
  get id() { return this.address; }
  
  get type() { return this.#type; }
  
  get linkedMap() { return this.#linkedMap; }
  
  get tileType() { return this.#tileType; }
  
  set tileType(v) { this.#tileType = v; }
  
  get isEmpty() { return ['empty'].includes(this.#tileType); }
  
  get isTraversable() { return !['barrier'].includes(this.#tileType); }
  
  get address() { return `${this.x}_${this.y}`; }
  
  get x() { return this.#point.x; }
  
  get y() { return this.#point.y; }
  
  get linkedNodeAddress() { return this.#target ? [this.#target.x, this.#target.y].join('_') : null; }
  
  get target() { return this.#target; }
  
  set target(v) { this.#target = v; }
  
  setType(type) {
    this.#tileType = type;
  }
  
  linkToNode({ x, y }) {
    this.#target = { x, y };
  }
  
  linkToAddress(addressKey) {
    this.#linkedNodeAddress = addressKey;
  }
  
  unlink() {
    const address = this.#linkedNodeAddress;
    this.#linkedNodeAddress = null;
    return address;
  }
  
  toJSON() {
    const res = {
      type: this.type,
      id: this.id,
      tileType: this.tileType,
      address: this.address,
      x: this.x,
      y: this.y,
      isTraversable: this.isTraversable,
      isPathNode: this.isPathNode,
      isVisited: this.isVisited,
      previous: this.previous,
      linkedNodeAddress: this.linkedNodeAddress,
      target: this.#target,
      linkedMap: this.#linkedMap,
    };
    
    
    
    // if (!this.linkedMap) {
    //   delete res.linkedMap
    // }
    return res;
  }
  
  data() {
    const res = this.toJSON();
    
    Object.entries(res).forEach(([k, v]) => {
      if ([undefined, null].includes(v)) {
        delete res[k]
      }
    })
    
    return res
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

export class Graph {
  #id = null;
  #name = 'Untitled';
  #meta = {};
  #width = 0;
  #height = 0;
  #nodeData = new Map(); // tileData
  #nodes = new Map();
  #edges = new Map();
  #linkedMaps = {}
  
  constructor(map = []) {
    if (map && map.length) {
      this.fromMap(map);
    }
    
    window.graph = this;
  }
  
  get id() { return this.#id; }
  
  get width() { return this.#width; }
  
  get height() { return this.#height; }
  
  get name() { return this.#name; }
  
  set name(v) { this.#name = v; }
  
  get nodes() { return [...this.#nodes.values()]; }
  
  get startNode() { return this.nodes.find(n => this.previousMapId ? n.linkedMap === this.previousMapId : n.tileType === 'start'); }
  
  get goalNode() { return this.nodes.find(n => n.tileType === 'goal'); }
  
  get targetNode() { return this.nodes.find(n => n.tileType === 'target'); }
  
  pointToAddress({ x, y }) {
    return `${x}_${y}`;
  }
  
  addressToPoint(address = '') {
    return (address.includes(',') ? address.split(',').map(_ => +_) : address.split('_')).map(_ => +_);
  }
  
  getNodeByAddress(address) {
    return this.#nodes.get(address);
  }
  
  findNode(cb = () => {}) {
    return this.nodes.find(cb);
  }
  
  findNodes(cb = () => {}) {
    return this.nodes.filter(cb);
  }
  
  getNodeAtPoint({ x, y }) {
    return this.getNodeByAddress(this.pointToAddress({ x, y }));
  }
  
  getRange({ start, end }, updateFn) {
    let range = [];
    
    for (let x = start.x; x < end.x; x++) {
      for (let y = start.y; y < end.y; y++) {
        const tile = this.getNodeAtPoint({ x, y });
        
        tile.selected = true;
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
  
  getUnvisitedNeighbors(node) {
    return node ? ([...this.getNeighbors(node).entries()] || []).filter(([k, v]) => v && !v.previous && v.isVisited === false) : [];
  }
  
  getPath(node = this.startNode, stopNode) {
    this.resetPath();
    return this.bfsShortestPath(node, stopNode);
  };
  
  bfsShortestPath(start, goal) {
    const queue = [
      [start]
    ]; // queue of paths
    const visited = new Set(); // to avoid revisiting nodes
    
    while (queue.length > 0) {
      const path = queue.shift(); // FIFO
      const node = path[path.length - 1];
      
      let unvisitedNeighbors;
      
      if (node === goal) {
        return path; // return full path when goal is found
      }
      
      if (!visited.has(node)) {
        visited.add(node);
        
        let unvisitedNeighbors = this.getUnvisitedNeighbors(node);
        
        // If node is a teleport tile, force teleport first
        if (node.tileType === 'teleport' && node.linkedNodeAddress) {
          // extract the teleport neighbor
          const remote = unvisitedNeighbors.find(([direction, n]) => direction === 'remote');
          
          if (remote && remote[1] !== this.last) {
            // BFS will ALWAYS take this path first
            unvisitedNeighbors = [remote];
          }
          this.last = node;
        }
        
        for (const [direction, neighbor] of unvisitedNeighbors || []) {
          queue.push([...path, neighbor]); // enqueue a new path
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
    this.nodes.forEach((n, i) => {
      n.isVisited = false;
      n.isPathNode = false;
      n.previous = null;
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
        
        const node = new GraphNode({
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
      this.#linkedMaps = map.linkedMaps || {}
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
    
    rows.forEach((row, rowNumber) => {
      row.forEach((typeId, columnNumber) => {
        const address = `${columnNumber}_${rowNumber}`;
        const tileDetail = this.#nodeData.get(address);
        
        const tileType = tileDetail ? tileDetail.tileType : TILE_TYPE_INDEX[typeId] ?? TileTypeMap.empty;
        
        const node = new GraphNode({
          tileType,
          x: columnNumber,
          y: rowNumber,
          selected: false,
          target: tileDetail?.target,
        });
        
        if (this.#nodeData.has(node.address)) {
          const data = this.#nodeData.get(node.address);
          Object.assign(node, data);
        }
        
        this.#nodes.set(node.address, node);
      });
    });
    
    Object.entries(this.#linkedMaps).forEach(([dir, linkedMap], i) => {
      const { x, y } = getLinkCoords(dir, { width: graph.width, height: graph.height })
      
      const node = new GraphNode({
        tileType: linkedMap === this.previousMapId ? 'start' : 'map-link', // 'map-link',
        linkedMap,
        x,
        y,
        selected: false,
      });
      
      this.#nodes.set(node.address, node);
    })
  }
  
  toStorageFormat() {
    const DO_NOT_SAVE = ['empty', 'map-link']
    
    const output = [...this.#nodes.values()].reduce((out, { tileType, target, address }, i) => {
      if (tileType && !DO_NOT_SAVE.includes(tileType)) {
        const data = { tileType }
        
        if (tileType === 'teleport') {
          data.target = target
        }
        
        out.tileData[address] = data
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
  
  shortestPathDfs(node, stopNode) {
    node.isVisited = true;
    
    if (node === stopNode) return node;
    
    let unvisitedNeighbors = this.getUnvisitedNeighbors(node);
    
    if (unvisitedNeighbors.length == 0 && node.previous) {
      node.isPathNode = false;
      node.isVisited = true;
      node = node.previous;
      
      unvisitedNeighbors = this.getUnvisitedNeighbors(node);
      
      while (node && unvisitedNeighbors.length === 0) {
        node.isPathNode = false;
        node.isVisited = true;
        node = node.previous;
        
        unvisitedNeighbors = this.getUnvisitedNeighbors(node);
      }
      
      return this.shortestPathDfs(node, stopNode);
    }
    
    else {
      for (let [direction, neighbor] of unvisitedNeighbors) {
        neighbor.previous = node;
        
        if (unvisitedNeighbors.length > 0) {
          return this.shortestPathDfs(neighbor, stopNode);
        }
        
        else {
          return node;
        }
      }
    }
    return node; /* If no path, return null */
  }
}
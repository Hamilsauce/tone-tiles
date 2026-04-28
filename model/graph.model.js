import ham from 'ham';
import { EventEmitter } from 'https://hamilsauce.github.io/hamhelper/event-emitter.js';
import { Point } from '../core/spatial/Point.js';
import { Collection } from '../model/Collection.js';
import { ModelTypes } from '../core/types/model.types.js';

import { getDirectionFromPoints, getLinkCoords, DIRECTIONS } from '../core/spatial/utils.js';
import { TILE_TYPE_INDEX, TileTypes } from '../core/tile-utils.js';

const v1 = undefined;
const v2 = undefined;

const isvalid = v1 !== undefined && v2 !== undefined;

const { template, utils, download } = ham;

const DEFAULT_NODE_DATA = {
  type: 'node',
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
  const point = overrides.point ?? { x: overrides.x ?? 0, y: overrides.y ?? 0 };
  const address = `${point.x}_${point.y}`;
  return {
    ...DEFAULT_NODE_DATA,
    ...overrides,
    point,
    x: overrides.x ?? point.x,
    y: overrides.y ?? point.y,
    id: overrides.id ?? address,
    address: overrides.address ?? address,
  };
};

export class Graph extends Collection {
  #id = null;
  #name = 'Untitled';
  #meta = {};
  #width = 0;
  #height = 0;
  #nodeData = new Map();
  #edges = new Map();
  #objectIndex = new Map();
  #linkedMaps = {};
  #goalNode;
  #startNode;
  
  constructor({ map = [], ...options } = {}) {
    super(options);
    
    // TraverserModel resolves its traversal generator through the module-level
    // graph reference below. Before the SceneModel refactor, run-canvas always
    // initialized that singleton via getGraph(). When Graph is constructed
    // directly as a collection, keep the active traversal graph in sync here.
    graph = this;
    
    if (map && map.length) {
      this.fromMap(map);
    }
  }
  
  get id() { return this.#id; }
  
  get width() { return this.#width; }
  
  get height() { return this.#height; }
  
  get name() { return this.#name; }
  
  set name(v) { this.#name = v; }
  
  get nodes() { return [...this.getAll().values()]; }
  
  get startNode() {
    const n = this.#startNode ?? this.nodes.find(n => this.previousMapId ? n.linkedMap === this.previousMapId : n.tileType === 'start');
    return n ?? this.getNodeByAddress('0_0');
  }
  
  get goalNode() { return this.#goalNode ?? this.nodes.find(n => n.tileType === 'goal'); }
  
  get targetNode() { return this.nodes.find(n => n.tileType === 'target'); }
  
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
    return new Point(x, y);
  }
  
  getNodeByAddress(address) {
    return this.get(address);
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
      return entries.every(([k, v]) => n.hasProp(k) && n[k] === v);
    });
  }
  
  findAny(attributeMap = {}) {
    const entries = Object.entries(attributeMap);
    
    return [...this.nodes.values()].filter((n) => {
      return entries.some(([k, v]) => n.hasProp(k) && n[k] === v);
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
    const fromId = this.#objectIndex.get(id);
    const fromNode = this.getNodeByAddress(fromId);
    const toNode = this.getNodeAtPoint(point);
    
    if (fromNode) {
      fromNode.deleteObject(id); //objects.delete(id);
    }
    
    if (toNode) {
      toNode.addObject(id); //objects.delete(id);
      
    }
    
    this.#objectIndex.set(id, toNode?.id);
    
    this.emit({
      type: 'object:move',
      id,
      from: fromNode?.id,
      to: toNode?.id,
    });
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
      // replan if goal changes
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
      
      //no more directions → idle at current
      if (i >= dirs.length) {
        yield current;
        continue;
      }
      
      const dir = dirs[i++];
      
      // guard
      if (!dir) {
        yield current;
        continue;
      }
      
      const next = this.getNeighbor(current, dir);
      const nexts = this.getNeighbors(current);
      const isNextBlocked = !nexts.has(dir);
      const hasOpenNeighbor = [...nexts.values()].some(_ => _.isTraversable)
      
      // fallback if world changed
      if (!next && hasOpenNeighbor) {
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
    
    // const mod = 1
    let cnt1 = 0
    
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
        
        let cnt2 = 1;
        
        for (const [dir, neighbor] of neighbors) {
          queue.push([...path, neighbor]);
          
          
          // setTimeout(() => {
          //   neighbor.update({
          //     ['highlight']: true
          //   });
          
          //   setTimeout(() => {
          //     neighbor.update({
          //       ['highlight']: false
          //     });
          //   }, 1500);
          // }, 0 + ((25 * cnt1)) + ((25 * cnt2)));
          
          cnt2++;
        }
      }
      
      cnt1 = cnt1 >= 50 ? 0 : cnt1 + 0.5;
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
  
  // fromStoredMap({
  //   name,
  //   tileData,
  //   tiles: tileChars,
  //   width,
  //   height
  // }) {
  //   this.clear();
  //   this.name = name;
  //   this.#width = width;
  //   this.#height = height;
  
  //   map.forEach((row, rowNumber) => {
  //     row.forEach((typeId, columnNumber) => {
  //       const tileType = TILE_TYPE_INDEX[typeId];
  //       const modelClass = this.registry.get(ModelTypes.NODE);
  
  
  //       const node = this.create(ModelTypes.NODE, {
  //         properties: createNodeData({
  //           point: {
  //             x: columnNumber,
  //             y: rowNumber,
  //           },
  //           properties: {
  //             selected: false,
  //             tileType: TILE_TYPE_INDEX[typeId],
  //           },
  //         })
  //       });
  //     });
  //   });
  // }
  
  fromMap(map = {}) {
    this.clear();
    
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
        
        let tileType = tileDetail ? tileDetail.tileType : TILE_TYPE_INDEX[typeId] ?? TileTypes.empty;
        tileType = tileType === 'start' && this.previousMapId ? TileTypes.empty : tileType;
        hasStart = tileType === 'start';
        const target = tileDetail?.target ?? 0;
        
        const data = createNodeData({
          tileType,
          x: columnNumber,
          y: rowNumber,
          point: {
            x: columnNumber,
            y: rowNumber,
          },
          selected: false,
          target: tileDetail?.target ?? null,
        });
        
        if (this.has(address)) {
          this.get(address).update(data);
        } else {
          const node = this.create(ModelTypes.NODE, { properties: data });
        }
      });
    });
    
    Object.entries(this.#linkedMaps).forEach(([dir, linkedMap], i) => {
      const { x, y } = getLinkCoords(dir, { width: this.#width, height: this.#height });
      
      const properties = createNodeData({
        tileType: linkedMap === this.previousMapId ? 'start' : 'map-link', // 'map-link',
        linkedMap,
        x,
        y,
        point: { x, y },
        selected: false,
        isLink: true,
        dir,
      });
      
      const node = this.create(ModelTypes.NODE, { properties });
      
      hasStart = node.tileType === 'start';
    });
    
    if (!hasStart) {
      this.get('0_0').tileType = 'start';
    }
    
    this.emit({
      type: 'map:load',
      data: {
        name: this.#name,
        width: this.#width,
        height: this.#height,
        startNode: this.startNode,
        nodes: [...this.nodes],
      },
    });
  }
  
  toStorageFormat() {
    const DO_NOT_SAVE = ['empty', 'map-link'];
    
    const output = [...this.nodes].reduce((out, { tileType, target, address }, i) => {
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
    
    [...this.nodes].forEach((node, i) => {
      const addressKey = node.id;
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

const getGraph = ({ loopEngine }) => {
  if (graph) {
    return graph;
  }
  
  return graph = new Graph({ loopEngine });
};

export const getTraversal = () => {
  if (!graph) {
    getGraph({});
  }
  
  return (startPoint = graph.startNode?.point, getGoalPoint = () => graph.goalNode?.point) => {
    const startNode = graph.getNodeAtPoint(startPoint);
    
    return graph.traversePoints(
      startNode,
      () => {
        const goalPoint = getGoalPoint?.();
        return goalPoint ? graph.getNodeAtPoint(goalPoint) : null;
      }
    );
  };
};

export default getGraph;

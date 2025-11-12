
/*
  Graph.js model - data structure used as map model
*/

export const TILE_TYPE_INDEX = [
  'empty',
  'barrier',
  'start',
  'goal',
  'teleport',
];

const DIRECTIONS = new Map([
  ['up', { x: 0, y: -1 }],
  ['down', { x: 0, y: 1 }],
  ['left', { x: -1, y: 0 }],
  ['right', { x: 1, y: 0 }],
]);


export class GraphNode {
  #tileType = null;
  #point = { x: 0, y: 0 };
  isPathNode = false;
  isVisited = false;
  previous = null;
  
  constructor({ tileType, x, y }) {
    this.#tileType = tileType;
    this.#point = { x, y };
  }
  
  get tileType() { return this.#tileType }
  
  get isEmpty() { return ['empty'].includes(this.#tileType) }
  
  get isTraversable() { return !['barrier'].includes(this.#tileType) }
  
  get address() { return [this.x, this.y].join('_') }
  
  get x() { return this.#point.x }
  
  get y() { return this.#point.y }
  
  setType(type) { this.#tileType = type }
  
  toJSON() {
    return {
      tileType: this.tileType,
      address: this.address,
      x: this.x,
      y: this.y,
      isTraversable: this.isTraversable,
      isPathNode: this.isPathNode,
      isVisited: this.isVisited,
      previous: this.previous,
      linkedNodeAddress: this.linkedNodeAddress,
    }
  }
}

export class TeleportNode extends GraphNode {
  #target = null;
  
  constructor({ target, ...nodeState }) {
    super(nodeState);
    this.#target = target;
  }
  
  get linkedNodeAddress() { return this.#target ? [this.#target.x, this.#target.y].join('_') : null; }
  
  linkToNode({ x, y }) {
    this.#target = { x, y };
  }
  
  linkToAddress(addressKey) {
    this.#linkedNodeAddress = addressKey;
  }
  
  unlink() {
    const address = this.#linkedNodeAddress;
    this.#linkedNodeAddress = null;
    return address
  }
}

export class Graph {
  #nodes = new Map();
  #edges = new Map();
  
  constructor(map = []) {
    if (map && map.length) {
      this.fromMap(map);
    }
    
    window.graph = this
  }
  
  get nodes() { return [...this.#nodes.values()]; }
  
  get startNode() { return this.nodes.find(n => n.tileType === 'start'); }
  
  get goalNode() { return this.nodes.find(n => n.tileType === 'goal'); }
  
  get targetNode() { return this.nodes.find(n => n.tileType === 'target'); }
  
  pointToAddress({ x, y }) {
    return [x, y].join('_');
  }
  
  addressToPoint(address = '') {
    return (address.includes(',') ? address.split(',').map(_ => +_) : address.split('_')).map(_ => +_);
  }
  
  getNodeByAddress(address) {
    return this.#nodes.get(address);
  }
  
  findNode(cb = () => {}) {
    return this.nodes.find(cb)
  }
  
  findNodes(cb = () => {}) {
    return this.nodes.filter(cb)
  }
  
  getNodeAtPoint({ x, y }) {
    return this.getNodeByAddress(this.pointToAddress({ x, y }))
  }
  
  // used for selecting ranges (in ui)
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
      return this.findNode((n) => n !== node && n.tileType === 'teleport')
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
    
    if (node.tileType === 'teleport') {
      neighborMap.set('remote', this.getNeighbor(node, 'remote'))
    }
    
    return neighborMap;
  }
  
  getUnvisitedNeighbors(node) {
    return node ? ([...this.getNeighbors(node).entries()] || []).filter(([k, v]) => v && !v.previous && v.isVisited === false) : [];
  }
  
  // used by consumers for path finding
  getPath(node = this.startNode, stopNode) {
    this.resetPath();
    return this.bfsShortestPath(node, stopNode)
  };
  
  // Current path finding impl
  bfsShortestPath(start, goal) {
    const queue = [
      [start]
    ];
    
    const visited = new Set();
    
    while (queue.length > 0) {
      const path = queue.shift(); // FIFO
      const node = path[path.length - 1];
      
      let unvisitedNeighbors
      
      if (node === goal) {
        return path; // return full path when goal is found
      }
      
      if (!visited.has(node)) {
        visited.add(node);
        
        unvisitedNeighbors = this.getUnvisitedNeighbors(node);
        
        for (const [direction, neighbor] of unvisitedNeighbors || []) {
          queue.push([...path, neighbor]); // enqueue a new path
        }
      }
    }
    
    return null; // no path found
  }
  
  resetPath() {
    this.nodes.forEach((n, i) => {
      n.isVisited = false;
      n.isPathNode = false;
      n.previous = null;
      
    });
  }
  
  // Create graph from digit matrix - currently how it works
  fromMap(map = []) {
    this.#nodes.clear()
    
    this.height = map.length
    this.width = map[0].length
    
    map.forEach((row, rowNumber) => {
      row.forEach((typeId, columnNumber) => {
        const tileType = TILE_TYPE_INDEX[typeId];
        
        if (tileType === 'teleport') {
          const node = new TeleportNode({
            tileType: TILE_TYPE_INDEX[typeId],
            x: columnNumber,
            y: rowNumber,
            selected: false,
          });
        }
        
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
  
  // For printing and storing in old format
  toMap(formatAsCharMatrix = true) {
    const output = new Array(this.height).fill(null).map(_ => new Array(this.width).fill(null));
    
    const tileTypes = TILE_TYPE_INDEX.reduce((acc, curr, i) => {
      return { ...acc, [curr]: i }
    }, {});
    
    [...this.#nodes].forEach(([addressKey, node], i) => {
      const [x, y] = (addressKey.includes(',') ? addressKey.split(',').map(_ => +_) : addressKey.split('_')).map(_ => +_)
      output[y][x] = formatAsCharMatrix ? tileTypes[node.tileType] : node
    });
    
    const outputJSON = JSON.stringify(output);
    
    return outputJSON;
  }
}


/*
  script.js - snippet from the ui/view handling that 
  starts the loop every click running against the graph/map
*/

svgCanvas.addEventListener('click', async ({ detail }) => {
  if (isMoving) return;
  if (contextMenu.dataset.show === 'true') return;
  
  deselectRange();
  
  selectedRange = [];
  
  selectionBox.remove();
  
  let tile = detail.target.closest('.tile');
  let activeActor;
  
  const actorTarget = detail.target.closest('.actor');
  
  if (actorTarget) {
    const actors = [...scene.querySelectorAll('.actor')];
    activeActor = actors.find(t => actorTarget != t);
    tile = svgCanvas.querySelector(`.tile[data-x="${actorTarget.dataset.x}"][data-y="${actorTarget.dataset.y}"]`);
  }
  else {
    activeActor = actor1;
  }
  
  const pathNodes = svgCanvas.querySelectorAll('.tile[data-is-path-node="true"]');
  
  pathNodes.forEach((el, i) => { el.dataset.isPathNode = false });
  
  if (tile && tile.dataset.tileType !== 'barrier') {
    const activeTiles = svgCanvas.querySelectorAll('.tile[data-active="true"]');
    const highlightedTiles = svgCanvas.querySelectorAll('.tile[data-highlight="true"]');
    
    activeTiles.forEach((el, i) => { el.dataset.active = false });
    highlightedTiles.forEach((el, i) => { el.dataset.highlight = false });
    
    const pt = { x: +tile.dataset.x, y: +tile.dataset.y }
    
    const tileNode = graph.getNodeAtPoint(pt);
    
    const neighbors = graph.getNeighbors(tileNode);
    
    tile.dataset.active = true;
    
    [...neighbors.values()].forEach((node, i) => {
      const el = svgCanvas.querySelector(`.tile[data-x="${node.x}"][data-y="${node.y}"]`)
      el.dataset.highlight = true;
    });
  }
  
  const startNodeEl = svgCanvas.querySelector('.tile[data-current="true"]') || svgCanvas.querySelector('.tile[data-tile-type="start"]');
  
  const targetNodeEl = actorTarget ? tile : svgCanvas.querySelector('.tile[data-active="true"]');
  
  const startNode = graph.getNodeAtPoint({ x: +startNodeEl.dataset.x, y: +startNodeEl.dataset.y });
  
  const targetNode = graph.getNodeAtPoint({ x: +targetNodeEl.dataset.x, y: +targetNodeEl.dataset.y });
  
  const bfsPath = graph.getPath(startNode, targetNode);
  
  if (bfsPath === null) {
    return
  }
  
  let pointer = 0;
  let curr = bfsPath;
  
  let path = [];
  
  while (curr) {
    let previous = curr.previous
    path.push(curr);
    curr = previous;
  }
  
  path.reverse();
  curr = bfsPath[pointer];
  
  isMoving = true;
  activeActor.dataset.moving = isMoving;
  
  if (isMoving) {
    let dx;
    let dy;
    
    let intervalHandle = setInterval(async () => {
      curr = bfsPath[pointer];
      
      if (!curr) {
        isMoving = false;
        activeActor.dataset.moving = isMoving;
        clearInterval(intervalHandle);
      }
      
      else {
        const el = svgCanvas.querySelector(`.tile[data-x="${curr.x}"][data-y="${curr.y}"]`);
        
        const lastX = +activeActor.dataset.x
        const lastY = +activeActor.dataset.y
        
        activeActor.dataset.x = curr.x
        activeActor.dataset.y = curr.y
        activeActor.setAttribute(
          'transform',
          `translate(${curr.x},${curr.y}) rotate(0) scale(1)`
        );
        
        svgCanvas.panViewport({
          x: (curr.x - (svgCanvas.viewBox.width / 2)) * 0.025,
          y: (curr.y - (svgCanvas.viewBox.height / 2)) * 0.025,
        })
        
        if (el === startNodeEl) {
          startNodeEl.dataset.current = false;
        }
        
        el.dataset.isPathNode = true;
        
        pointer++;
        
        if (el === goalTile) {
          console.warn('----- GOAL FOUND -----');
        }
        
        if (el === targetNodeEl) {
          el.dataset.active = true;
          el.dataset.current = true;
          
          return
        }
        
        if (el.dataset.tileType === 'teleport') {
          actor1.dataset.teleporting = true;
          
          if (el === startNodeEl) {
            el.dataset.active = false;
            el.dataset.current = false;
            
            return
          }
          
          el.dataset.active = true;
          el.dataset.current = true;
          
          const tels = [...svgCanvas.querySelectorAll('.tile[data-tile-type="teleport"]')];
          const otherTele = tels.find(t => el != t && t.dataset.current != 'true');
          
          activeActor.dataset.x = el.dataset.x;
          activeActor.dataset.y = el.dataset.y;
          
          activeActor.setAttribute(
            'transform',
            `translate(${el.dataset.x},${el.dataset.y}) rotate(0) scale(1)`,
          );
          
          el.dataset.active = false;
          el.dataset.current = false;
          
          otherTele.dataset.active = false;
          otherTele.dataset.current = false;
          
          await sleep(10);
          
          activeActor.dataset.teleporting = false;
        }
      }
    }, ANIM_RATE)
  }
});
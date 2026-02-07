// import { dispatchPointerEvent } from '../lib/utils.js'
import { Graph, TILE_TYPE_INDEX } from './lib/store.js';
import { SVGCanvas } from './canvas/SVGCanvas.js';
import { maps } from './maps.js';
import { getTileSelector } from './selection-box/index.js';
import { initMapControls } from './ui/map-selection.js';
import { scheduleOscillator, AudioNote, audioEngine } from './audio/index.js';
import { TransformList } from './canvas/TransformList.js';
import ham from 'https://hamilsauce.github.io/hamhelper/hamhelper1.0.0.js';
import { useAppState } from './store/app.store.js';

const { isRunning, setRunning } = useAppState();

const {addDragAction, sleep, template, utils, download, TwoWayMap } = ham;
const { fromEvent } = rxjs;
const { tap } = rxjs.operators;

const useTemplate = (templateName, options = {}) => {
  const el = document.querySelector(`[data-template="${templateName}"]`).cloneNode(true);
  
  delete el.dataset.template;
  
  if (options.dataset) Object.assign(el.dataset, options.dataset);
  
  if (options.id) el.id = options.id;
  
  if (options.fill) el.style.fill = options.fill;
  
  return el;
};

const domPoint = (element, x, y) => {
  return new DOMPoint(x, y).matrixTransform(
    element.getScreenCTM().inverse()
  );
};

const getAspectRatio = (svgCanvas) => {
  const { width, height } = svgCanvas.getBoundingClientRect();
  
  return width / height;
};

let getSelectedRange = () => [...tileLayer.querySelectorAll('.tile[data-selected="true"]')];

const tileAt = (x, y) => tileLayer.querySelector(`.tile[data-y="${y}"][data-x="${x}"]`);

const deselectRange = () => {
  getSelectedRange().forEach((t, i) => {
    t.dataset.selected = false;
  });
};

const computeArrowEndpoint = (origin, tileCenter, tileSize = [1, 1]) => {
  const [ox, oy] = origin;
  const [tx, ty] = tileCenter;
  const [tw, th] = tileSize;
  
  const dx = tx - ox;
  const dy = ty - oy;
  const dist = Math.hypot(dx, dy);
  const ux = dx / dist;
  const uy = dy / dist;
  
  const offset = Math.min(
    (tw / 2) / Math.abs(ux),
    (th / 2) / Math.abs(uy)
  );
  
  const ex = tx - ux * offset;
  const ey = ty - uy * offset;
  
  return [ex, ey];
}

const createEdgeLine = (pt1, pt2) => {
  const line = useTemplate('edge-line');
  
  const [endX, endY] = computeArrowEndpoint(
    [pt1.x + 0.5, pt1.y + 0.5],
    [pt2.x + 0.5, pt2.y + 0.5]
  );
  
  line.firstElementChild.setAttribute('x1', pt1.x + 0.5);
  line.firstElementChild.setAttribute('y1', pt1.y + 0.5);
  line.firstElementChild.setAttribute('x2', endX)
  line.firstElementChild.setAttribute('y2', endY)
  
  return line;
};

const getRange = ({ start, end }) => {
  let range = [];
  
  deselectRange();
  
  for (let x = start.x; x < end.x; x++) {
    for (let y = start.y; y < end.y; y++) {
      const tile = tileAt(x, y);
      
      tile.dataset.selected = true;
      
      range.push(tile);
    }
  }
  
  return range;
};


const ANIM_RATE = 75;
let selectedRange = [];
const audioNote1 = (new AudioNote(audioEngine));

await sleep(1000)

const graph = new Graph();

const app = document.querySelector('#app');
const appBody = app.querySelector('#app-body');
const floatingMenu = app.querySelector('#app-floating-menu');
const canvasEl = document.querySelector('#canvas');
const svgCanvas = new SVGCanvas(canvasEl);

const scene = svgCanvas.dom.querySelector('#scene');
const tileLayer = scene.querySelector('#tile-layer');
const objectLayer = scene.querySelector('#object-layer');
const selectionBox = getTileSelector(objectLayer);

const contextMenu = useTemplate('context-menu');
const contextMenuTransformList = new TransformList(svgCanvas, contextMenu,
{
  transforms: [
  {
    type: 'translate',
    values: [0, 0],
    position: 0,
  },
  {
    type: 'rotate',
    values: [0, 0, 0],
    position: 1,
  },
  {
    type: 'scale',
    values: [0.05, 0.05],
    position: 2,
  }, ]
  
});

const actor1 = useTemplate('actor', {
  dataset: { moving: false, teleporting: false },
  id: 'actor1',
});

const actor1TransformList = new TransformList(svgCanvas, actor1)

const actor2 = useTemplate('actor', {
  dataset: { moving: false, teleporting: false },
  fill: '#C1723B',
  id: 'actor2',
});

const actor2TransformList = new TransformList(svgCanvas, actor2)

initMapControls(graph, svgCanvas, actor1, selectionBox);

actor2.setAttribute('transform', 'translate(12,21) rotate(0) scale(1)');

objectLayer.setAttribute('transform', 'translate(0,0) rotate(0) scale(1)');
objectLayer.append(actor1, actor2, contextMenu);

selectionBox.on('selection', range => {
  selectedRange = getRange(range);
  const { start, end } = range;
  
  const middle = Math.abs(start.x - end.x)
  
  graph.getRange(range, (tile) => tile.selected = true);
  
  
  const menuContainer = contextMenu.querySelector('.context-menu');
  contextMenuTransformList.translateTo(start.x, start.y - 2)
  
  
  if (menuContainer.dataset.showActions === 'true') {
    contextMenu.dataset.show = true;
    menuContainer.dataset.showActions = true;
  } else {
    menuContainer.dataset.showActions = false;
  }
});

svgCanvas.setViewBox({
  x: -0.5,
  y: -0.5,
  width: graph.width + 1,
  height: graph.height + 1,
});

svgCanvas.setCanvasDimensions({ width: window.innerWidth, height: window.innerHeight });

const pointerup$ = fromEvent(svgCanvas, 'pointerup');

pointerup$.pipe().subscribe();

let lastX
let lastY
let goalTile
let isMoving = false;
let isSelectingLinkTile = false;

setTimeout(() => {
  lastX = +tileLayer.lastElementChild.dataset.x;
  lastY = +tileLayer.lastElementChild.dataset.y;
  
  tileLayer.dataset.width = lastX;
  tileLayer.dataset.height = lastY;
  
  goalTile = tileLayer.querySelector('[data-tile-type="goal"]');
  
  svgCanvas.surface.setAttribute('width', lastX + 1);
  svgCanvas.surface.setAttribute('height', lastY + 1);
}, 900);


// let isRunning = false;

svgCanvas.addEventListener('click', async ({ detail }) => {
  if (!isRunning.value) return;
  if (isMoving) return;
  if (contextMenu.dataset.show === 'true') return;
  if (isSelectingLinkTile === true) return;
  
  deselectRange();
  
  selectedRange = [];
  
  selectionBox.remove();
  
  let tile = detail.target.closest('.tile');
  let activeActor;
  let actorTrans = activeActor === actor1 ? actor1TransformList : actor2TransformList
  
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
      const el = svgCanvas.querySelector(`.tile[data-x="${node.x}"][data-y="${node.y}"]`);
      el.dataset.highlight = true;
    });
  }
  
  const startNodeEl = svgCanvas.querySelector('.tile[data-current="true"]') || svgCanvas.querySelector('.tile[data-tile-type="start"]');
  
  const targetNodeEl = actorTarget ? tile : svgCanvas.querySelector('.tile[data-active="true"]');
  
  const startNode = graph.getNodeAtPoint({ x: +startNodeEl.dataset.x, y: +startNodeEl.dataset.y });
  
  const targetNode = graph.getNodeAtPoint({ x: +targetNodeEl.dataset.x, y: +targetNodeEl.dataset.y });
  
  const bfsPath = graph.getPath(startNode, targetNode);
  
  if (bfsPath === null) {
    return;
  }
  
  let pointer = 0;
  let curr = bfsPath;
  
  let path = [];
  
  while (curr) {
    let previous = curr.previous;
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
      audioNote1.velocity(0.01).play();
      
      if (!curr) {
        isMoving = false;
        activeActor.dataset.moving = isMoving;
        clearInterval(intervalHandle);
      }
      
      else {
        const freqX = ((curr.x + 2) * 2); // < 120 ? 120 : ((curr.x + 1) * 2)
        const freqY = ((curr.y + 2) * 1.5); // < 120 ? 120 : ((curr.y + 1) * 1.5)
        
        let freq = ((freqX) * (freqY)) * 1.5;
        freq = freq < 250 ? freq + 200 : freq;
        freq = freq > 1600 ? 1200 - freq : freq;
        freq = curr.tileType === 'teleport' ? freq + 250 : freq;
        
        
        let vel = (0.5 - (pointer / bfsPath.length));
        vel = vel >= 0.5 ? 0.5 : vel;
        vel = vel <= 0.075 ? 0.075 : vel;
        
        const dur = 2 / bfsPath.length;
        const startMod = ((pointer || 1) * 0.01);
        
        audioNote1
          .at(audioEngine.currentTime)
          .frequencyHz(freq)
          .duration(0.1)
          .velocity(vel).play();
        
        const el = svgCanvas.querySelector(`.tile[data-x="${curr.x}"][data-y="${curr.y}"]`);
        
        const lastX = +activeActor.dataset.x;
        const lastY = +activeActor.dataset.y;
        
        activeActor.dataset.x = curr.x;
        activeActor.dataset.y = curr.y;
        
        actorTrans = activeActor === actor1 ? actor1TransformList : actor2TransformList
        actorTrans.translateTo(curr.x, curr.y)
        
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
          
          actorTrans = activeActor === actor1 ? actor1TransformList : actor2TransformList
          actorTrans.translateTo(el.dataset.x, el.dataset.y)
          
          el.dataset.active = false;
          el.dataset.current = false;
          
          otherTele.dataset.active = false;
          otherTele.dataset.current = false;
          
          await sleep(10);
          
          activeActor.dataset.teleporting = false;
        }
      }
    }, ANIM_RATE);
  }
});

contextMenu.addEventListener('pointerdown', e => {
  // console.warn('dragger')
  // e.preventDefault();
  e.stopPropagation();
  // e.stopImmediatePropagation();
  
})
contextMenu.addEventListener('pointermove', e => {
  // e.preventDefault();
  e.stopPropagation();
  // e.stopImmediatePropagation();
  
})

svgCanvas.layers.tile.addEventListener('contextmenu', e => {
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
  
  const targ = e.target.closest('.tile');
  const tileType = targ.dataset.tileType;
  const shouldShowSecondaryList = tileType === 'teleport'
  
  const menuForeignObject = contextMenu.querySelector('.context-menu-foreignobject');
  const listEl = contextMenu.querySelector('.context-menu-list');
  // const listEl2 = contextMenu.querySelector('.context-menu-list.secondary');
  // listEl2.style.display = shouldShowSecondaryList ? null : 'none'
  const menuContainer = contextMenu.querySelector('.context-menu');
  
  if (tileType === 'teleport') {
    const selectedNode = graph.getNodeAtPoint({
      x: +targ.dataset.x,
      y: +targ.dataset.y,
    });
    
    if (selectedNode.target) {
      const line = createEdgeLine(selectedNode, selectedNode.target)
      objectLayer.append(line)
    }
    
    // menuForeignObject.setAttribute('width', 250)
    contextMenu.dataset.show = true;
    menuContainer.dataset.showActions = true;
  } else {
    menuForeignObject.setAttribute('width', 200)
    
    menuContainer.dataset.showActions = false;
  }
  
  targ.dataset.selected = true;
  selectionBox.insertAt({ x: +targ.dataset.x, y: +targ.dataset.y });
  
  contextMenu.parentElement.append(contextMenu);
  // contextMenuTransformList.translateTo(+targ.dataset.x + 1.5, +targ.dataset.y - 2)
  contextMenu.dataset.show = true;
  
  const blurContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    const edgeLines = [...objectLayer.querySelectorAll('.edge-line')];
    
    edgeLines.forEach(el => {
      el.remove();
    })
    
    if (contextMenu.dataset.show === 'true') {
      deselectRange();
      selectionBox.remove();
      
      contextMenu.dataset.show = false;
      contextMenu.dataset.showActions = false;
      
      // contextMenuTransformList.translateTo(0, 5);
      // contextMenuTransformList.rotateTo(0, 0);
      svgCanvas.removeEventListener('click', blurContextMenu);
    }
  };
  
  svgCanvas.addEventListener('click', blurContextMenu);
});

contextMenu.addEventListener('click', e => {
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
  
  const targ = e.target.closest('li');
  
  const selectedOptionValue = targ.dataset.value;
  const selectedOptionType = targ.dataset.type;
  const selectedTileTypeName = targ.dataset.value;
  
  const selectedTile = svgCanvas.layers.tile.querySelector('.tile[data-selected="true"]');
  const selectedTiles = selectedRange;
  
  if (!targ || !selectedTile) return;
  
  const node = graph.getNodeAtPoint({
    x: +selectedTile.dataset.x,
    y: +selectedTile.dataset.y,
  });
  
  if (selectedOptionType === 'tile-action') {
    
    if (selectedOptionValue === 'link-teleport') {
      contextMenu.dataset.show = false;
      isSelectingLinkTile = true;
      
      const handleTileLinkSelect = (e) => {
        const linkTarget = e.target.closest('.tile')
        const nodeToLink = graph.getNodeAtPoint({
          x: +linkTarget.dataset.x,
          y: +linkTarget.dataset.y,
        });
        
        nodeToLink.setType('teleport');
        
        node.linkToNode({ x: nodeToLink.x, y: nodeToLink.y });
        
        if (!nodeToLink.linkedNodeAddress) {
          nodeToLink.linkToNode({ x: node.x, y: node.y });
        }
        
        isSelectingLinkTile = false;
        
        svgCanvas.dom.removeEventListener('click', handleTileLinkSelect);
        
        // dispatchPointerEvent(selectedTile, 'contextmenu')
        
        return;
      }
      
      svgCanvas.dom.addEventListener('click', handleTileLinkSelect);
      return;
    }
  }
  
  else if (selectedOptionType === 'tile-type') {
    node.setType(selectedTileTypeName);
    
    selectedTile.dataset.tileType = selectedTileTypeName;
    selectedTile.dataset.selected = false;
    
    selectedRange.forEach((tile, i) => {
      const nodeModel = graph.getNodeAtPoint({
        x: +tile.dataset.x,
        y: +tile.dataset.y,
      });
      
      nodeModel.setType(selectedTileTypeName);
      
      if (selectedTileTypeName === 'teleport') {
        nodeModel.target = { x: 1, y: 1 };
      }
      
      tile.dataset.tileType = selectedTileTypeName;
    });
  }
});
import { Graph, TILE_TYPE_INDEX } from './lib/graph.model.js';
import { SVGCanvas } from './canvas/SVGCanvas.js';
import { maps } from './maps.js';
import { getTileSelector } from 'https://hamilsauce.github.io/svg-range-selector/tile-selector.js';
import { initMapControls } from './ui/map-selection.js';
import { scheduleOscillator, AudioNote, audioEngine } from './audio/index.js';
import { TransformList } from './canvas/TransformList.js';
import ham from 'https://hamilsauce.github.io/hamhelper/hamhelper1.0.0.js';
import { useAppState } from './store/app.store.js';
import { AudioClockLoop } from './lib/loop-engine.js';
import { getScaleNotes, getChordNotes, pitchToFrequency } from './MUSIC_THEORY_FUNCTIONS.js';


// setTimeout(() => {
//   const canvasEl = document.querySelector('#canvas');

//   setInterval(() => {
//     console.warn('toggle', canvasEl.className)
//     canvasEl.classList.toggle('bg-blend-overlay')
//   }, 1000)
// }, 2000)


export const runCanvas = async () => {
  const { isRunning, setRunning } = useAppState();
  
  const { addDragAction, sleep, template, utils, download, TwoWayMap } = ham;
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
  
  let getSelectedRange = (tileLayer = document.querySelector('#tile-layer')) => [...tileLayer.querySelectorAll('.tile[data-selected="true"]')];
  
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
  };
  
  const createEdgeLine = (pt1, pt2) => {
    const line = useTemplate('edge-line');
    const lineEl = line.querySelector('line');
    const lineHandle = line.querySelector('circle');
    const [endX, endY] = computeArrowEndpoint(
      [pt1.x + 0.5, pt1.y + 0.5],
      [pt2.x + 0.5, pt2.y + 0.5]
    );
    
    lineEl.setAttribute('x1', pt1.x + 0.5);
    lineEl.setAttribute('y1', pt1.y + 0.5);
    lineEl.setAttribute('x2', endX);
    lineEl.setAttribute('y2', endY);
    lineHandle.setAttribute('cx', endX);
    lineHandle.setAttribute('cy', endY);
    
    // line.addEventListener('pointermove', e => {
    //   e.stopPropagation();
    //   e.preventDefault();
    
    //   const targ = e.currentTarget
    //   const newPoint = domPoint(line.parentElement, e.clientX, e.clientY)
    //   const [newEndX, newEndY] = computeArrowEndpoint(
    //     [pt1.x + 0.5, pt1.y + 0.5],
    //     [newPoint.x + 0.5, newPoint.y + 0.5]
    //   );
    
    //   line.firstElementChild.setAttribute('x2', newEndX);
    //   line.firstElementChild.setAttribute('y2', newEndY);
    // });
    
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
  
  const ANIM_RATE = 105;
  let selectedRange = [];
  const fireAudioNote = (freq, vel, dur = 0.15) => (new AudioNote(audioEngine.ctx)
    .at(audioEngine.now)
    .frequencyHz(freq)
    .duration(dur)
    .velocity(vel).play()
    // .at(audioEngine.currentTime+0.1)
    // .velocity(0.005).play()
    
    
  );
  
  let audioNote1 // = (new AudioNote(audioEngine));
  
  const graph = new Graph();
  
  const app = document.querySelector('#app');
  const floatingMenu = app.querySelector('#app-floating-menu');
  const canvasEl = document.querySelector('#canvas');
  const svgCanvas = new SVGCanvas(canvasEl);
  
  const scene = svgCanvas.dom.querySelector('#scene');
  const tileLayer = scene.querySelector('#tile-layer');
  const objectLayer = scene.querySelector('#object-layer');
  const selectionBox = getTileSelector(objectLayer);
  
  const contextMenu = useTemplate('context-menu');
  const contextMenuTransformList = new TransformList(svgCanvas, contextMenu, {
    transforms: [
      { type: 'translate', values: [0, 0], position: 0 },
      { type: 'rotate', values: [0, 0, 0], position: 1 },
      { type: 'scale', values: [0.05, 0.05], position: 2 },
    ],
  });
  
  const actor1 = useTemplate('actor', {
    dataset: { moving: false, teleporting: false },
    id: 'actor1',
  });
  
  const actor1TransformList = new TransformList(svgCanvas, actor1);
  
  const actor2 = useTemplate('actor', {
    dataset: { moving: false, teleporting: false },
    fill: '#C1723B',
    id: 'actor2',
  });
  
  const actor2TransformList = new TransformList(svgCanvas, actor2);
  
  const selectMapById = await initMapControls(graph, svgCanvas, actor1, selectionBox);
  
  actor2.setAttribute('transform', 'translate(12,21) rotate(0) scale(1)');
  
  objectLayer.setAttribute('transform', 'translate(0,0) rotate(0) scale(1)');
  objectLayer.append(actor1, actor2, contextMenu);
  
  selectionBox.on('selection', range => {
    selectedRange = getRange(range);
    const { start, end } = range;
    
    const middle = Math.abs(start.x - end.x);
    
    graph.getRange(range, (tile) => tile.selected = true);
    
    const menuContainer = contextMenu.querySelector('.context-menu');
    contextMenuTransformList.translateTo(start.x, start.y - 2);
    
    if (menuContainer.dataset.showActions === 'true') {
      contextMenu.dataset.show = true;
      contextMenu.querySelectorAll('li').forEach(el => { el.dataset.active = false; });
      
      menuContainer.dataset.showActions = true;
    } else {
      menuContainer.dataset.showActions = false;
    }
  });
  
  svgCanvas.setCanvasDimensions({ width: innerWidth, height: innerHeight });
  
  const pointerup$ = fromEvent(svgCanvas, 'pointerup');
  
  pointerup$.pipe().subscribe();
  
  let lastX;
  let lastY;
  let goalTile;
  let isMoving = false;
  let isSelectingLinkTile = false;
  let selectedTileBeingLinked = null;
  
  const harmonicCxt = {
    root: 'C4',
    scale: 'major',
    octave: 4,
    notes: getScaleNotes('C4', 'major'),
    chordNotes: getChordNotes('C4', 'major'),
  }
  
  const getTileDegree = (x, scaleLength) => {
    return harmonicCxt.notes[x % scaleLength].pitchClass
  }
  
  const getTileOctave = (y, scaleLength) => {
    return Math.floor(y / scaleLength) + harmonicCxt.octave
  }
  
  function getScaleDegree(x, y, arp) {
    return arp ? (x + y) % harmonicCxt.chordNotes.length : (x + y) % harmonicCxt.notes.length
  }
  
  const getTileTone = (x, y, arp = false) => {
    const deg = getScaleDegree(x, y, arp)
    const pitch = arp ? harmonicCxt.chordNotes[deg] : harmonicCxt.notes[deg]
    
    return pitchToFrequency(pitch.pitch)
  }
  
  const getDynamicTone = (x, y, dir = 1) => {
    const mod = y > 5 ? -2 : 0;
    const pitchClass = getTileDegree(x, harmonicCxt.notes.length)
    const octave = getTileOctave(y + mod, harmonicCxt.notes.length)
    
    const pitch = `${pitchClass}${octave + dir}`;
    return pitchToFrequency(pitch)
  }
  
  const toTone = (x, y) => (x % 2 && y % 2) ?
    getDynamicTone(x, y, 0) :
    getTileTone(x, y, )
  
  
  
  const handleTileClick = async ({ detail }) => {
    if (!isRunning.value) return;
    if (isMoving) return;
    if (contextMenu.dataset.show === 'true') return;
    if (isSelectingLinkTile === true) return;
    
    deselectRange();
    selectedRange = [];
    
    
    selectionBox.remove();
    
    let tile = detail.target.closest('.tile');
    let linkedMapId = tile.dataset.linkedMap
    
    let activeActor;
    let actorTrans = activeActor === actor1 ? actor1TransformList : actor2TransformList;
    
    const actorTarget = detail.target.closest('.actor');
    
    if (actorTarget) {
      const actors = [...scene.querySelectorAll('.actor')];
      activeActor = actors.find(t => actorTarget != t);
      tile = svgCanvas.querySelector(`.tile[data-x="${actorTarget.dataset.x}"][data-y="${actorTarget.dataset.y}"]`);
    } else {
      activeActor = actor1;
    }
    
    const pathNodes = svgCanvas.querySelectorAll('.tile[data-is-path-node="true"]');
    
    pathNodes.forEach((el, i) => { el.dataset.isPathNode = false; });
    
    if (tile && tile.dataset.tileType !== 'barrier') {
      const activeTiles = svgCanvas.querySelectorAll('.tile[data-active="true"]');
      const highlightedTiles = svgCanvas.querySelectorAll('.tile[data-highlight="true"]');
      
      activeTiles.forEach((el, i) => { el.dataset.active = false; });
      highlightedTiles.forEach((el, i) => { el.dataset.highlight = false; });
      
      const pt = { x: +tile.dataset.x, y: +tile.dataset.y };
      
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
    
    if (!targetNodeEl) {
      console.warn('No Target Node');
      return;
    }
    
    const startNode = graph.getNodeAtPoint({ x: +startNodeEl.dataset.x, y: +startNodeEl.dataset.y });
    const targetNode = graph.getNodeAtPoint({ x: +targetNodeEl.dataset.x, y: +targetNodeEl.dataset.y });
    const bfsPath = graph.getPath(startNode, targetNode);
    
    if (bfsPath === null) return;
    
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
      
      let shouldPreVel = false;
      let shouldPreVels = [0, 1, 0];
      let preVelIndex = 0;
      
      const getNextPreVelIndex = () => {
        preVelIndex = preVelIndex >= shouldPreVels.length - 1 ? 0 : preVelIndex + 1
        return preVelIndex;
      };
      
      let intervalHandle = setInterval(async () => {
        curr = bfsPath[pointer];
        
        if (audioNote1 && getNextPreVelIndex()) {
          audioNote1
            .at(audioEngine.currentTime + 0.33)
            .velocity(0.05)
            .play();
          
        }
        
        if (!curr) {
          isMoving = false;
          activeActor.dataset.moving = isMoving;
          clearInterval(intervalHandle);
        }
        
        else {
          {
            // AudioNote Block
            const freqX = ((curr.x + 2) * 2);
            const freqY = ((curr.y + 2) * 1.5);
            let freq = ((freqX) * (freqY)) * 1.5;
            freq = freq < 250 ? freq + 200 : freq;
            freq = freq > 1600 ? 1200 - freq : freq;
            freq = curr.tileType === 'teleport' ? freq + 100 : freq;
            
            let vel = (0.4 - (pointer / bfsPath.length));
            vel = vel >= 0.4 ? 0.4 : vel;
            vel = vel <= 0.075 ? 0.075 : vel;
            
            const dur = 2 / bfsPath.length;
            const startMod = ((pointer || 1) * 0.01);
            
            
            try {
              freq = toTone(curr.x, curr.y)
              audioNote1 = fireAudioNote(freq, vel)
              
              
            } catch (e) {
              console.error('coukdbt play audio note')
            }
            
          }
          
          const el = svgCanvas.querySelector(`.tile[data-x="${curr.x}"][data-y="${curr.y}"]`);
          
          const lastX = +activeActor.dataset.x;
          const lastY = +activeActor.dataset.y;
          
          activeActor.dataset.x = curr.x;
          activeActor.dataset.y = curr.y;
          
          actorTrans = activeActor === actor1 ? actor1TransformList : actor2TransformList;
          actorTrans.translateTo(curr.x, curr.y);
          
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
            
            return;
          }
          
          if (el.dataset.tileType === 'map-link') {
            // const linkedMapId = el.dataset.linkedMap
            console.warn('linkedMapId', linkedMapId)
            if (!linkedMapId) return
            selectMapById(linkedMapId)
            return
            actor1.dataset.teleporting = true;
            
            if (el === startNodeEl) {
              el.dataset.active = false;
              el.dataset.current = false;
              
              return;
            }
            
            el.dataset.active = true;
            el.dataset.current = true;
            
            const tels = [...svgCanvas.querySelectorAll('.tile[data-tile-type="teleport"]')];
            const otherTele = tels.find(t => el != t && t.dataset.current != 'true');
            
            activeActor.dataset.x = el.dataset.x;
            activeActor.dataset.y = el.dataset.y;
            
            actorTrans = activeActor === actor1 ? actor1TransformList : actor2TransformList;
            actorTrans.translateTo(el.dataset.x, el.dataset.y);
            
            el.dataset.active = false;
            el.dataset.current = false;
            
            otherTele.dataset.active = false;
            otherTele.dataset.current = false;
            
            await sleep(10);
            shouldPreVel = !shouldPreVel
            activeActor.dataset.teleporting = false;
          }
          if (el.dataset.tileType === 'teleport') {
            actor1.dataset.teleporting = true;
            
            if (el === startNodeEl) {
              el.dataset.active = false;
              el.dataset.current = false;
              
              return;
            }
            
            el.dataset.active = true;
            el.dataset.current = true;
            
            const tels = [...svgCanvas.querySelectorAll('.tile[data-tile-type="teleport"]')];
            const otherTele = tels.find(t => el != t && t.dataset.current != 'true');
            
            activeActor.dataset.x = el.dataset.x;
            activeActor.dataset.y = el.dataset.y;
            
            actorTrans = activeActor === actor1 ? actor1TransformList : actor2TransformList;
            actorTrans.translateTo(el.dataset.x, el.dataset.y);
            
            el.dataset.active = false;
            el.dataset.current = false;
            
            otherTele.dataset.active = false;
            otherTele.dataset.current = false;
            
            await sleep(10);
            shouldPreVel = !shouldPreVel
            activeActor.dataset.teleporting = false;
          }
        }
      }, ANIM_RATE);
    }
  };
  
  const blurContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    const edgeLines = [...objectLayer.querySelectorAll('.edge-line')];
    
    edgeLines.forEach(el => {
      el.remove();
    });
    
    if (contextMenu.dataset.show === 'true') {
      deselectRange();
      selectionBox.remove();
      
      contextMenu.dataset.show = false;
      contextMenu.dataset.showActions = false;
      
      svgCanvas.removeEventListener('tile:click', blurContextMenu);
    }
  };
  
  const handleEditTileClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    // TODO: this normalizes custom events coming from SVGCanvas vs DOM
    // TODO: So need to standardize events
    const targ = (e.detail.target ?? e.target).closest('.tile');
    
    if (!targ) {
      blurContextMenu(e);
      return;
    }
    
    const tileType = targ.dataset.tileType;
    const shouldShowSecondaryList = tileType === 'teleport';
    
    const menuForeignObject = contextMenu.querySelector('.context-menu-foreignobject');
    const listEl = contextMenu.querySelector('.context-menu-list');
    const menuContainer = contextMenu.querySelector('.context-menu');
    
    if (tileType === 'teleport') {
      const selectedNode = graph.getNodeAtPoint({
        x: +targ.dataset.x,
        y: +targ.dataset.y,
      });
      
      if (selectedNode.target) {
        const line = createEdgeLine(selectedNode, selectedNode.target);
        // $$
        
        line.addEventListener('pointermove', e => {
          e.stopPropagation();
          e.preventDefault();
          
          if (isSelectingLinkTile && targ.dataset.selected === 'true') {
            const newPoint = domPoint(line.parentElement, e.clientX, e.clientY)
            
            line.firstElementChild.setAttribute('x2', newPoint.x);
            line.firstElementChild.setAttribute('y2', newPoint.y);
          }
        });
        
        objectLayer.append(line);
      }
      
      contextMenu.dataset.show = true;
      menuContainer.dataset.showActions = true;
    } else {
      menuForeignObject.setAttribute('width', 200);
      
      menuContainer.dataset.showActions = false;
    }
    
    targ.dataset.selected = true;
    selectionBox.insertAt({ x: +targ.dataset.x, y: +targ.dataset.y });
    
    {
      contextMenu.parentElement.append(contextMenu);
      const [firstItem, lastItem] = [listEl.firstElementChild, listEl.lastElementChild];
      lastItem.scrollIntoView();
      contextMenu.dataset.show = true;
      setTimeout(() => { firstItem.scrollIntoView({ behavior: 'smooth' }); }, 500);
      
    }
    
    svgCanvas.addEventListener('tile:click', blurContextMenu);
  };
  
  setTimeout(() => {
    lastX = +tileLayer.lastElementChild.dataset.x;
    lastY = +tileLayer.lastElementChild.dataset.y;
    
    tileLayer.dataset.width = lastX;
    tileLayer.dataset.height = lastY;
    
    goalTile = tileLayer.querySelector('[data-tile-type="goal"]');
  }, 900);
  
  
  /*
    ACTOR-TARGET AUTOMATION
  */
  
  // setTimeout(() => {
  //   const targetEls = [
  //     tileAt(5, 7),
  //     tileAt(10, 6),
  //     tileAt(13, 2),
  //   ];
  //   let i = 0
  //   setInterval(() => {
  //     if (i < targetEls.length) {
  //       handleTileClick({ detail: { target: targetEls[i] } })
  //     }
  //     i++
  
  //   }, 2500)
  // }, 2000);
  
  const handleTileLinkSelect = (e) => {
    const linkTarget = e.detail.target.closest('.tile');
    const node = selectedTileBeingLinked;
    
    const nodeToLink = graph.getNodeAtPoint({
      x: +linkTarget.dataset.x,
      y: +linkTarget.dataset.y,
    });
    
    if (nodeToLink.tileType !== 'teleport') {
      nodeToLink.setType('teleport');
      linkTarget.dataset.tileType = 'teleport';
      nodeToLink.linkToNode({ x: node.x, y: node.y });
    }
    
    node.linkToNode({ x: nodeToLink.x, y: nodeToLink.y });
    
    isSelectingLinkTile = false;
    svgCanvas.layers.tile.dataset.isSelectingLinkTile = false;
    selectedTileBeingLinked = null;
    
    return;
  };
  
  
  svgCanvas.addEventListener('tile:click', (e) => {
    if (isSelectingLinkTile) {
      handleTileLinkSelect(e);
    } else if (isRunning.value) {
      handleTileClick(e);
    } else {
      handleEditTileClick(e);
    }
  });
  
  contextMenu.addEventListener('pointerdown', e => {
    e.stopPropagation();
  });
  
  // FOR DRAGGING LINES
  // svgCanvas.dom.addEventListener('pointerdown', e => {
  //   const arrow = e.target.closest('.edge-line')
  
  
  //   if (!arrow) return;
  //   e.stopPropagation();
  //   e.stopImmediatePropagation();
  
  //   const handle = arrow.querySelector('circle')
  //   const line = arrow.querySelector('line')
  
  //   if (!handle) return;
  
  //   const newPt = domPoint(scene, e.clientX, e.clientY)
  //   console.warn(newPt.x, newPt.y)
  
  //   line.setAttribute('x2', Math.floor(newPt.x));
  //   line.setAttribute('y2', Math.floor(newPt.y));
  //   handle.setAttribute('cx', Math.floor(newPt.x));
  //   handle.setAttribute('cy', Math.floor(newPt.y));
  
  // });
  
  contextMenu.addEventListener('pointermove', e => {
    // e.stopPropagation();
  });
  
  svgCanvas.layers.tile.addEventListener('contextmenu', handleEditTileClick);
  
  
  contextMenu.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    
    const targ = e.target.closest('li');
    
    const selectedOptionValue = targ.dataset.value;
    const selectedOptionType = targ.dataset.type;
    const selectedTileTypeName = targ.dataset.value;
    
    const selectedTile = svgCanvas.layers.tile.querySelector('.tile[data-selected="true"]');
    
    if (!targ || !selectedTile) return;
    
    targ.dataset.active = true;
    targ.scrollIntoView({ behavior: 'smooth' });
    
    const node = graph.getNodeAtPoint({
      x: +selectedTile.dataset.x,
      y: +selectedTile.dataset.y,
    });
    
    if (selectedOptionType === 'tile-action') {
      
      if (selectedOptionValue === 'link-teleport') {
        isSelectingLinkTile = true;
        svgCanvas.layers.tile.dataset.isSelectingLinkTile = true;
        
        selectedTileBeingLinked = node;
        
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
        
        targ.dataset.active = false;
        tile.dataset.tileType = selectedTileTypeName;
      });
    };
  });
};
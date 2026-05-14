import './model/index.js';

// import './canvas/index.js'

import { ModelTypes } from './core/types/model.types.js';
import { getDirectionFromPoints } from './core/spatial/utils.js';

import { SceneModel } from './model/index.js';
// import { EntityCollection } from './model/EntityCollection.js';

// TODO: NOTE GOTTA KEEP THIS HERE BC 'CANVAS OBJECT INIT' ERROR
import { SVGCanvas } from './canvas/SVGCanvas.js';
import { Runtime } from './runtime/Runtime.js';

import { getTileSelector } from 'https://hamilsauce.github.io/svg-range-selector/tile-selector.js';
import { initMapControls } from './ui/map-selection.js';
import { useAppState } from './store/app.store.js';
// import { LoopEngine } from './core/loop-engine/index.js';
import { audioEngine } from './audio/index.js';
import audioNote1 from './audio/fire-audio-note1.js';
import { playChord } from './audio/play-chord.js';
import { createTraversalGlissController } from './audio/traversal-gliss.js';
import { ContextMenu } from './canvas/ContextMenu.js';
import { watch, toValue } from 'vue';
import { useMapStore } from './store/map.store.js';
import { projectNodePatchToRenderPatch } from './core/projections/node-to-tile.projector.js';
import { rxjs } from 'rxjs';
import { DEFAULT_TRANSFORM_MAP } from './canvas/TransformList.js';
import ham from 'ham';

const { sleep } = ham;
const { map, scan, tap, filter, timestamp } = rxjs.operators;

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
  
  return line;
};

export const runCanvas = async (mapId) => {
  let graphModel;
  let entityCollection;
  let sceneModel;
  let svgCanvas;
  let sceneObj;
  let tileLayer;
  let objectLayer;
  let actor1;
  let selectionBox;
  let contextMenu;
  let selectMapById;
  const subscriptions = new Map();
  
  const appStore = useAppState();
  const { isRunning, setCurrentNode } = appStore;
  
  let mapStore = useMapStore();
  mapId = mapId && mapId.value ? mapId.value : mapId;
  
  const runtime = new Runtime({
    appStore,
    mapStore,
    config: {
      collections: [
        { name: ModelTypes.GRAPH, },
        { name: ModelTypes.ENTITIES, },
      ],
    }
  });
  
  sceneModel = runtime.scene;
  const loopEngine = runtime.loopEngine;
  entityCollection = sceneModel.getColl(ModelTypes.ENTITIES);
  graphModel = sceneModel.getColl(ModelTypes.GRAPH);
  
  svgCanvas = runtime.svgCanvas;
  sceneObj = svgCanvas.scene;
  tileLayer = sceneObj.getLayer('tile');
  objectLayer = sceneObj.getLayer('object');
  selectionBox = getTileSelector(objectLayer.dom);
  
  const darkSunTraversalGliss = createTraversalGlissController({
    audioEngine,
    options: {
      rootPitch: 'C3',
    },
  });
  
  let isSelectingLinkTile = false;
  let selectedTileBeingLinked = null;
  
  let selectedRange = [];
  let getSelectedRange = () => tileLayer.findAll({ selected: true });
  
  const tileAt = (x, y) => tileLayer.getTileAt(x, y);
  
  const deselectRange = () => {
    getSelectedRange().forEach((t, i) => {
      t.update({ selected: false });
    });
  };
  
  contextMenu = contextMenu ?? new ContextMenu(svgCanvas);
  contextMenu.disableItem('copy');
  objectLayer.add(contextMenu ?? new ContextMenu(svgCanvas)).dom;
  
  if (entityCollection.has('actor1')) {
    entityCollection.remove('actor1');
  }
  
  subscriptions.set(
    'entityCreate',
    entityCollection.out({ type: 'entity:create' }).subscribe(e => {
      const canvasEntity = objectLayer.add({
        id: e.id,
        type: e.data?.type ?? 'actor',
        model: {
          ...e.data,
          x: e.data?.point?.x ?? e.data?.x ?? 0,
          y: e.data?.point?.y ?? e.data?.y ?? 0,
        },
        transforms: DEFAULT_TRANSFORM_MAP,
      });
      
      if (e.id === 'actor1') {
        actor1 = canvasEntity;
      }
    })
  );
  
  entityCollection.createActor({
    type: 'actor',
    id: 'actor1',
    properties: {
      moving: false,
      teleporting: false,
      isTraversing: false,
      point: { x: 0, y: 0 },
    },
  });
  
  entityCollection.createBigRupture({
    type: 'big-rupture',
    id: 'bigrupture1',
    properties: {
      moving: false,
      teleporting: false,
      point: { x: 0, y: 21 },
      isTraversing: false,
      gravityRadius: 5,
      stepIntervalModifier: -0.04,
    },
  });
  
  // TODO: temporary stealing dark sun template name
  entityCollection.createDarkSun({
    type: 'dark-sun',
    id: 'darksun1',
    properties: {
      moving: false,
      isTraversing: false,
      teleporting: false,
      point: { x: 10, y: 0 },
    },
  });
  
  selectMapById = selectMapById ?? await initMapControls(graphModel, svgCanvas);
  
  svgCanvas.setCanvasDimensions({ width: innerWidth, height: innerHeight });
  
  //! start binding
  
  let graphEvents = {
    events: [],
    count: 0,
    duration: 0,
    start: performance.now(),
  };
  
  window.graphEvents = graphEvents;
  
  subscriptions.set(
    'world',
    sceneModel.out({})
    .pipe(
      // tap(event => {
      //   if (event.type === 'map:load') {
      //     graphEvents = {
      //       events: [],
      //       duration: 0,
      //       start: performance.now(),
      //     };
      //   }
      // }),
      timestamp(),
      map(({ timestamp, value }) => ({
        ...value,
        timestamp,
        time: performance.now(),
      })),
      scan((state, event) => {
        state[`event:${event.type}`] = state[`event:${event.type}`] ? state[`event:${event.type}`] + 1 : 1;
        state[`action:${event.actionType}`] = state[`action:${event.actionType}`] ? state[`action:${event.actionType}`] + 1 : 1;
        state[`source:${event.source}`] = state[`source:${event.source}`] ? state[`source:${event.source}`] + 1 : 1;
        state[`id:${event.id}`] = state[`id:${event.id}`] ? state[`id:${event.id}`] + 1 : 1;
        state.count += 1;
        
        if (state.events.length > 6000) state.events.shift();
        
        state.events.push(event);
        state.end = event.time;
        state.duration = event.time - state.start;
        
        return state;
      }, graphEvents),
      
    )
    .subscribe()
  );
  
  // navigator.clipboard.writeText(JSON.stringify(graphEvents, null, 2));
  
  subscriptions.set(
    'mapLoad',
    sceneModel.out({ type: 'map:load' }).subscribe(e => {
      const { width, height, nodes, startNode } = e.data;
      darkSunTraversalGliss.end();
      
      selectionBox.setBounds({
        minX: 0,
        minY: 0,
        maxX: graphModel.width,
        maxY: graphModel.height
      });
      
      svgCanvas.scene.getLayer('tile').loadTileSet({ width, height, nodes, startNode });
      
      const actor1Model = entityCollection.get('actor1');
      
      actor1Model.resetTraversal(startNode?.point);
      actor1Model.update({
        point: startNode.point,
        moving: false,
        teleporting: false,
      });
      
      const teles = nodes.filter((_) => _ && _.properties.tileType === 'teleport');
      
      teles.forEach((n) => {
        const tele = entityCollection.createTeleporter({ point: n.point, target: n.target });
        graphModel.moveObject(tele.id, n.point);
      });
      
      objectLayer.bringToFront(objectLayer.get('actor1'));
      objectLayer.bringToFront(objectLayer.get('darksun1'));
      objectLayer.bringToFront(objectLayer.get('bigrupture1'));
      
      svgCanvas.layers.surface.setAttribute('transform', `translate(${Math.floor((graphModel.width + 2) / 2) - 0.3}, ${Math.floor((graphModel.height + 2) / 2) - 0.25})`);
      svgCanvas.layers.surface.querySelector('#surface-map-name').setAttribute('transform', `translate(0, ${-((graphModel.height / 2)) - 3}) scale(0.4)`);
    }));
  
  subscriptions.set(
    'nodeUpdates',
    graphModel.out({ type: 'node:update' }).pipe(
      map(projectNodePatchToRenderPatch),
      tap(renderPatch => {
        const node = graphModel.get(renderPatch.id);
        
        if (renderPatch.model && renderPatch.model.tileType === 'teleport') {
          const ent = entityCollection.createTeleporter({ point: node.point });
          graphModel.moveObject(ent.id, node.point);
        }
        
        else if (renderPatch.model.tileType !== 'teleport') {
          node.objectIds.forEach(id => {
            const ent = entityCollection.get(id);
            if (ent.type === 'teleporter') {
              entityCollection.remove(id);
              node.deleteObject(id);
            }
          });
        }
        
        tileLayer.applyRenderPatch(renderPatch);
      })).subscribe()
  );
  
  subscriptions.set(
    'entityRemove',
    entityCollection.out({ type: 'entity:remove' }).pipe(
      tap((e) => {
        objectLayer.remove(e.id);
      })).subscribe()
  );
  
  subscriptions.set(
    'actorRender',
    entityCollection.out({
      type: 'actor',
      filter: ({ id, type }) => entityCollection.get(id).type === 'actor',
    }).subscribe((event) => {
      const actor1Model = entityCollection.get('actor1');
      
      if (event.type === 'actor:update') {
        const actor1 = objectLayer.get(event.id);
        
        if (!actor1) return;
        
        const currRotate = actor1.transforms.rotation;
        
        actor1.update({ ...event.data, });
        
        return;
      }
      
      if (event.type === 'actor:move') {
        if (!actor1) return;
        actor1.update({ x: event.point.x, y: event.point.y, point: event.point, isTraversing: false });
        
        return;
      }
      
      if (event.type === 'actor:teleport') {
        if (!actor1) return;
        actor1.update({ x: event.point.x, y: event.point.y, teleporting: true });
        return;
      }
      
      if (['actor:stop', 'actor:idle', 'actor:goal', 'actor:map-link'].includes(event.type)) {
        if (!actor1) return;
        const point = event.point ?? actor1Model.currentPoint;
        actor1.update({ x: point.x, y: point.y, teleporting: false, isTraversing: false });
      }
    })
  );
  
  subscriptions.set(
    'darksunTravel',
    entityCollection.out({
      type: 'traversal:start',
      filter: ({ id, type, point, goalNode }) => entityCollection.get(id).type === 'dark-sun'
    }).subscribe(({ id, type, point, goalNode }) => {
      darkSunTraversalGliss.start();
      playChord({ point: point, forceNewNote: true });
    })
  );
  
  let neighborIndex = 0;
  
  subscriptions.set(
    'actorTravel',
    entityCollection.out({
      type: 'traversal:start',
      filter: ({ id, type }) => entityCollection.get(id).type === 'actor',
    }).subscribe(async ({ point, goalPoint }) => {
      const curr = graphModel.getNodeAtPoint(point);
      
      tileLayer.forEach(_ => _.update({ active: false }));
      tileLayer.get(`${goalPoint.x}_${goalPoint.y}`).update({ active: true });
      
      await audioEngine.ensureReady();
      await sleep(50);
      
      playChord({ point: curr.point, });
    })
  );
  
  subscriptions.set(
    'actorMove',
    runtime.out({
      type: 'traversal:move',
      filter: ({ id, meta }) => entityCollection.get(id).type === 'actor' && meta?.derived === true,
    }).subscribe(async ({ id, point, prevPoint }) => {
      const entity = entityCollection.get(id);
      const node = graphModel.getNodeAtPoint(point);
      const teleporting = node?.tileType === 'teleport';
      
      if (node.tileType === 'map-link' && node.linkedMap) {
        const { linkedMap } = node;
        await selectMapById(linkedMap);
        entity.stop();
        return;
      }
      
      const _neighbors = [...graphModel.getNeighbors(node).entries()];
      const n1 = _neighbors.slice(0, neighborIndex);
      const n2 = _neighbors.slice(neighborIndex);
      const neighbors = [...n1, ...n2];
      const direction = getDirectionFromPoints(prevPoint, point);
      
      neighborIndex = neighborIndex >= 3 ? 0 : neighborIndex + 1;
      
      setCurrentNode(node.data());
      
      playChord({ point: node.point, });
      
      objectLayer.get(id)?.update({ point: node.point, teleporting });
      
      let cnt = 0;
      
      for (const [nDir, neighbor] of neighbors) {
        cnt++;
        
        setTimeout(() => {
          const propKey = direction !== nDir ? 'isPathNode' : 'highlight';
          const tile = tileLayer.get(neighbor.id);
          tile.toggle({
            [propKey]: true
          }, { time: 1600 });
        }, 0 + (100 * cnt));
      }
    })
  );
  
  subscriptions.set(
    'actorTraversalEnd',
    runtime.out({
      filter: ({ id, type }) => {
        return entityCollection.get(id)?.type === 'actor' && ['traversal:stop', 'traversal:goal', 'traversal:idle'].includes(type);
      },
    }).subscribe((event) => {
      objectLayer.get(event.id)?.update({ teleporting: false, isTraversing: false });
      tileLayer.forEach(_ => _.update({ active: false }));
    })
  );
  
  subscriptions.set(
    'darkSunMove',
    runtime.out({
      type: 'traversal:move',
      filter: ({ id, meta }) => entityCollection.get(id).type === 'dark-sun' && meta?.derived === true,
    }).subscribe((event) => {
      const { id, point, prevPoint } = event;
      const node = graphModel.getNodeAtPoint(point);
      const prevNode = graphModel.getNodeAtPoint(prevPoint);
      const actorModel = entityCollection.get('actor1') ?? entityCollection.actors[0];
      const teleporting = node?.tileType === 'teleport';
      
      if (actorModel) {
        const distance = Math.hypot(
          (node.point.x ?? 0) - (actorModel.x ?? actorModel.point?.x ?? 0),
          (node.point.y ?? 0) - (actorModel.y ?? actorModel.point?.y ?? 0),
        );
        if (distance >= 10) {
          darkSunTraversalGliss.end();
          objectLayer.get(id)?.update({ point: node.point, teleporting });
          return;
        }
      }
      
      const isTeleportJump = !!(
        prevNode?.tileType === 'teleport' &&
        prevNode?.target &&
        prevNode.target.x === point.x &&
        prevNode.target.y === point.y
      );
      
      if (isTeleportJump) {
        darkSunTraversalGliss.playTeleportGliss(prevNode, node);
      } else {
        darkSunTraversalGliss.handleMove({ prevPoint, point });
      }
      
      objectLayer.get(id)?.update({ point: node.point, teleporting });
    })
  );
  
  subscriptions.set(
    'darkSunTraversalEnd',
    entityCollection.out({
      filter: ({ id, type }) => {
        return entityCollection.get(id)?.type === 'dark-sun' && ['traversal:stop', 'traversal:goal', 'traversal:idle'].includes(type);
      },
    }).subscribe(() => {
      darkSunTraversalGliss.end();
    })
  );
  
  subscriptions.set(
    'bigRuptureMove',
    runtime.out({
      type: 'traversal:move',
      filter: ({ id, meta }) => entityCollection.get(id).type === 'big-rupture' && meta?.derived === true,
    }).subscribe((event) => {
      const { id, point } = event;
      const node = graphModel.getNodeAtPoint(point);
      const teleporting = node?.tileType === 'teleport';
      
      objectLayer.get(id)?.update({ point: node.point, teleporting });
    })
  );
  
  subscriptions.set(
    'darkSunCollision',
    runtime.out({
      type: 'traversal:idle',
      filter: ({ id, reason, meta }) => (
        entityCollection.get(id)?.type === 'dark-sun' &&
        meta?.derived === true &&
        typeof reason === 'string' &&
        reason.startsWith('blocked-by:')
      ),
    })
    .subscribe(async (event) => {
      const { id, point, goalPoint } = event;
      const collisionPoint = goalPoint ?? point;
      const newOccupant = entityCollection.get(id);
      const node = tileLayer.get(graphModel.pointToAddress(collisionPoint));
      const blockerIds = graphModel.getNodeAtPoint(collisionPoint)?.objectIds ?? [];
      const actors = [...new Set([id, ...blockerIds])];
      
      if (!newOccupant || newOccupant.type !== 'dark-sun' || !node) {
        return;
      }
      
      darkSunTraversalGliss.end();
      
      const dso = objectLayer.get(id);
      if (!dso) return;
      
      dso.toggle({ point, recoiling: true }, { time: 150 });
      
      node.toggle({ recoiling: true }, { time: 500 });
      
      actors.forEach(async (id, i) => {
        const a = objectLayer.get(id);
        if (a === dso) return;
        
        await sleep(180 * i);
        if (a.recoil) a.recoil(500);
        
        audioNote1(null, {
          forceNewNote: true,
          frequency: 530,
          velocity: 0.3,
        });
      });
      
      await sleep(50);
      
      audioNote1(null, {
        forceNewNote: true,
        frequency: 220,
        velocity: 0.3,
      });
      
      await sleep(25);
      
      audioNote1(null, {
        forceNewNote: true,
        frequency: 275,
        velocity: 0.15,
      });
      
      await sleep(50);
      
      audioNote1(null, {
        forceNewNote: true,
        frequency: 325,
        velocity: 0.2,
      });
    })
  );
  
  const unwatchCurrentMap = watch(mapStore.currentMap, (newMap, oldMap) => {
    if (!newMap.id) return;
    
    const mapData = toValue(newMap);
    
    graphModel.fromMap(mapData);
  }, { immediate: true });
  
  const unwatchIsRunning = watch(isRunning, (newVal, oldVal) => {
    if (newVal === true && oldVal === false) {
      // loopEngine.start();
    }
    
    if (newVal === false && oldVal === true) {
      // loopEngine.pause();
    }
  }, { immediate: true });
  
  const unsubscribeSelectionBox = selectionBox.on('selection', ({ type, points, ...range }) => {
    const { start, end } = range;
    selectedRange = graphModel.getRange({ type, points, ...range });
    
    contextMenu.update({ x: start.x, y: start.y - 2 }).show();
  });
  
  
  //! end bindings
  
  const blurContextMenu = (e) => {
    const edgeLines = [...objectLayer.dom.querySelectorAll('.edge-line')];
    
    edgeLines.forEach(el => {
      el.remove();
    });
    
    if (contextMenu.isVisible) {
      selectionBox.remove();
      
      contextMenu.hide();
      contextMenu.toggleActions(false);
    }
  };
  
  const handleEditTileClick = async (targetNode) => {
    if (!targetNode) {
      console.warn('handleEditTileClick !targetnode', );
      blurContextMenu();
      return;
    }
    
    const { tileType, target, selected } = targetNode;
    
    if (tileType === 'teleport') {
      if (target) {
        // TODO: Make lines into Canvas Object
        const line = createEdgeLine(targetNode, target);
        
        objectLayer.dom.append(line);
        
        line.addEventListener('pointermove', e => {
          e.stopPropagation();
          e.preventDefault();
          console.warn('line');
          const newPoint = domPoint(svgCanvas.scene.dom, e.clientX, e.clientY);
          selectedTileBeingLinked = targetNode;
          
          line.firstElementChild.setAttribute('x2', Math.floor(newPoint.x) + 0.5);
          line.firstElementChild.setAttribute('y2', Math.floor(newPoint.y) + 0.5);
        });
        
        line.addEventListener('pointerup', e => {
          e.stopPropagation();
          e.preventDefault();
          
          
          const newPoint = domPoint(line.parentElement, e.clientX, e.clientY);
          const node = graphModel.getNodeAtPoint({ x: Math.floor(newPoint.x), y: Math.floor(newPoint.y) });
          line.firstElementChild.setAttribute('x2', node.x + 0.5);
          line.firstElementChild.setAttribute('y2', node.y + 0.5);
          
          handleTileLinkSelect({ node });
          blurContextMenu();
        });
      }
      
      contextMenu.show();
      contextMenu.toggleActions(true);
    } else {
      contextMenu.toggleActions(false);
    }
    
    // targetNode.update({ selected: true });
    
    selectionBox.insertAt({ x: targetNode.x, y: targetNode.y });
  };
  
  const handleTileLinkSelect = (e) => {
    const nodeToLink = e.node ?? graphModel.getNodeAtPoint({ ...e.detail });
    
    const node = selectedTileBeingLinked;
    
    if (nodeToLink.tileType !== 'teleport') {
      nodeToLink.update({ tileType: 'teleport', target: { x: node.x, y: node.y } });
      
    }
    
    node.update({ target: { x: nodeToLink.x, y: nodeToLink.y } });
    
    isSelectingLinkTile = false;
    svgCanvas.layers.tile.dataset.isSelectingLinkTile = false;
    selectedTileBeingLinked = null;
    
    return;
  };
  
  svgCanvas.addEventListener('surface:click', (e) => {
    entityCollection.get('actor1').stop();
    blurContextMenu();
  });
  
  svgCanvas.addEventListener('tile:click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const targetNode = graphModel.getNodeByAddress(e.detail.id);
    if (isSelectingLinkTile) {
      // handleTileLinkSelect(e);
    } else if (isRunning.value) {} else {
      handleEditTileClick(targetNode);
    }
  });
  
  svgCanvas.addEventListener('contextmenu:blur', (e) => {
    blurContextMenu();
  });
  
  svgCanvas.addEventListener('tile:contextmenu', (e) => {
    const targetNode = graphModel.getNodeByAddress(e.detail.id);
    handleEditTileClick(targetNode);
  });
  
  contextMenu.on('tile-action', data => {
    const selectedOptionValue = data.type;
    const selectedTileTypeName = data.type;
    const selectedNode = selectedRange[0];
    
    if (!selectedNode) return;
    
    if (selectedOptionValue === 'copy') {
      sourceRange = selectedRange;
    }
    
    if (selectedOptionValue === 'link-teleport') {
      
      isSelectingLinkTile = true;
      svgCanvas.layers.tile.dataset.isSelectingLinkTile = true;
      
      selectedTileBeingLinked = selectedNode;
      
      return;
    }
    else {
      selectedRange.forEach((nodeModel, i) => {
        nodeModel.update({
          tileType: selectedTileTypeName,
          selected: nodeModel.id === selectedNode.id ? true : false,
        });
      });
    };
  });
  
  
  return () => {
    darkSunTraversalGliss.end();
    subscriptions.forEach((sub, k) => {
      console.warn('unsubscribing: ', k);
      sub.unsubscribe();
    });
    unsubscribeSelectionBox();
    
    entityCollection.get('actor1')?.destroy();
    loopEngine.destroy();
    unwatchCurrentMap();
    unwatchIsRunning();
    svgCanvas.destroy();
    svgCanvas = null;
    entityCollection.remove('actor1');
    graphModel.clear();
    window.graph = undefined;
    console.warn('RUNCANVAS : CANCEL');
  };
};
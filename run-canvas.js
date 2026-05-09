import './model/index.js';
import { ModelRegistry } from './core/types/model-registry.js';
import { CollectionRegistry } from './core/types/collection-registry.js';
import { ModelTypes } from './core/types/model.types.js';

import { getChordToneDegreeFromDir, getDirectionFromPoints } from './core/spatial/utils.js';
import getGraphModel from './model/graph.model.js';
import { SceneModel } from './model/index.js';
import { EntityCollection } from './model/EntityCollection.js';
import { SVGCanvas } from './canvas/SVGCanvas.js';
import { getTileSelector } from 'https://hamilsauce.github.io/svg-range-selector/tile-selector.js';
import { initMapControls } from './ui/map-selection.js';
import { useAppState } from './store/app.store.js';
import { LoopEngine } from './core/loop-engine/index.js';
import { audioEngine } from './audio/index.js';
import audioNote1 from './audio/fire-audio-note1.js';
import { playChord, playChordLong } from './audio/play-chord.js';
import { GlideVoice } from './audio/GlideVoice.js';
import { LoopableScaleSequence } from './audio/LoopableScaleSequence.js';
import { ContextMenu } from './canvas/ContextMenu.js';
import { watch, toValue } from 'vue';
import { useMapStore } from './store/map.store.js';
import { Runtime } from './runtime/Runtime.js';
import { projectNodePatchToRenderPatch } from './core/projections/node-to-tile.projector.js';
import { rxjs } from 'rxjs';
import { DEFAULT_TRANSFORM_MAP } from './canvas/TransformList.js';
import ham from 'ham';

const { sleep } = ham;
const { operators, Subject } = rxjs;
const { map, scan, tap, filter, bufferTime, timestamp } = operators;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const normalizeRhythmPattern = ({ playEvery = 1, playPattern = null } = {}) => {
  if (Array.isArray(playPattern) && playPattern.length) {
    const pattern = playPattern
      .map(step => Number(step))
      .filter(step => step === 0 || step === 1);
    
    if (pattern.length) {
      return pattern;
    }
  }
  
  const interval = Math.max(1, Math.floor(playEvery || 1));
  
  return Array.from({ length: interval }, (_, index) => index === 0 ? 1 : 0);
};

const getDirectionAnchorDegree = (direction) => getChordToneDegreeFromDir(direction) ?? 0;
const getDirectionTravelPolarity = (direction) => {
  if (direction === 'right' || direction === 'down') {
    return 1;
  }
  
  if (direction === 'left' || direction === 'up') {
    return -1;
  }
  
  return 0;
};

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
  
  /**
   * Actor Traversal Melody Logic
   */
  const actorTraversalMelodyOptions = {
    rootPitch: 'C4',
    scaleName: 'major',
    octaveSpan: 3,
    glideTime: 0.054,
    turnGlideTime: 0.03,
    teleportGlideTime: 0.1,
    teleportLeadTime: 18,
    releaseTime: 0.2,
    velocity: 0.205,
    playEvery: 1,
    playPattern: null,
  };
  const actorTraversalRhythmPattern = normalizeRhythmPattern(actorTraversalMelodyOptions);
  const actorTraversalSequence = new LoopableScaleSequence(actorTraversalMelodyOptions);
  const actorTraversalVoice = new GlideVoice(audioEngine.ctx);
  let actorTraversalPrevDirection = null;
  let actorTraversalRhythmIndex = 0;
  let actorTraversalTeleportTimer = null;
  let actorTraversalSameDirCount = 0;
  let actorTraversalPersistencePhase = 0;
  
  const getActorTraversalExpression = (direction, sameDirCount = 0) => {
    const persistence = Math.max(0, sameDirCount - 1);
    const mediumBlend = clamp(persistence / 2.5, 0, 1);
    const longBlend = clamp((persistence - 4) / 5, 0, 1);
    const travelWave = Math.sin(actorTraversalPersistencePhase);
    const swellWave = Math.sin((actorTraversalPersistencePhase * 0.53) + 0.9);
    const lift = Math.max(0, travelWave);
    const ebb = Math.max(0, -travelWave);
    const polarity = getDirectionTravelPolarity(direction);
    
    return {
      glideScale: clamp(
        0.74 +
        (mediumBlend * 0.22) +
        (longBlend * (0.14 + (lift * 0.1) - (ebb * 0.04))),
        0.68,
        1.24
      ),
      brightness: clamp(
        0.24 +
        (mediumBlend * 0.16) +
        (longBlend * (0.1 + (travelWave * 0.11) + (swellWave * 0.05))),
        0.16,
        0.72
      ),
      warmth: clamp(
        0.16 +
        (mediumBlend * 0.14) +
        (longBlend * (0.12 + (lift * 0.07) + (swellWave * 0.04))),
        0.1,
        0.64
      ),
      width: clamp(
        0.12 +
        (mediumBlend * 0.18) +
        (longBlend * (0.18 + (lift * 0.09))),
        0.08,
        0.68
      ),
      level: clamp(
        0.43 +
        (mediumBlend * 0.08) +
        (longBlend * (0.06 + (lift * 0.06))),
        0.38,
        0.68
      ),
      pan: clamp(
        polarity * longBlend * (0.06 + (travelWave * 0.18)),
        -0.28,
        0.28
      ),
      articulationDepth: clamp(
        0.18 -
        (mediumBlend * 0.055) -
        (longBlend * 0.05) +
        (ebb * longBlend * 0.018),
        0.055,
        0.2
      ),
      articulationBloom: clamp(
        0.022 +
        (mediumBlend * 0.016) +
        (longBlend * (0.02 + (lift * 0.026) + (Math.max(0, swellWave) * 0.012))),
        0.016,
        0.09
      ),
    };
  };
  
  const resetActorTraversalMelodyState = () => {
    actorTraversalPrevDirection = null;
    actorTraversalRhythmIndex = 0;
    actorTraversalSameDirCount = 0;
    actorTraversalPersistencePhase = 0;
    actorTraversalSequence.reset(0);
  };
  
  const ensureTraversalAudioReady = async () => {
    try {
      await audioEngine.ensureReady();
    } catch (error) {
      console.warn('Unable to resume traversal audio context', error);
    }
  };
  
  const clearActorTraversalTeleportTimer = () => {
    if (actorTraversalTeleportTimer !== null) {
      window.clearTimeout(actorTraversalTeleportTimer);
      actorTraversalTeleportTimer = null;
    }
  };
  
  const endActorTraversalMelody = ({ release = true } = {}) => {
    clearActorTraversalTeleportTimer();
    
    if (release) {
      actorTraversalVoice.release(actorTraversalMelodyOptions.releaseTime);
    } else {
      actorTraversalVoice.dispose();
    }
    
    resetActorTraversalMelodyState();
  };
  
  const startActorTraversalMelody = () => {
    void ensureTraversalAudioReady();
    endActorTraversalMelody({ release: false });
  };
  
  const reanchorActorTraversalMelody = (direction, { isStart = false } = {}) => {
    const note = actorTraversalSequence.reset(getDirectionAnchorDegree(direction));
    const expression = getActorTraversalExpression(direction, 1);
    
    actorTraversalRhythmIndex = 0;
    actorTraversalSameDirCount = 1;
    actorTraversalPersistencePhase = 0;
    
    if (!actorTraversalVoice.isActive || isStart) {
      actorTraversalVoice.start(note.frequency, actorTraversalMelodyOptions.velocity);
    } else {
      actorTraversalVoice.glideTo(note.frequency, actorTraversalMelodyOptions.turnGlideTime);
    }
    
    actorTraversalVoice.setExpression({
      ...expression,
      width: expression.width * 0.7,
      level: expression.level * 0.96,
    }, { immediate: isStart });
    
    actorTraversalPrevDirection = direction;
    
    return note;
  };
  
  const shouldPlayActorTraversalStep = () => {
    const step = actorTraversalRhythmPattern[actorTraversalRhythmIndex % actorTraversalRhythmPattern.length] ?? 1;
    actorTraversalRhythmIndex++;
    return step === 1;
  };
  
  const getActorTraversalNodeNote = ({ x = 0, y = 0 } = {}) => {
    const index = Math.abs((x ?? 0) + (y ?? 0)) % actorTraversalSequence.length;
    return actorTraversalSequence.noteAt(index);
  };
  
  const playActorTeleportGliss = (fromNode, toNode) => {
    if (!fromNode || !toNode) {
      return;
    }
    
    clearActorTraversalTeleportTimer();
    
    const sourceNote = getActorTraversalNodeNote(fromNode.point);
    const destinationNote = getActorTraversalNodeNote(toNode.point);
    
    if (actorTraversalVoice.isActive) {
      actorTraversalVoice.glideTo(sourceNote.frequency, 0.025);
    } else {
      actorTraversalVoice.start(sourceNote.frequency, actorTraversalMelodyOptions.velocity);
    }
    
    actorTraversalVoice.setExpression({
      brightness: 0.28,
      warmth: 0.18,
      width: 0.18,
      level: 0.46,
      pan: 0,
    }, { immediate: true });
    
    actorTraversalTeleportTimer = window.setTimeout(() => {
      actorTraversalVoice.glideTo(destinationNote.frequency, actorTraversalMelodyOptions.teleportGlideTime);
      actorTraversalTeleportTimer = null;
    }, actorTraversalMelodyOptions.teleportLeadTime);
    
    actorTraversalPrevDirection = null;
    actorTraversalRhythmIndex = 0;
    actorTraversalSameDirCount = 0;
    actorTraversalPersistencePhase = 0;
  };
  
  const handleActorTraversalMove = ({ prevPoint, point } = {}) => {
    const direction = getDirectionFromPoints(prevPoint, point);
    
    if (!direction) {
      return { direction: null, didTurn: false, played: false };
    }
    
    if (!actorTraversalVoice.isActive || actorTraversalPrevDirection === null) {
      reanchorActorTraversalMelody(direction, { isStart: true });
      return { direction, didTurn: true, played: true };
    }
    
    if (actorTraversalPrevDirection !== direction) {
      reanchorActorTraversalMelody(direction);
      return { direction, didTurn: true, played: true };
    }
    
    actorTraversalSameDirCount++;
    actorTraversalPersistencePhase += clamp(0.66 + (actorTraversalSameDirCount * 0.085), 0.66, 1.08);
    
    if (!shouldPlayActorTraversalStep()) {
      return { direction, didTurn: false, played: false };
    }
    
    const note = actorTraversalSequence.next();
    const expression = getActorTraversalExpression(direction, actorTraversalSameDirCount);
    const glideTime = actorTraversalMelodyOptions.glideTime * expression.glideScale;
    
    actorTraversalVoice.setExpression(expression);
    actorTraversalVoice.glideTo(note.frequency, glideTime);
    actorTraversalVoice.articulate({
      depth: expression.articulationDepth,
      bloom: expression.articulationBloom,
      dipTime: 0.011,
      recoverTime: 0.16,
      settleTime: 0.3,
    });
    
    return { direction, didTurn: false, played: true };
  };
  
  /**
   * END Actor Traversal Melody Logic
   */
  
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
      point: { x: 0, y: 0 },
    },
  });
  
  entityCollection.createDarkSun({
    type: 'dark-sun',
    id: 'darksun1',
    properties: {
      moving: false,
      teleporting: false,
      point: { x: 10, y: 21 },
    },
  });
  
  selectMapById = selectMapById ?? await initMapControls(graphModel, svgCanvas);
  
  svgCanvas.setCanvasDimensions({ width: innerWidth, height: innerHeight });
  
  //! start binding
  
  
  
  const graphEvents = {
    events: [],
    duration: 0,
    start: performance.now(),
  };
  
  window.graphEvents = graphEvents;
  //! start binding
  subscriptions.set(
    'world',
    sceneModel.out({})
    .pipe(
      timestamp(),
      map(({ timestamp, value }) => ({
        ...value,
        timestamp,
        time: performance.now(),
      })),
      scan((state, event) => {
        state[event.type] = state[event.type] ? state[event.type] + 1 : 1;
        state.events.push(event);
        state.end = event.time;
        state.duration = event.time - state.start;
        
        return state;
      }, graphEvents),
      
    )
    // .subscribe(e => {
    
    // })
  );
  
  // navigator.clipboard.writeText(JSON.stringify(graphEvents, null, 2));
  
  subscriptions.set(
    'mapLoad',
    graphModel.out({ type: 'map:load' }).subscribe(e => {
      const { width, height, nodes, startNode } = e.data;
      endActorTraversalMelody();
      
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
      
      entityCollection.entities.forEach((entity) => {
        sceneModel.resolver.syncEntityPosition(entity.id, entity.point);
      });
      
      svgCanvas.layers.surface.setAttribute('transform', `translate(${Math.floor((graphModel.width + 2) / 2) - 0.3}, ${Math.floor((graphModel.height + 2) / 2) - 0.25})`);
      svgCanvas.layers.surface.querySelector('#surface-map-name').setAttribute('transform', `translate(0, ${-((graphModel.height / 2)) - 3}) scale(0.4)`);
    }));
  
  subscriptions.set(
    'nodeUpdates',
    graphModel.out({ type: 'node:update' }).pipe(
      map(projectNodePatchToRenderPatch),
      tap(renderPatch => {
        tileLayer.applyRenderPatch(renderPatch);
      })
    ).subscribe()
  );
  
  subscriptions.set(
    'actorRender',
    entityCollection.out({
      type: 'actor',
      filter: ({ id, type }) => {
        return entityCollection.get(id).type === 'actor';
      }
    })
    .subscribe((event) => {
      // console.warn('actorRender', event);
      const actor1Model = entityCollection.get('actor1');
      if (event.type === 'actor:update') {
        const actor1 = objectLayer.get(event.id);
        
        if (!actor1) return;
        
        const currRotate = actor1.transforms.rotation;
        
        actor1.update({
          ...event.data,
        });
        
        return;
      }
      
      if (event.type === 'actor:move') {
        if (!actor1) return;
        actor1.update({ x: event.point.x, y: event.point.y });
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
        actor1.update({ x: point.x, y: point.y, teleporting: false });
      }
    })
  );
  
  const darkSunNotes = [
    { frequency: 246.94, velocity: 0.175 },
    { frequency: 329.25, velocity: 0.125 },
    { frequency: 234.96, velocity: 0.15 },
  ];
  
  const cMajorTriad = [
    { frequency: 261.63, velocity: 0.175 },
    { frequency: 329.63, velocity: 0.125 },
    { frequency: 392, velocity: 0.15 },
  ];
  
  subscriptions.set(
    'darksunTravel',
    entityCollection.out({
      type: 'traversal:start',
      filter: ({ id, type }) => entityCollection.get(id).type === 'dark-sun'
    }).subscribe(async (event) => {
      // console.warn('event', JSON.stringify(event, null, 2));
      const { id, point, goalPoint } = event;
      const entity = entityCollection.get(id);
      const curr = graphModel.getNodeAtPoint(point) || {};
      
      for (let { frequency, velocity } of darkSunNotes) {
        const index = darkSunNotes.findIndex(_ => _.frequency === frequency);
        const mod = index * 3;
        const delay = mod * 25;
        
        await sleep(delay);
        
        // playChord({ point: curr.point, });
        playChordLong({ point: curr.point, });
        
      }
    })
  );
  
  let neighborIndex = 0;
  
  subscriptions.set(
    'actorTravel',
    entityCollection.out({
      type: 'traversal:start',
      filter: ({ id, type }) => entityCollection.get(id).type === 'actor',
    }).subscribe(async ({ point, goalPoint, id }) => {
      startActorTraversalMelody();
      const curr = graphModel.getNodeAtPoint(point);
      const goal = graphModel.getNodeAtPoint(goalPoint);
      console.warn('tileLayer.get(`${goalPoint.x}_${goalPoint.y}`)', `${tileLayer.get(`${goalPoint.x}_${goalPoint.y}`).toJSON()})`);
      
      // graphModel.findNodes(n => n.active === true).forEach(_ => _.update({ active: false }));
      // tileLayer.objects.filter(n => n.active === true).forEach(_ => _.update({ active: false }));
      tileLayer.forEach(_ => _.update({ active: false }));
      tileLayer.get(`${goalPoint.x}_${goalPoint.y}`).update({ active: true });
      // goal.update({ active: true });
      
      await sleep(50);
      
      playChord({ point: curr.point, });
      // audioNote1(curr, { forceNewNote: true });
    })
  );
  
  subscriptions.set(
    'actorMove',
    sceneModel.out({
      type: 'spatial:move',
      filter: ({ id }) => entityCollection.get(id).type === 'actor',
    })
    .subscribe(async ({ id, point, prevPoint, ...rest }) => {
      const node = graphModel.getNodeAtPoint(point);
      const prevNode = graphModel.getNodeAtPoint(prevPoint);
      const entity = entityCollection.get(id);
      const isTeleportJump = !!(
        prevNode?.tileType === 'teleport' &&
        prevNode?.target &&
        prevNode.target.x === point.x &&
        prevNode.target.y === point.y
      );
      const moveState = isTeleportJump ? { direction: null, didTurn: false, played: true } :
        handleActorTraversalMove({ prevPoint, point });
      const direction = moveState.direction ?? getDirectionFromPoints(prevPoint, point);
      
      if (node.tileType === 'map-link' && node.linkedMap) {
        const { linkedMap } = node;
        endActorTraversalMelody();
        await selectMapById(linkedMap);
        entity.stop();
        return;
      }
      
      if (isTeleportJump) {
        playActorTeleportGliss(prevNode, node);
      }
      
      const _neighbors = [...graphModel.getNeighbors(node).entries()];
      const n1 = _neighbors.slice(0, neighborIndex);
      const n2 = _neighbors.slice(neighborIndex);
      const neighbors = [...n1, ...n2];
      
      neighborIndex = neighborIndex >= 3 ? 0 : neighborIndex + 1;
      
      setCurrentNode(node.data());
      
      if (moveState.didTurn) {
        playChord({ point: node.point, });
      }
      
      objectLayer.get(id)?.update({ point: node.point, teleporting: rest.teleporting ?? false });
      
      let cnt = 0;
      
      for (const [nDir, neighbor] of neighbors) {
        cnt++;
        
        setTimeout(() => {
          const propKey = direction !== nDir ? 'isPathNode' : 'highlight';
          const tile = tileLayer.get(neighbor.id);
          tile.toggle({
            [propKey]: true
          }, { time: 1600 });
          // tile.update({
          //   [propKey]: true,
          // });
          
          // setTimeout(() => {
          //   tile.update({
          //     [propKey]: false,
          //   });
          // }, 1600);
        }, 0 + (100 * cnt));
      }
    })
  );
  
  subscriptions.set(
    'actorTraversalEnd',
    entityCollection.out({
      filter: ({ id, type }) => {
        return entityCollection.get(id)?.type === 'actor' && ['traversal:stop', 'traversal:goal', 'traversal:idle'].includes(type);
      },
    }).subscribe((event) => {
      endActorTraversalMelody();
      objectLayer.get(event.id)?.update({ teleporting: false });
      tileLayer.forEach(_ => _.update({ active: false }));
      
    })
  );
  
  // TODO: Move to audio
  subscriptions.set(
    'actorBlocked',
    sceneModel.out({
      type: 'spatial:blocked',
      filter: ({ id }) => entityCollection.get(id)?.type === 'actor',
    }).subscribe(() => {
      endActorTraversalMelody();
    })
  );
  
  subscriptions.set(
    'darkSunMove',
    sceneModel.out({
      type: 'spatial:move',
      filter: ({ id }) => entityCollection.get(id).type === 'dark-sun',
    }).subscribe(async (event) => {
      const { id, point, ...rest } = event;
      const node = graphModel.getNodeAtPoint(point);
      const actorModel = entityCollection.get('actor1') ?? entityCollection.actors[0];
      let velocity = 0.2;
      
      if (actorModel) {
        const distance = Math.hypot(
          (node.point.x ?? 0) - (actorModel.x ?? actorModel.point?.x ?? 0),
          (node.point.y ?? 0) - (actorModel.y ?? actorModel.point?.y ?? 0),
        );
        if (distance >= 10) {
          objectLayer.get(id)?.update({ point: node.point, teleporting: rest.teleporting ?? false });
          return;
        }
        
        const proximity = 1 - (distance / 10);
        const easedProximity = proximity * proximity * (3 - (2 * proximity));
        
        velocity = easedProximity * 0.55;
      }
      
      objectLayer.get(id)?.update({ point: node.point, teleporting: rest.teleporting ?? false });
      
      playChordLong({ point: node.point, crossfade: 0.0, velocity });
    })
  );
  
  subscriptions.set(
    'collision',
    sceneModel.out({ type: 'interaction:collision' })
    .subscribe(async (event) => {
      const { point, entering, actors } = event;
      const newOccupant = entityCollection.get(entering);
      const node = tileLayer.get(graphModel.pointToAddress(point));
      
      if (!newOccupant || newOccupant.type !== 'dark-sun' || !node) {
        return;
      }
      
      const dso = objectLayer.get(entering);
      if (!dso) {
        return;
      }
      dso.toggle({ point, recoiling: true }, { time: 150 });
      
      node.toggle({ recoiling: true }, { time: 500 });
      
      actors.forEach(async (id) => {
        const a = objectLayer.get(id);
        if (a === dso) return;
        
        await sleep(180);
        a.recoil(500);
        
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
      loopEngine.start();
    }
    
    if (newVal === false && oldVal === true) {
      loopEngine.pause();
    }
  }, { immediate: true });
  
  const unsubscribeSelectionBox = selectionBox.on('selection', ({ type, points, ...range }) => {
    const { start, end } = range;
    selectedRange = graphModel.getRange({ type, points, ...range });
    
    contextMenu.update({ x: start.x, y: start.y - 2 }).show();
  });
  
  
  //! end 1bindings
  
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
  
  const handleTileClick = async ({ type, detail }) => {
    
    if (!isRunning.value) return;
    if (contextMenu.isVisible) {
      blurContextMenu();
      return;
    };
    
    if (isSelectingLinkTile === true) return;
    
    if (!type || type !== 'tile:click') {
      console.warn('NON TILE CLICK, RETURNING FROM LOOP', type, detail);
      return;
    }
    
    const prevGoal = graphModel.findNode(n => n.current === true);
    
    if (prevGoal) {
      // prevGoal.update({ active: false })
    }
    
    const goalNode = graphModel.getNodeByAddress(detail.id);
    
    if (!goalNode || !goalNode.isTraversable) {
      console.warn('NO GOAL OR GOAL NOT TRAVERSABLE. Early return');
      console.warn(goalNode?.id, goalNode?.isTraversable);
      entityCollection.get('actor1').stop();
      
      return;
    }
    
    await ensureTraversalAudioReady();
    entityCollection.get('actor1').travelTo(goalNode.point);
    playChord({ point: goalNode.point, forceNewNote: true });
    
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
    
    targetNode.update({ selected: true });
    
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
    } else if (isRunning.value) {
      // blurContextMenu();
      handleTileClick(e);
    } else {
      handleEditTileClick(targetNode);
    }
  });
  
  svgCanvas.addEventListener('tile:contextmenu', (e) => {
    const targetNode = graphModel.getNodeByAddress(e.detail.id);
    console.warn('CONTEXT MENU');
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
    endActorTraversalMelody();
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
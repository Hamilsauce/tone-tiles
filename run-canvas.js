import { getDirectionFromPoints } from './core/spatial/utils.js';
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
import { ContextMenu } from './canvas/ContextMenu.js';
import { watch, toValue } from 'vue';
import { useMapStore } from './store/map.store.js';
import { projectNodePatchToRenderPatch } from './core/projections/node-to-tile.projector.js';
import { rxjs } from 'rxjs';
const { operators } = rxjs;
const { map, tap, filter } = operators;


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
  let canvasEl;
  let svgCanvas;
  let sceneObj;
  let tileLayer;
  let objectLayer;
  let actor1;
  let selectionBox;
  let contextMenu;
  let selectMapById;

  const loopEngine = new LoopEngine({
    audioContext: audioEngine.ctx,
  });

  let mapStore = useMapStore();
  mapId = mapId && mapId.value ? mapId.value : mapId;
  const { isRunning, setCurrentNode } = useAppState();

  // TODO - Move into scene/init
  graphModel = getGraphModel({ loopEngine });
  entityCollection = new EntityCollection({ loopEngine });

  // will be init'd in run time when that happens
  sceneModel = new SceneModel({
    loopEngine,
    inputs$: [
      { name: 'graph', source$: graphModel.output$ },
      { name: 'entity', source$: entityCollection.output$ },
    ],
  });

  canvasEl = document.querySelector('#canvas');
  svgCanvas = new SVGCanvas(canvasEl);
  sceneObj = svgCanvas.scene;
  tileLayer = sceneObj.getLayer('tile');
  objectLayer = sceneObj.getLayer('object');
  selectionBox = getTileSelector(objectLayer.dom);

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

  const getRange = ({ start, end }) => {
    let range = [];

    deselectRange();

    for (let x = start.x; x < end.x; x++) {
      for (let y = start.y; y < end.y; y++) {
        const tile = tileAt(x, y);
        const t = graphModel.getNodeAtPoint({ x, y });
        t.update({ selected: true });

        range.push(tile);
      }
    }

    return range;
  };

  contextMenu = contextMenu ?? new ContextMenu(svgCanvas);
  contextMenu.disableItem('copy');
  objectLayer.add(contextMenu ?? new ContextMenu(svgCanvas)).dom;

  if (entityCollection.has('actor1')) {
    entityCollection.remove('actor1');
  }

  const unsubscribeEntityCreate = entityCollection.connect('entity:create').subscribe(e => {
    console.warn('entity create event', e);
    const canvasEntity = objectLayer.add({
      id: e.id,
      type: e.data?.type ?? 'actor',
      model: {
        ...e.data,
        x: e.data?.point?.x ?? e.data?.x ?? 0,
        y: e.data?.point?.y ?? e.data?.y ?? 0,
      },
      transforms: [
        { type: 'translate', values: [0, 0], position: 0 },
        { type: 'rotate', values: [0, 0.5, 0.5], position: 1 },
        { type: 'scale', values: [1, 1], position: 2 },
      ],
    });

    if (e.id === 'actor1') {
      actor1 = canvasEntity;
    }
  });

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
      point: { x: 1, y: 0 },
    },
  });
  selectMapById = selectMapById ?? await initMapControls(graphModel, svgCanvas);

  svgCanvas.setCanvasDimensions({ width: innerWidth, height: innerHeight });

  //! start binding

  const unsubscribeMapLoad = graphModel.connect('map:load').subscribe(e => {
    const { width, height, nodes, startNode } = e.data;
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

    graphModel.moveObject(actor1Model.id, startNode.point);
    svgCanvas.layers.surface.setAttribute('transform', `translate(${Math.floor((graphModel.width + 2) / 2) - 0.3}, ${Math.floor((graphModel.height + 2) / 2) - 0.25})`);
    svgCanvas.layers.surface.querySelector('#surface-map-name').setAttribute('transform', `translate(0, ${-((graphModel.height / 2)) - 3}) scale(0.4)`);
  });

  let rowcnt = 0

  const unsubscribeNodeUpdates = graphModel.connect('node:update')
    .pipe(
      map(projectNodePatchToRenderPatch),
      tap(renderPatch => {

        tileLayer.applyRenderPatch(renderPatch);
      })
    ).subscribe();

  const unwatch = watch(mapStore.currentMap, (newMap, oldMap) => {
    if (!newMap.id) return;

    const mapData = toValue(newMap);

    graphModel.fromMap(mapData);
  }, { immediate: true });

  const unsubscribeSelectionBox = selectionBox.on('selection', ({ type, points, ...range }) => {
    const { start, end } = range;

    selectedRange = graphModel.getRange({ type, points, ...range });

    contextMenu.update({ x: start.x, y: start.y - 2 }).show();
  });

  const unsubscribeActorRender = entityCollection.connect('actor')
    .pipe(filter(({ id }) => id === 'actor1'))
    .subscribe((event) => {
      const actor1Model = entityCollection.get('actor1');

      if (event.type === 'actor:update') {
        if (!actor1) return;

        const currRotate = actor1.transforms.rotation;
        actor1.update({
          ...event.data,
          x: event.data?.point?.x ?? event.data?.x,
          y: event.data?.point?.y ?? event.data?.y,
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
        actor1.update({ x: point.x, y: point.y });

        graphModel
          .findAll({ active: true })
          .forEach(_ => _.update({ active: false }));
      }
    });

  const unsubscribeActorTravel = entityCollection.connect('traversal:start')
    .pipe(filter(({ id }) => id === 'darksun1'))
    .subscribe(async ({ point, goalPoint }) => {

      const curr = graphModel.getNodeAtPoint(point);

      audioNote1(curr, { forceNewNote: true });

    });

  let neighborIndex = 0;

  const unsubscribeActorMove = entityCollection.connect('traversal:move')
    .subscribe(async ({ id, point, prevPoint }) => {
      // need to separate Actor Model from canvas object
      // have actor1 model emit this, and then

      const dir = getDirectionFromPoints(point, prevPoint);
      const node = graphModel.getNodeAtPoint(point);
      const entity = entityCollection.get(id);

      if (node.linkedMap) {
        const { linkedMap } = node;
        await selectMapById(linkedMap);
        entity.stop();
      }

      graphModel.moveObject(id, point, prevPoint);

      let _neighbors = [...graphModel.getNeighbors(node).entries()];
      let n1 = _neighbors.slice(0, neighborIndex);
      let n2 = _neighbors.slice(neighborIndex);

      const neighbors = [...n1, ...n2];
      neighborIndex = neighborIndex >= 3 ? 0 : neighborIndex + 1;

      setCurrentNode(node.data());

      if (id === 'actor1') {
        audioNote1(node);
      }

      objectLayer.get(id)?.update({ point: node.point });

      let cnt = 0;

      for (const [nDir, neighbor] of neighbors) {
        cnt++;

        setTimeout(() => {
          const propKey = dir !== nDir ? 'isPathNode' : 'highlight';
          neighbor.update({
            [propKey]: true
          });

          setTimeout(() => {
            neighbor.update({
              [propKey]: false
            });
          }, 3000);
        }, 0 + (100 * cnt));
      }

    });

  //! end 1bindings

  loopEngine.start();

  const blurContextMenu = (e) => {
    const edgeLines = [...objectLayer.dom.querySelectorAll('.edge-line')];
    console.warn('edgeLines', edgeLines);
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

    entityCollection.get('actor1').travelTo(goalNode.point);
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
      blurContextMenu();
      handleTileClick(e);
    } else {
      handleEditTileClick(targetNode);
    }
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
    unsubscribeActorRender.unsubscribe();
    unsubscribeSelectionBox();
    entityCollection.get('actor1')?.destroy();
    loopEngine.destroy();
    unsubscribeMapLoad();
    unsubscribeEntityCreate()
    unsubscribeNodeUpdates();
    unsubscribeActorMove();
    unsubscribeActorTravel();
    unwatch();
    svgCanvas.destroy();
    svgCanvas = null;
    entityCollection.remove('actor1');
    graphModel.clear();
    window.graph = undefined;
    console.warn('RUNCANVAS : CANCEL');
  };
};
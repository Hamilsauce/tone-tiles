import getGraph, { getDirectionFromPoints } from './lib/graph.model.js';
import getGraphModel from './model/graph.model.js';
import { SVGCanvas } from './canvas/SVGCanvas.js';
import { getTileSelector } from 'https://hamilsauce.github.io/svg-range-selector/tile-selector.js';
import { initMapControls } from './ui/map-selection.js';
import { useAppState } from './store/app.store.js';
import { frameRate } from './lib/frame-rate.js';
import { AudioClockLoop } from './lib/loop-engine.js';
import { audioEngine } from './audio/index.js';
import audioNote1 from './audio/fire-audio-note1.js';
import { ContextMenu } from './canvas/ContextMenu.js';
import { watch, toValue } from 'vue';
import { useMapStore } from './store/map.store.js';
import { rxjs } from 'rxjs';
import { projectNodePatchToTilePatch } from './core/projections/node-to-tile.projector.js';

const { fromEvent, operators } = rxjs;
const { map, tap, filter, shareReplay, distinctUntilChanged } = operators;


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
  let graph;
  let graphModel;
  let canvasEl;
  let svgCanvas;
  let sceneObj;
  let tileLayer;
  let objectLayerObj;
  let objectLayer;
  let selectionBox;
  let contextMenu;
  let selectMapById;
  const loopEngine = new AudioClockLoop({
    audioContext: audioEngine.ctx,
  });

  let mapStore = useMapStore();

  mapId = mapId && mapId.value ? mapId.value : mapId;
  const { isRunning, setRunning, setFrameRate, setCurrentNode } = useAppState();

  graph = getGraph();
  graphModel = getGraphModel();

  canvasEl = document.querySelector('#canvas');
  svgCanvas = new SVGCanvas(canvasEl);
  sceneObj = svgCanvas.scene;
  tileLayer = sceneObj.getLayer('tile');
  objectLayerObj = sceneObj.getLayer('object');
  objectLayer = objectLayerObj.dom;
  selectionBox = getTileSelector(objectLayer);

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
  objectLayerObj.add(contextMenu ?? new ContextMenu(svgCanvas)).dom;

  const actor1 = objectLayerObj.add({
    type: 'actor',
    model: {
      id: 'actor1',
      moving: false,
      teleporting: false,
    },
    transforms: [
      { type: 'translate', values: [0, 0], position: 0 },
      { type: 'rotate', values: [0, 0, 0], position: 1 },
      { type: 'scale', values: [1, 1], position: 2 },
    ],
  }).configure({
    // graph,
    graph: graphModel,
    addRoutine: loopEngine.addRoutine.bind(loopEngine),
    // onCurrentNode: (node) => setCurrentNode(node.data()),
  });

  selectMapById = selectMapById ?? await initMapControls(graphModel, svgCanvas);

  svgCanvas.setCanvasDimensions({ width: innerWidth, height: innerHeight });

  //! start binding

  const unsubscribeMapLoad = graphModel.connect('map:load')
    .subscribe(e => {
      const { width, height, nodes, startNode } = e.data;
      selectionBox.setBounds({
        minX: 0,
        minY: 0,
        maxX: graphModel.width,
        maxY: graphModel.height
      });

      svgCanvas.scene.getLayer('tile').loadTileSet({ width, height, nodes, startNode });
      actor1.resetTraversal(startNode);
      svgCanvas.layers.surface.setAttribute('transform', `translate(${Math.floor((graphModel.width + 2) / 2) - 0.3}, ${Math.floor((graphModel.height + 2) / 2) - 0.25})`);
      svgCanvas.layers.surface.querySelector('#surface-map-name').setAttribute('transform', `translate(0, ${-((graphModel.height / 2)) - 3}) scale(0.4)`);
    });
  // const unsubscribeMapLoad = graphModel.on('map:load', async ({ width, height, nodes, startNode }) => {
  //   selectionBox.setBounds({
  //     minX: 0,
  //     minY: 0,
  //     maxX: graphModel.width,
  //     maxY: graphModel.height
  //   });

  //   svgCanvas.scene.getLayer('tile').loadTileSet({ width, height, nodes, startNode });
  //   actor1.resetTraversal(startNode);
  //   svgCanvas.layers.surface.setAttribute('transform', `translate(${Math.floor((graph.width + 2) / 2) - 0.3}, ${Math.floor((graph.height + 2) / 2) - 0.25})`);
  //   svgCanvas.layers.surface.querySelector('#surface-map-name').setAttribute('transform', `translate(0, ${-((graph.height / 2)) - 3}) scale(0.4)`);
  // });

  // const unsubscribeNodeUpdate = graph.on('node:update', async (payload) => {
  //   tileLayer.applyNodePatch(payload);
  // });

  const unsubscribeNodeUpdates = graphModel.connect('node:update')
    .pipe(
      map(projectNodePatchToTilePatch),
      tap(action => {
        tileLayer.applyTilePatch(action);
      })
    ).subscribe();


  const unwatch = watch(mapStore.currentMap, (newMap, oldMap) => {
    if (!newMap.id) return;

    const mapData = toValue(newMap);

    graphModel.fromMap(mapData);
  }, { immediate: true });



  // actor1.configure({
  //   graph,
  //   addRoutine: loopEngine.addRoutine.bind(loopEngine),
  //   onCurrentNode: (node) => setCurrentNode(node.data()),
  // });

  const unsubscribeSelectionBox = selectionBox.on('selection', ({ type, points, ...range }) => {
    const { start, end } = range;

    selectedRange = graphModel.getRange({ type, points, ...range });

    contextMenu.update({ x: start.x, y: start.y - 2 }).show();
  });


  const unsubscribeActorMapLink = actor1.on('actor:map-link', async ({ linkedMapId }) => {
    await selectMapById(linkedMapId);
  });

  const unsubscribeActorTravel = actor1.on('actor:travel', async ({ point, goalPoint }) => {

    const curr = graphModel.getNodeAtPoint(point);
    const goal = graphModel.getNodeAtPoint(goalPoint);
    // const curr = graph.getNodeAtPoint(point)
    // const goal = graph.getNodeAtPoint(goalPoint)
    goal.update({ active: true });

    audioNote1(curr, { forceNewNote: true });

  });
  let neighborIndex = 0;
  const unsubscribeActorMove = actor1.on('actor:move', async ({ id, point, prevPoint }) => {
    // need to separate Actor Model from canvas object
    // have actor1 model emit this, and then

    graphModel.moveObject(id, point, prevPoint); // fromNode, toNode);
    const dir = getDirectionFromPoints(point, prevPoint);
    const node = graphModel.getNodeAtPoint(point);
    let _neighbors = [...graphModel.getNeighbors(node).entries()];
    let n1 = _neighbors.slice(0, neighborIndex);
    let n2 = _neighbors.slice(neighborIndex);

    const neighbors = [...n1, ...n2];
    neighborIndex = neighborIndex >= 3 ? 0 : neighborIndex + 1;

    // console.warn('dir', dir)
    setCurrentNode(node.data());
    audioNote1(node);

    if (dir === 'up' || dir === 'left') {
      neighbors.reverse();
    }

    let cnt = 0;

    for (const [nDir, neighbor] of neighbors) {
      cnt++;
      // console.warn('node.id, nDir', node.id, nDir)
      // console.warn(dir === nDir)

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


  // const removeFrameRateRoutine = loopEngine.addRoutine((dt) => {
  //   setFrameRate(frameRate(dt * 1000));
  // });

  //! end 1bindings

  loopEngine.start();

  const blurContextMenu = (e) => {
    const edgeLines = [...objectLayer.querySelectorAll('.edge-line')];
    console.warn('edgeLines', edgeLines);
    edgeLines.forEach(el => {
      el.remove();
    });

    if (contextMenu.isVisible) {
      // deselectRange();
      selectionBox.remove();

      contextMenu.hide();
      contextMenu.toggleActions(false);
    }
  };

  const handleTileClick = async ({ type, detail }) => {
    if (!isRunning.value) return;
    console.warn('contextMenu.isVisible', contextMenu.isVisible);
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

    // const goalNode = graph.getNodeByAddress(detail.id);
    const goalNode = graphModel.getNodeByAddress(detail.id);

    if (!goalNode || !goalNode.isTraversable) {
      console.warn('NO GOAL OR GOAL NOT TRAVERSABLE. Early return');
      console.warn(goalNode?.id, goalNode?.isTraversable);
      actor1.stop();

      return;
    }

    actor1.travelTo(goalNode);
  };


  // const handleLineDrag = async (e) => {
  //   e.stopPropagation();
  //   e.preventDefault();

  //   const newPoint = domPoint(svgCanvas.scene.dom, e.clientX, e.clientY);
  //   selectedTileBeingLinked = targetNode;

  //   line.firstElementChild.setAttribute('x2', Math.floor(newPoint.x) + 0.5);
  //   line.firstElementChild.setAttribute('y2', Math.floor(newPoint.y) + 0.5);
  // }

  // const handleLineDragEnd = async (e) => {
  //   e.stopPropagation();
  //   e.preventDefault();

  //   const newPoint = domPoint(line.parentElement, e.clientX, e.clientY);
  //   const node = graph.getNodeAtPoint({ x: Math.floor(newPoint.x), y: Math.floor(newPoint.y) })
  //   // node.update({ active: true })
  //   line.firstElementChild.setAttribute('x2', node.x + 0.5);
  //   line.firstElementChild.setAttribute('y2', node.y + 0.5);

  //   handleTileLinkSelect({ nod fe }) //: { x: node.x, y: node.y } })


  // }

  const handleEditTileClick = async (targetNode) => {
    if (!targetNode) {
      console.warn('handleEditTileClick !targetnode',);
      blurContextMenu();
      return;
    }

    const { tileType, target, selected } = targetNode;

    if (tileType === 'teleport') {
      if (target) {
        // TODO: Make lines into Canvas Object
        const line = createEdgeLine(targetNode, target);

        objectLayer.append(line);

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
          // node.update({ active: true })
          line.firstElementChild.setAttribute('x2', node.x + 0.5);
          line.firstElementChild.setAttribute('y2', node.y + 0.5);

          handleTileLinkSelect({ node });
          blurContextMenu(); //: { x: node.x, y: node.y } })
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
    actor1.stop();
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
    unsubscribeActorMapLink();
    unsubscribeSelectionBox();
    actor1.destroy();
    loopEngine.destroy();
    // removeFrameRateRoutine();
    unsubscribeMapLoad();
    unsubscribeNodeUpdate();
    unwatch();
    svgCanvas.destroy();
    svgCanvas = null;
    graphModel.clear();
    window.graph = undefined;
    console.warn('RUNCANVAS : CANCEL');
  };
};

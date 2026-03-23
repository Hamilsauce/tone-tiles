import { Graph, TILE_TYPE_INDEX, getChordToneDegreeFromDir, getDirectionFromPoints } from './lib/graph.model.js';
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
import { ContextMenu } from './canvas/ContextMenu.js';


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

const fireAudioNote = (freq, vel, dur = 0.15) => (new AudioNote(audioEngine.ctx)
	.at(audioEngine.now)
	.frequencyHz(freq)
	.duration(dur)
	.velocity(vel).play()
	// .at(audioEngine.currentTime+0.1)
	// .velocity(0.005).play()
);

const ANIM_RATE = 105;

let graph;
let canvasEl;
let svgCanvas;
let scene;
let sceneObj;
let tileLayerObj;
let tileLayer;
let objectLayerObj;
let objectLayer;
let selectionBox;
let contextMenu;

export const runCanvas = async (mapId) => {
	mapId = mapId && mapId.value ? mapId.value : mapId;
	const { isRunning, setRunning } = useAppState();
	
	const graph = new Graph();
	
	const app = document.querySelector('#app');
	const floatingMenu = app.querySelector('#app-floating-menu');
	
	canvasEl = document.querySelector('#canvas');
	svgCanvas = new SVGCanvas(canvasEl);
	sceneObj = svgCanvas.scene;
	scene = sceneObj.dom;
	tileLayerObj = sceneObj.getLayer('tile');
	tileLayer = tileLayerObj.dom;
	objectLayerObj = sceneObj.getLayer('object');
	objectLayer = objectLayerObj.dom;
	selectionBox = getTileSelector(objectLayer);
	
	let selectedRange = [];
	let getSelectedRange = () => tileLayerObj.findAll({ tileType: 'selected' });
	
	const tileAt = (x, y) => tileLayerObj.getTileAt(x, y)
	
	const deselectRange = () => {
		getSelectedRange().forEach((t, i) => {
			t.update({ selected: false })
		});
	};
	
	const getRange = ({ start, end }) => {
		let range = [];
		
		deselectRange();
		
		for (let x = start.x; x < end.x; x++) {
			for (let y = start.y; y < end.y; y++) {
				const tile = tileAt(x, y);
				const t = graph.getNodeAtPoint({ x, y })
				t.update({ selected: true })
				
				range.push(tile);
			}
		}
		
		return range;
	};
	
	let audioNote1 // = (new AudioNote(audioEngine));
	
	contextMenu = contextMenu ?? new ContextMenu(svgCanvas)
	contextMenu.disableItem('copy')
	const actor1 = objectLayerObj.add({
		id: 'actor1',
		type: 'actor',
		moving: false,
		teleporting: false,
	}).dom
	
	const actor1TransformList = new TransformList(svgCanvas, actor1);
	
	const actor2 = useTemplate('actor', {
		dataset: { moving: false, teleporting: false },
		fill: '#C1723B',
		id: 'actor2',
	});
	
	const actor2TransformList = new TransformList(svgCanvas, actor2);
	
	const selectMapById = await initMapControls(graph, svgCanvas, actor1, selectionBox);
	
	actor2.setAttribute('transform', 'translate(12,21) rotate(0) scale(1)');
	
	svgCanvas.setCanvasDimensions({ width: innerWidth, height: innerHeight });
	
	const pointerup$ = fromEvent(svgCanvas, 'pointerup');
	
	pointerup$.pipe().subscribe();
	
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
	
	const getTileTone = (x, y, degree, arp = false) => {
		const deg = degree ?? getScaleDegree(x, y, arp)
		
		const pitch = arp ? harmonicCxt.chordNotes[deg] : harmonicCxt.notes[deg]
		return pitchToFrequency(pitch.pitch)
	}
	
	const getDynamicTone = (x, y, dir = 1) => {
		const mod = y > 5 ? -2 : 0;
		
		const pitchClass = getTileDegree(x, harmonicCxt.notes.length)
		const octave = getTileOctave(Math.min(y, 5), harmonicCxt.notes.length)
		
		const pitch = `${pitchClass}${octave + dir}`;
		
		return pitchToFrequency(pitch)
	}
	
	const _toTone = (x, y, deg) => (x % 2 && y % 2) ?
		getDynamicTone(x, y, 0) :
		getTileTone(x, y, deg, true)
	
	const toTone = (x, y, deg, arp) => getTileTone(x, y, deg, arp)
	
	let goalNode
	let dynamicCurr
	let intervalHandle
	
	let TRAVERSAL_GEN = graph.traverseHybrid(
		graph.startNode,
		() => goalNode
	);
	
	const handleTileClick = async ({ detail }) => {
		if (!isRunning.value) return;
		if (contextMenu.isVisible) return;
		if (isSelectingLinkTile === true) return;
		
		deselectRange();
		selectedRange = [];
		
		selectionBox.remove();
		
		goalNode = graph.getNodeByAddress(detail.id);
		
		if (!goalNode || !goalNode.isTraversable) {
			console.warn('NO GOAL OR GOAL NOT TRAVERSABLE. Early return');
			console.warn(goalNode.id, goalNode.isTraversable)
			
			return
		}
		
		let currentNode = goalNode;
		let linkedMapId = currentNode.linkedMap
		let activeActor;
		let actorTrans = activeActor === actor1 ? actor1TransformList : actor2TransformList;
		
		const actorTarget = actor1
		activeActor = actor1;
		
		graph.findAny({
			isPathNode: true,
			current: true,
			active: true,
			selected: true,
		}).forEach(_ => _.update({
			isPathNode: false,
			current: false,
			active: false,
			selected: false,
		}));
		
		currentNode.update({
			current: true,
			active: true,
		})
		
		if (intervalHandle) return
		
		let pointer = 0;
		let curr = currentNode;
		let prev = curr;
		
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
			
			intervalHandle = setInterval(async () => {
				curr = TRAVERSAL_GEN.next().value
				prev = currentNode;
				currentNode = curr;
				
				activeActor.dataset.moving = true;
				
				if (prev.tileType === 'teleport') {
					activeActor.dataset.teleporting = false;
				}
				
				if (!curr) {
					console.warn('no curr')
					return;
				} else {
					const travelDir = getDirectionFromPoints(prev, curr)
					const chordToneDegree = getChordToneDegreeFromDir(travelDir)
					
					{
						// AudioNote Block
						const freqX = ((curr.x + 2) * 2);
						const freqY = ((curr.y + 2) * 1.5);
						let freq = ((freqX) * (freqY)) * 1.5;
						freq = freq < 250 ? freq + 200 : freq;
						freq = freq > 1600 ? 1200 - freq : freq;
						freq = curr.tileType === 'teleport' ? freq + 100 : freq;
						
						let vel = (0.4 - (pointer / 4));
						vel = vel >= 0.4 ? 0.4 : vel;
						vel = vel <= 0.075 ? 0.075 : vel;
						vel = pointer % 2 === 0 ? 0.1 : 0.4;
						const dur = 2 / 4;
						const startMod = ((pointer || 1) * 0.01);
						
						try {
							freq = toTone(curr.x, curr.y, chordToneDegree)
							audioNote1 = fireAudioNote(freq, vel)
						} catch (e) {
							console.error('no audio note for you')
						}
					}
					
					const currTile = tileLayerObj.get(curr.address)
					
					activeActor.dataset.x = curr.x;
					activeActor.dataset.y = curr.y;
					
					actorTrans = activeActor === actor1 ? actor1TransformList : actor2TransformList;
					actorTrans.translateTo(curr.x, curr.y);
					
					const isLink = curr.tileType === 'map-link' || curr.tileType === 'start' && !!curr.linkedMap
					const isStartingNode = curr.tileType === 'start' //curr.id === currentNode.id
					
					if (isLink && !isStartingNode) {
						isMoving = false;
						activeActor.dataset.moving = isMoving;
						clearInterval(intervalHandle);
						intervalHandle = null
						
						selectMapById(linkedMapId)
						return
					}
					
					curr.update({ isPathNode: true })
					
					pointer++;
					
					if (curr.id === goalNode.id) {
						curr.update({ active: true, current: true })
						console.warn('----- GOAL FOUND -----');
					}
					
					if (curr.tileType === 'teleport') {
						actor1.dataset.teleporting = true;
						
						if (curr.id === currentNode.id) {
							curr.update({ active: false, current: false })
							
							return;
						}
						
						activeActor.dataset.x = curr.x;
						activeActor.dataset.y = curr.y;
						
						actorTrans = activeActor === actor1 ? actor1TransformList : actor2TransformList;
						actorTrans.translateTo(curr.x, curr.y);
						
						curr.update({ active: false, current: false })
						
						await sleep(10);
						shouldPreVel = !shouldPreVel
						activeActor.dataset.teleporting = false;
					}
					
					const reachedGoal = goalNode && currentNode.id === goalNode.id;
					
					if (reachedGoal) {
						isMoving = false;
						activeActor.dataset.moving = isMoving;
						clearInterval(intervalHandle);
						intervalHandle = null
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
		
		if (contextMenu.isVisible) {
			deselectRange();
			selectionBox.remove();
			
			contextMenu.hide();
			contextMenu.toggleActions(false);
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
		
		if (tileType === 'teleport') {
			const selectedNode = graph.getNodeAtPoint({
				x: +targ.dataset.x,
				y: +targ.dataset.y,
			});
			
			if (selectedNode.target) {
				const line = createEdgeLine(selectedNode, selectedNode.target);
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
			contextMenu.show()
			contextMenu.toggleActions(true);
		} else {
			contextMenu.toggleActions(false);
		}
		
		targ.dataset.selected = true;
		selectionBox.insertAt({ x: +targ.dataset.x, y: +targ.dataset.y });
		
		svgCanvas.addEventListener('tile:click', blurContextMenu);
	};
	
	
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
	
	svgCanvas.layers.tile.addEventListener('contextmenu', handleEditTileClick);
	
	let sourceRange = {}
	
	contextMenu.on('tile-action', data => {
		const selectedOptionValue = data.type;
		const selectedOptionType = data.type;
		const selectedTileTypeName = data.type;
		const selectedTile = svgCanvas.layers.tile.querySelector('.tile[data-selected="true"]');
		// console.warn('contextMenu.on(tile-action', { data })
		
		if (!selectedTile) return;
		
		const node = graph.getNodeAtPoint({
			x: +selectedTile.dataset.x,
			y: +selectedTile.dataset.y,
		});
		
		if (selectedOptionValue === 'copy') {
			sourceRange = selectedRange;
		}
		
		if (selectedOptionValue === 'link-teleport') {
			isSelectingLinkTile = true;
			svgCanvas.layers.tile.dataset.isSelectingLinkTile = true;
			
			selectedTileBeingLinked = node;
			
			return;
		}
		else {
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
		};
	});
	
	// await sleep(50)
	
	let hasSetListener = false
	
	selectionBox.on('selection', range => {
		selectedRange = getRange(range);
		// sourceRange = selectedRange;
		// console.warn({ selectedRange })
		
		const { start, end } = range;
		
		const middle = Math.abs(start.x - end.x);
		
		graph.getRange(range, (tile) => tile.selected = true);
		
		contextMenu.update({ x: start.x, y: start.y - 2 }).show();
		
		if (!hasSetListener) {
			
			selectionBox.dom.addEventListener('dblclick', e => {
				// console.warn({
				//   selectedRangeLength: selectedRange.length,
				//   sourceRangeLength: sourceRange.length,
				// })
				
				if (sourceRange) {
					selectedRange.forEach(item => {
						
						// console.warn({ item })
					})
				}
			});
		}
		
	});
};
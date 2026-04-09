import { CanvasObject, DefaultCanvasObjectOptions } from './CanvasObject.js';
import { CanvasPoint } from './CanvasPoint.js';
import { AudioNote } from '../audio/AudioNote.js';
import { getChordToneDegreeFromDir, getDirectionFromPoints } from '../lib/graph.model.js';
import { major7 } from '../MUSIC_THEORY_FUNCTIONS.js';

const DefaultCanvasActorModel = {
  x: 0,
  y: 0,
  moving: false,
  teleporting: false,
};

const sleep = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms));

const getRandomInt = (max = 4) => {
  return Math.floor(Math.random() * max);
};

const fireAudioNote = (audioContext, freq, vel, dur = 2) => {
  if (!audioContext || !freq) return null;

  return new AudioNote(audioContext)
    .at(audioContext.currentTime)
    .frequencyHz(freq)
    .duration(dur)
    .velocity(vel)
    .play();
};

export class CanvasActor extends CanvasObject {
  #graph = null;
  #loop = null;
  #removeRoutine = null;
  #traversalGen = null;
  #goalNode = null;
  #currentNode = null;
  #dtSum = 0;
  #pointer = 0;
  #prevDir = null;
  #audioContext = null;
  #audioNote = null;
  #getTone = () => null;
  #onCurrentNode = () => {};
  #onGoal = () => {};
  #isStepping = false;
  #idleReason = null;

  constructor(ctx, options = DefaultCanvasObjectOptions) {
    const model = {
      ...DefaultCanvasActorModel,
      ...(options.model ?? {}),
    };

    super(ctx, 'actor', {
      ...options,
      model,
    });

    this.stepTraversal = this.stepTraversal.bind(this);
  }

  get currentNode() { return this.#currentNode; }

  get currentPoint() {
    return this.#currentNode?.point ?? this.point;
  }

  get goalNode() { return this.#goalNode; }

  get goalPoint() {
    return this.#goalNode?.point ?? null;
  }

  get point() {
    return CanvasPoint.from(this.model);
  }

  configure({
    graph,
    loop,
    audioContext,
    getTone,
    onCurrentNode,
    onGoal,
  } = {}) {
    if (graph) {
      this.#graph = graph;
    }

    if (loop && loop !== this.#loop) {
      this.#removeRoutine?.();
      this.#loop = loop;
      this.#removeRoutine = this.#loop.addRoutine(this.stepTraversal);
    }

    if (audioContext) {
      this.#audioContext = audioContext;
    }

    if (typeof getTone === 'function') {
      this.#getTone = getTone;
    }

    if (typeof onCurrentNode === 'function') {
      this.#onCurrentNode = onCurrentNode;
    }

    if (typeof onGoal === 'function') {
      this.#onGoal = onGoal;
    }

    return this;
  }

  resetTraversal(startNode = this.#graph?.startNode) {
    this.#traversalGen?.return?.();
    this.#stopAudio(0.05);

    this.#goalNode = null;
    this.#dtSum = 0;
    this.#pointer = 0;
    this.#prevDir = null;
    this.#isStepping = false;
    this.#idleReason = null;
    this.#currentNode = startNode ?? null;

    if (this.#graph && this.#currentNode) {
      this.#traversalGen = this.#graph.traversePoints(
        this.#currentNode,
        () => this.#goalNode
      );
    } else {
      this.#traversalGen = null;
    }

    if (this.#currentNode) {
      this.update({
        x: this.#currentNode.x,
        y: this.#currentNode.y,
        moving: false,
        teleporting: false,
      });

      this.#onCurrentNode(this.#currentNode);
    }

    return this;
  }

  travelTo(goalNode) {
    if (!goalNode || !goalNode.isTraversable) {
      return false;
    }

    if (!this.#graph || !this.#loop) {
      throw new Error('CanvasActor must be configured with graph and loop before travel');
    }

    if (!this.#traversalGen || !this.#currentNode) {
      this.resetTraversal(this.#graph.startNode);
    }

    this.#clearTraversalState();
    this.#goalNode = goalNode;
    this.#idleReason = null;
    this.update({ moving: true, teleporting: false });
    this.emit('actor:travel', {
      actor: this,
      goalNode,
      goalPoint: goalNode.point,
    });
    this.#loop.start();

    return true;
  }

  stop({ pauseLoop = false, audioFade = 0.2 } = {}) {
    this.update({ moving: false, teleporting: false });
    this.#goalNode = null;
    this.#dtSum = 0;
    this.#idleReason = null;
    this.#stopAudio(audioFade);

    if (pauseLoop) {
      this.#loop?.pause();
    }

    this.emit('actor:stop', {
      actor: this,
      currentNode: this.#currentNode,
      currentPoint: this.currentPoint,
    });

    return this;
  }

  async stepTraversal(dt, currentTime) {
    if (!this.#traversalGen || !this.#goalNode) {
      return;
    }

    this.#dtSum += dt;
    if (this.#dtSum <= 0.1 || this.#isStepping) {
      return;
    }

    this.#dtSum = 0;
    this.#isStepping = true;

    try {
      const prev = this.#currentNode;
      const prevPoint = prev?.point ?? this.currentPoint;
      const currPoint = this.#traversalGen.next().value;

      if (!currPoint) {
        this.#enterIdle('no-node');
        return;
      }

      const curr = this.#graph?.getNodeByPoint(currPoint);

      if (!curr) {
        this.#enterIdle('missing-node');
        return;
      }

      this.#currentNode = curr;
      this.#onCurrentNode(curr);

      if (prevPoint?.equals(currPoint)) {
        this.#enterIdle('same-node');
        return;
      }

      this.#idleReason = null;

      if (prev && prev.tileType === 'teleport') {
        this.update({ teleporting: false });
      }

      this.#playStepTone(prev, curr);
      this.update({
        x: curr.x,
        y: curr.y,
        moving: true,
      });

      this.emit('actor:move', {
        actor: this,
        prevNode: prev,
        node: curr,
        prevPoint,
        point: currPoint,
      });

      const isLink = curr.tileType === 'map-link' || (curr.tileType === 'start' && !!curr.linkedMap);
      const linkedMapId = curr.linkedMap;

      if (linkedMapId && isLink) {
        this.stop();
        this.emit('actor:map-link', {
          actor: this,
          node: curr,
          point: currPoint,
          linkedMapId,
        });

        return;
      }

      curr.update({ isPathNode: true });
      this.#pointer++;

      if (this.#goalNode && curr.id === this.#goalNode.id) {
        curr.update({ active: true, current: true });
        this.emit('actor:goal', {
          actor: this,
          node: curr,
          goalNode: this.#goalNode,
          point: currPoint,
          goalPoint: this.goalPoint,
        });
        this.#onGoal(curr);
        this.stop();
        return;
      }

      if (curr.tileType === 'teleport') {
        this.update({ teleporting: true });
        curr.update({ active: false, current: false });
        this.emit('actor:teleport', {
          actor: this,
          node: curr,
          point: currPoint,
        });

        await sleep(10);
        this.update({ teleporting: false });
      }
    } catch (error) {
      this.emit('actor:error', { actor: this, error });
      this.stop();
    } finally {
      this.#isStepping = false;
    }
  }

  destroy() {
    this.#traversalGen?.return?.();
    this.#removeRoutine?.();
    this.#removeRoutine = null;
    this.#stopAudio(0.05);

    return super.destroy();
  }

  #clearTraversalState() {
    if (!this.#graph) return;

    this.#graph.nodes
      .filter(node => {
        const data = node.data();
        return data.isPathNode || data.current || data.active;
      })
      .forEach(node => {
        node.update({
          isPathNode: false,
          current: false,
          active: false,
        });
      });
  }

  #playStepTone(prev, curr) {
    if (!this.#audioContext) return;

    const travelDir = getDirectionFromPoints(prev?.point ?? prev, curr?.point ?? curr);
    const chordToneDegree = getChordToneDegreeFromDir(travelDir);
    const vel = this.#pointer % 2 === 0 ? 0.2 : 0.4;
    let freq = this.#getTone(curr.x, curr.y, chordToneDegree);

    if (!freq) return;

    if (!this.#audioNote) {
      this.#audioNote = fireAudioNote(this.#audioContext, freq, vel);
      this.#prevDir = travelDir;
      return;
    }

    if (curr.tileType === 'teleport') {
      this.#audioNote.stop(0.015);
      freq = major7(freq)[getRandomInt(4)];
      this.#audioNote = fireAudioNote(this.#audioContext, freq, vel);
      this.#prevDir = travelDir;
      return;
    }

    if (this.#prevDir !== travelDir) {
      this.#audioNote.stop(0.2);
      this.#audioNote = fireAudioNote(this.#audioContext, freq, vel);
    }

    this.#prevDir = travelDir;
  }

  #stopAudio(time = 0.2) {
    this.#audioNote?.stop(time);
    this.#audioNote = null;
  }

  #enterIdle(reason = 'idle') {
    if (this.model.moving) {
      this.update({ moving: false, teleporting: false });
    }

    if (this.#idleReason === reason) {
      return;
    }

    this.#idleReason = reason;
    this.emit('actor:idle', {
      actor: this,
      node: this.#currentNode,
      goalNode: this.#goalNode,
      point: this.currentPoint,
      goalPoint: this.goalPoint,
      reason,
    });
  }
}

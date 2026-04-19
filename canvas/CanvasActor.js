import { CanvasObject, DefaultCanvasObjectOptions } from './CanvasObject.js';
import { CanvasPoint } from './CanvasPoint.js';

const DefaultCanvasActorModel = {
  x: 0,
  y: 0,
  moving: false,
  teleporting: false,
};

const sleep = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms));

export class CanvasActor extends CanvasObject {
  #graph = null;
  #removeRoutine = null;
  #traversalGen = null;
  #goalNode = null;
  #currentNode = null;
  #point = null;
  #dtSum = 0;
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
    // console.warn('this.transforms', Object.entries(this.transforms.transforms).map(([k, v]) => [k, v.type]))
    
    setTimeout(() => {
      // this.scaleTo(0.5)
      // this.translateTo(0.25)
      console.log(' ', );
    }, 1000)
  }
  
  get currentNode() { return this.#currentNode; }
  // get point() { return this.#point; }
  get point() { return this.#currentNode.point; }
  
  get currentPoint() {
    return this.#currentNode?.point ?? this.point;
  }
  
  get goalNode() { return this.#goalNode; }
  
  get goalPoint() {
    return this.#goalNode?.point ?? null;
  }
  
  // get point() {
  //   return CanvasPoint.from(this.model);
  // }
  
  configure({
    graph,
    addRoutine,
    onGoal,
  } = {}) {
    if (graph) {
      this.#graph = graph;
    }
    
    if (addRoutine) {
      this.#removeRoutine?.();
      this.#removeRoutine = addRoutine(this.stepTraversal);
    }
    
    if (typeof onGoal === 'function') {
      this.#onGoal = onGoal;
    }
    
    return this;
  }
  
  resetTraversal(startNode = this.#graph?.startNode) {
    this.#traversalGen?.return?.();
    
    this.#goalNode = null;
    this.#dtSum = 0;
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
      // this.transforms.scaleTo(1)
      
      this.update({
        x: this.#currentNode.x,
        y: this.#currentNode.y,
        moving: false,
        teleporting: false,
      });
    }
    
    return this;
  }
  
  travelTo(goalNode) {
    if (!goalNode || !goalNode.isTraversable) {
      return false;
    }
    
    if (!this.#graph) {
      throw new Error('CanvasActor must be configured with graph before travel');
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
      point: this.currentPoint,
    });
    
    return true;
  }
  
  stop() {
    this.update({ moving: false, teleporting: false });
    this.transforms.scaleTo(1)
    
    this.#goalNode = null;
    this.#dtSum = 0;
    this.#idleReason = null;
    
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
      this.#point = currPoint;
      
      if (prevPoint?.equals(currPoint)) {
        this.#enterIdle('same-node');
        return;
      }
      
      this.#idleReason = null;
      
      if (prev && prev.tileType === 'teleport') {
        this.update({ teleporting: false });
      }
      
      this.update({
        x: curr.x,
        y: curr.y,
        moving: true,
      });
      this.transforms.scaleTo(0.7)

      this.emit('actor:move', {
        actor: this,
        prevNode: prev,
        node: curr,
        prevPoint,
        point: this.currentPoint,
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
      
      if (this.#goalNode && curr.id === this.#goalNode.id) {
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
  
  #enterIdle(reason = 'idle') {
    if (this.model.moving) {
      this.update({ moving: false, teleporting: false });
      this.transforms.scaleTo(1)
      
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
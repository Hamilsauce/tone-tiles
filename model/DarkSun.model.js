import { SpatialModel } from './Spatial.model.js';
import { CanvasPoint } from '../canvas/CanvasPoint.js';
import ham from 'ham';
const { sleep } = ham;
import {
  ActorError,
  ActorGoal,
  ActorIdle,
  ActorMapLink,
  ActorMove,
  ActorStop,
  ActorTeleport,
  ActorTravel,
} from '../core/actions/actor.actions.js';

const DefaultActorProperties = {
  type: 'actor',
  id: null,
  point: { x: 0, y: 0 },
  moving: false,
  teleporting: false,
  idleReason: null,
  goalPoint: null,
};

export class DarkSunModel extends SpatialModel {
  #world = {
    getStartNode: null,
    getNodeAtPoint: null,
    traversePoints: null,
    moveObject: null,
  };
  #removeRoutine = null;
  #goalPoint = null;
  #goalNode = null;
  #currentNode = null;
  #traversalGen = null;
  #dtSum = 0;
  #isStepping = false;
  #idleReason = null;
  
  constructor(options = {}) {
    const properties = {
      ...DefaultActorProperties,
      ...(options.properties ?? {}),
    };
    
    super({
      ...options,
      id: options.id ?? properties.id,
      type: options.type ?? properties.type,
      point: options.point ?? properties.point,
      properties,
    });
    
    this.#goalPoint = properties.goalPoint ? CanvasPoint.from(properties.goalPoint) : null;
    this.stepTraversal = this.stepTraversal.bind(this);
  }
  
  get moving() {
    return !!this.properties.moving;
  }
  
  get teleporting() {
    return !!this.properties.teleporting;
  }
  
  get idleReason() {
    return this.properties.idleReason ?? null;
  }
  
  get currentNode() {
    return this.#currentNode;
  }
  
  get currentPoint() {
    return this.#currentNode?.point ?? this.point;
  }
  
  get goalNode() {
    return this.#goalNode;
  }
  
  get goalPoint() {
    return this.#goalPoint;
  }
  
  bindWorld({
    getStartNode,
    getNodeAtPoint,
    traversePoints,
    moveObject,
  } = {}) {
    if (getStartNode) this.#world.getStartNode = getStartNode;
    if (getNodeAtPoint) this.#world.getNodeAtPoint = getNodeAtPoint;
    if (traversePoints) this.#world.traversePoints = traversePoints;
    if (moveObject) this.#world.moveObject = moveObject;
    
    return this;
  }
  
  bindLoop(addRoutine) {
    this.#removeRoutine?.();
    
    if (typeof addRoutine === 'function') {
      this.#removeRoutine = addRoutine(this.stepTraversal);
    }
    
    return this;
  }
  
  unbindLoop() {
    this.#removeRoutine?.();
    this.#removeRoutine = null;
    return this;
  }
  
  setGoalPoint(goalPoint = null) {
    this.#goalPoint = goalPoint ? CanvasPoint.from(goalPoint) : null;
    this.properties.goalPoint = this.#goalPoint;
    return this;
  }
  
  clearGoalPoint() {
    return this.setGoalPoint(null);
  }
  
  setMoving(value = true) {
    if (this.properties.moving === value) return this;
    this.update({ moving: value });
    return this;
  }
  
  setTeleporting(value = true) {
    if (this.properties.teleporting === value) return this;
    this.update({ teleporting: value });
    return this;
  }
  
  setIdleReason(reason = null) {
    if (this.properties.idleReason === reason) return this;
    this.#idleReason = reason;
    this.update({ idleReason: reason });
    return this;
  }
  
  moveTo(nextPoint, payload = {}) {
    const result = this.syncPoint(nextPoint);
    
    if (!result) {
      return null;
    }
    
    this.emitActorMove({
      prevPoint: result.prevPoint,
      point: result.point,
      ...payload,
    });
    
    return result.point;
  }
  
  resolveNode(candidate = this.point) {
    if (!candidate) return null;
    if (typeof candidate === 'object' && 'tileType' in candidate) return candidate;
    
    return this.#world.getNodeAtPoint?.(CanvasPoint.from(candidate)) ?? null;
  }
  
  requestMoveCommit(point, prevPoint) {
    return this.#world.moveObject?.(this.id, point, prevPoint) ?? null;
  }
  
  createTraversal(start = this.#currentNode ?? this.resolveNode(this.point), getGoal = () => this.#goalNode) {
    if (typeof this.#world.traversePoints !== 'function' || !start) {
      return null;
    }
    
    return this.#world.traversePoints(start, getGoal);
  }
  
  resetTraversal(startNode = this.#world.getStartNode?.()) {
    const start = this.resolveNode(startNode);
    
    this.#traversalGen?.return?.();
    this.#goalNode = null;
    this.clearGoalPoint();
    this.#dtSum = 0;
    this.#isStepping = false;
    this.#idleReason = null;
    this.#currentNode = start ?? null;
    this.#traversalGen = this.createTraversal(start, () => this.#goalNode);
    
    if (this.#currentNode) {
      this.syncPoint(this.#currentNode.point);
    }
    
    this.setMoving(false);
    this.setTeleporting(false);
    this.setIdleReason(null);
    
    return this;
  }
  
  travelTo(goalNode) {
    const goal = this.resolveNode(goalNode);
    
    if (!goal || !goal.isTraversable) {
      return false;
    }
    
    if (!this.#traversalGen || !this.#currentNode) {
      this.resetTraversal(this.#world.getStartNode?.());
    }
    
    this.#goalNode = goal;
    this.setGoalPoint(goal.point);
    this.setIdleReason(null);
    this.setMoving(true);
    this.setTeleporting(false);
    
    this.emitActorTravel({
      point: this.currentPoint,
      goalPoint: goal.point,
      goalNode: goal,
      currentNode: this.#currentNode,
    });
    
    return true;
  }
  
  stop() {
    this.#goalNode = null;
    this.clearGoalPoint();
    this.#dtSum = 0;
    this.#idleReason = null;
    
    this.setMoving(false);
    this.setTeleporting(false);
    this.setIdleReason(null);
    
    this.emitActorStop({
      currentNode: this.#currentNode,
      point: this.currentPoint,
    });
    
    return this;
  }
  
  async stepTraversal(dt) {
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
      const prevNode = this.#currentNode;
      const prevPoint = prevNode?.point ?? this.currentPoint;
      const currPoint = this.#traversalGen.next().value;
      
      if (!currPoint) {
        this.#enterIdle('no-node');
        return;
      }
      
      const currNode = this.resolveNode(currPoint);
      
      if (!currNode) {
        this.#enterIdle('missing-node');
        return;
      }
      
      this.#currentNode = currNode;
      
      if (prevPoint?.equals(currPoint)) {
        this.#enterIdle('same-node');
        return;
      }
      
      this.#idleReason = null;
      
      this.syncPoint(currPoint);
      this.setMoving(true);
      this.setIdleReason(null);
      
      if (prevNode?.tileType === 'teleport') {
        this.setTeleporting(false);
      }
      
      this.emitActorMove({
        prevNode,
        node: currNode,
        prevPoint,
        point: this.currentPoint,
      });
      
      const isLink = currNode.tileType === 'map-link' || (currNode.tileType === 'start' && !!currNode.linkedMap);
      const linkedMapId = currNode.linkedMap;
      
      if (linkedMapId && isLink) {
        this.emitActorMapLink({
          node: currNode,
          point: currPoint,
          linkedMapId,
        });
        this.stop();
        return;
      }
      
      if (this.#goalNode && currNode.id === this.#goalNode.id) {
        this.emitActorGoal({
          node: currNode,
          goalNode: this.#goalNode,
          point: currPoint,
          goalPoint: this.goalPoint,
        });
        this.stop();
        return;
      }
      
      if (currNode.tileType === 'teleport') {
        this.setTeleporting(true);
        this.emitActorTeleport({
          node: currNode,
          point: currPoint,
        });
        
        await sleep(10);
        this.setTeleporting(false);
      }
    } catch (error) {
      this.emitActorError(error);
      this.stop();
    } finally {
      this.#isStepping = false;
    }
  }
  
  destroy() {
    this.#traversalGen?.return?.();
    this.unbindLoop();
    return this;
  }
  
  emitActorTravel(payload = {}) {
    return this.#emitActorAction(ActorTravel, {
      ...payload,
      point: CanvasPoint.from(payload.point ?? this.point),
      goalPoint: CanvasPoint.from(payload.goalPoint ?? this.goalPoint),
    });
  }
  
  emitActorMove(payload = {}) {
    return this.#emitActorAction(ActorMove, {
      ...payload,
      point: CanvasPoint.from(payload.point ?? this.point),
      prevPoint: CanvasPoint.from(payload.prevPoint ?? this.point),
    });
  }
  
  emitActorIdle(reason = 'idle', payload = {}) {
    return this.#emitActorAction(ActorIdle, {
      ...payload,
      point: CanvasPoint.from(payload.point ?? this.point),
      goalPoint: payload.goalPoint ? CanvasPoint.from(payload.goalPoint) : this.goalPoint,
      reason,
    });
  }
  
  emitActorGoal(payload = {}) {
    return this.#emitActorAction(ActorGoal, {
      ...payload,
      point: CanvasPoint.from(payload.point ?? this.point),
      goalPoint: CanvasPoint.from(payload.goalPoint ?? this.goalPoint),
    });
  }
  
  emitActorMapLink(payload = {}) {
    return this.#emitActorAction(ActorMapLink, {
      ...payload,
      point: CanvasPoint.from(payload.point ?? this.point),
    });
  }
  
  emitActorTeleport(payload = {}) {
    return this.#emitActorAction(ActorTeleport, {
      ...payload,
      point: CanvasPoint.from(payload.point ?? this.point),
    });
  }
  
  emitActorStop(payload = {}) {
    return this.#emitActorAction(ActorStop, {
      ...payload,
      point: CanvasPoint.from(payload.point ?? this.point),
    });
  }
  
  emitActorError(error, payload = {}) {
    return this.#emitActorAction(ActorError, {
      error,
      ...payload,
    });
  }
  
  #enterIdle(reason = 'idle') {
    if (this.moving) {
      this.setMoving(false);
      this.setTeleporting(false);
    }
    
    if (this.#idleReason === reason) {
      return;
    }
    
    this.#idleReason = reason;
    this.setIdleReason(reason);
    this.emitActorIdle(reason, {
      node: this.#currentNode,
      goalNode: this.#goalNode,
      point: this.currentPoint,
      goalPoint: this.goalPoint,
    });
  }
  
  #emitActorAction(createActorAction, payload = {}) {
    const action = createActorAction({
      id: this.id,
      ...payload,
    });
    
    this.emit?.(action);
    return action;
  }
}
import { SpatialModel } from './Spatial.model.js';
import { CanvasPoint } from '../canvas/CanvasPoint.js';
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

export class ActorModel extends SpatialModel {
  #world = {
    getNodeAtPoint: null,
    traversePoints: null,
    moveObject: null,
  };
  #removeRoutine = null;
  #goalPoint = null;

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

  get goalPoint() {
    return this.#goalPoint;
  }

  bindWorld({
    getNodeAtPoint,
    traversePoints,
    moveObject,
  } = {}) {
    if (getNodeAtPoint) this.#world.getNodeAtPoint = getNodeAtPoint;
    if (traversePoints) this.#world.traversePoints = traversePoints;
    if (moveObject) this.#world.moveObject = moveObject;

    return this;
  }

  bindLoop(addRoutine, stepFn) {
    this.#removeRoutine?.();

    if (typeof addRoutine === 'function' && typeof stepFn === 'function') {
      this.#removeRoutine = addRoutine(stepFn);
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

  resolveNode(point = this.point) {
    return this.#world.getNodeAtPoint?.(CanvasPoint.from(point)) ?? null;
  }

  requestMoveCommit(point, prevPoint) {
    return this.#world.moveObject?.(this.id, point, prevPoint) ?? null;
  }

  createTraversal(start = this.point, getGoal) {
    if (typeof this.#world.traversePoints !== 'function') {
      return null;
    }

    return this.#world.traversePoints(start, getGoal);
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

  #emitActorAction(createActorAction, payload = {}) {
    const action = createActorAction({
      id: this.id,
      ...payload,
    });

    this.emit?.(action);
    return action;
  }
}

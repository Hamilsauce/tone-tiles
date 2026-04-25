import { SpatialModel } from './Spatial.model.js';
import { Point } from '../core/Point.js';
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

export class ActorModel extends SpatialModel {
  #world = {
    getStartPoint: null,
    getPointState: null,
    traversePoints: null,
  };
  #removeRoutine = null;
  #goalPoint = null;
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

    this.#goalPoint = properties.goalPoint ? Point.from(properties.goalPoint) : null;
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

  get currentPoint() {
    return this.point;
  }

  get goalPoint() {
    return this.#goalPoint;
  }

  // bindWorld({
  //   getStartPoint,
  //   getPointState,
  //   traversePoints,
  // } = {}) {
  //   if (getStartPoint) this.#world.getStartPoint = getStartPoint;
  //   if (getPointState) this.#world.getPointState = getPointState;
  //   if (traversePoints) this.#world.traversePoints = traversePoints;

  //   return this;
  // }

  // bindLoop(addRoutine) {
  //   this.#removeRoutine?.();

  //   if (typeof addRoutine === 'function') {
  //     this.#removeRoutine = addRoutine(this.stepTraversal);
  //   }

  //   return this;
  // }

  // unbindLoop() {
  //   this.#removeRoutine?.();
  //   this.#removeRoutine = null;
  //   return this;
  // }

  setGoalPoint(goalPoint = null) {
    this.#goalPoint = goalPoint ? Point.from(goalPoint) : null;
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

  getPointState(point = this.point) {
    return this.#world.getPointState?.(Point.from(point)) ?? null;
  }

  createTraversal(start = this.point, getGoal = () => this.#goalPoint) {
    if (typeof this.#world.traversePoints !== 'function' || !start) {
      return null;
    }

    return this.#world.traversePoints(start, getGoal);
  }

  resetTraversal(startPoint = this.#world.getStartPoint?.()) {
    const start = startPoint ? Point.from(startPoint?.point ?? startPoint) : this.point;

    this.#traversalGen?.return?.();
    this.clearGoalPoint();
    this.#dtSum = 0;
    this.#isStepping = false;
    this.#idleReason = null;
    this.#traversalGen = this.createTraversal(start, () => this.#goalPoint);

    if (start) {
      this.syncPoint(start);
    }

    this.setMoving(false);
    this.setTeleporting(false);
    this.setIdleReason(null);

    return this;
  }

  travelTo(goalPoint) {
    const goal = goalPoint ? Point.from(goalPoint?.point ?? goalPoint) : null;
    const goalState = goal ? this.getPointState(goal) : null;

    if (!goal || goalState?.isTraversable === false) {
      return false;
    }

    if (!this.#traversalGen) {
      this.resetTraversal(this.#world.getStartPoint?.() ?? this.point);
    }

    this.setGoalPoint(goal);
    this.setIdleReason(null);
    this.setMoving(true);
    this.setTeleporting(false);

    this.emitActorTravel({
      point: this.currentPoint,
      goalPoint: goal,
    });

    return true;
  }

  stop() {
    this.clearGoalPoint();
    this.#dtSum = 0;
    this.#idleReason = null;

    this.setMoving(false);
    this.setTeleporting(false);
    this.setIdleReason(null);

    this.emitActorStop({
      point: this.currentPoint,
    });

    return this;
  }

  async stepTraversal(dt) {
    if (!this.#traversalGen || !this.#goalPoint) {
      return;
    }

    this.#dtSum += dt;
    if (this.#dtSum <= 0.1 || this.#isStepping) {
      return;
    }

    this.#dtSum = 0;
    this.#isStepping = true;

    try {
      const prevState = this.getPointState(this.currentPoint);
      const prevPoint = this.currentPoint;
      const currPoint = this.#traversalGen.next().value;

      if (!currPoint) {
        this.#enterIdle('no-point');
        return;
      }

      const nextPoint = Point.from(currPoint);
      const currState = this.getPointState(nextPoint);

      if (!currState) {
        this.#enterIdle('missing-point-state');
        return;
      }

      if (prevPoint?.equals(nextPoint)) {
        this.#enterIdle('same-point');
        return;
      }

      this.#idleReason = null;

      this.syncPoint(nextPoint);
      this.setMoving(true);
      this.setIdleReason(null);

      if (prevState?.tileType === 'teleport') {
        this.setTeleporting(false);
      }

      this.emitActorMove({
        prevPoint,
        point: this.currentPoint,
      });

      const isLink = currState.tileType === 'map-link' || (currState.tileType === 'start' && !!currState.linkedMap);
      const linkedMapId = currState.linkedMap;

      if (linkedMapId && isLink) {
        this.emitActorMapLink({
          point: nextPoint,
          linkedMapId,
        });
        this.stop();
        return;
      }

      if (this.#goalPoint && nextPoint.equals(this.#goalPoint)) {
        this.emitActorGoal({
          point: nextPoint,
          goalPoint: this.goalPoint,
        });
        this.stop();
        return;
      }

      if (currState.tileType === 'teleport') {
        this.setTeleporting(true);
        this.emitActorTeleport({
          point: nextPoint,
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
      point: Point.from(payload.point ?? this.point),
      goalPoint: Point.from(payload.goalPoint ?? this.goalPoint),
    });
  }

  emitActorMove(payload = {}) {
    return this.#emitActorAction(ActorMove, {
      ...payload,
      point: Point.from(payload.point ?? this.point),
      prevPoint: Point.from(payload.prevPoint ?? this.point),
    });
  }

  emitActorIdle(reason = 'idle', payload = {}) {
    return this.#emitActorAction(ActorIdle, {
      ...payload,
      point: Point.from(payload.point ?? this.point),
      goalPoint: payload.goalPoint ? Point.from(payload.goalPoint) : this.goalPoint,
      reason,
    });
  }

  emitActorGoal(payload = {}) {
    return this.#emitActorAction(ActorGoal, {
      ...payload,
      point: Point.from(payload.point ?? this.point),
      goalPoint: Point.from(payload.goalPoint ?? this.goalPoint),
    });
  }

  emitActorMapLink(payload = {}) {
    return this.#emitActorAction(ActorMapLink, {
      ...payload,
      point: Point.from(payload.point ?? this.point),
    });
  }

  emitActorTeleport(payload = {}) {
    return this.#emitActorAction(ActorTeleport, {
      ...payload,
      point: Point.from(payload.point ?? this.point),
    });
  }

  emitActorStop(payload = {}) {
    return this.#emitActorAction(ActorStop, {
      ...payload,
      point: Point.from(payload.point ?? this.point),
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

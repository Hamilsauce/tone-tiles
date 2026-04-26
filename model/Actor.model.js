import { TraverserModel } from './Traverser.model.js';
import { Point } from '../core/spatial/Point.js';
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
  point: { x: 0, y: 0 },
  moving: false,
  teleporting: false,
  idleReason: null,
  goalPoint: null,
};

export class ActorModel extends TraverserModel {
  constructor({ properties, ...rest } = {}) {
    super({
      ...rest,
      type: 'actor',
      properties: {
        ...DefaultActorProperties,
        ...(properties ?? {}),
      },
    });
  }

  onGoal() {
    console.warn('actor goal reached', { id: this.id, point: this.point, goalPoint: this.goalPoint });
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

  #emitActorAction(createActorAction, payload = {}) {
    const action = createActorAction({
      id: this.id,
      ...payload,
    });

    this.emit?.(action);
    return action;
  }
}

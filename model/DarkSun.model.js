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

const DefaultDarkSunWaypoints = [
  { x: 0, y: 0 },
  { x: 5, y: 0 },
  // { x: 5, y: 5 },
  // { x: 0, y: 5 },
];

const DefaultDarkSunProperties = {
  type: 'actor',
  id: null,
  point: { x: 0, y: 0 },
  moving: false,
  teleporting: false,
  idleReason: null,
  goalPoint: null,
};

export class DarkSunModel extends TraverserModel {
  #waypoints = [];

  constructor({ waypoints = DefaultDarkSunWaypoints, ...options } = {}) {
    super({
      ...options,
      type: 'dark-sun'
    });

    this.#waypoints = waypoints;
    this.waypointIndex = 0;
    this.setGoalPoint(this.currentWaypoint);
  }

  get currentWaypoint() {
    return Point.from(this.#waypoints[this.waypointIndex]);
  }

  onGoal() {
    setTimeout(() => {
      this.setGoalPoint(this.stepWaypoint());
    }, 1000);
  }

  stepWaypoint() {
    this.waypointIndex = (this.waypointIndex + 1) % this.#waypoints.length;

    return this.currentWaypoint;
  }
}
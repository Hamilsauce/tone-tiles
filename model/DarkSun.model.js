import { TraverserModel } from './Traverser.model.js';
import { Point } from '../core/spatial/Point.js';

const DefaultDarkSunWaypoints = [
  { x: 10, y: 21 },
  { x: 0, y: 0 },
  { x: 5, y: 0 },
  { x: 4, y: 5 },
];

const DefaultDarkSunProperties = {
  type: 'dark-sun',
  id: null,
  point: { x: 10, y: 21 },
  moving: false,
  teleporting: false,
  idleReason: null,
  goalPoint: null,
};

export class DarkSunModel extends TraverserModel {
  #waypoints = [];
  #wait = 1000;
  #goalTimeout = null;
  
  constructor({ waypoints = DefaultDarkSunWaypoints, ...options } = {}) {
    super({
      ...options,
      type: 'dark-sun'
    });
    
    this.#waypoints = waypoints;
    this.waypointDirection = 1;
    this.waypointIndex = 0;
    this.stepInterval = 0.125;
    this.stepInterval = 0.075;
    this.setGoalPoint(this.currentWaypoint);
  }
  
  get currentWaypoint() {
    return Point.from(this.#waypoints[this.waypointIndex]);
  }
  
  onGoal() {
    clearTimeout(this.#goalTimeout);
    this.#goalTimeout = setTimeout(() => {
      this.setGoalPoint(this.stepWaypoint());
    }, this.#wait);
  }
  
  stepWaypoint() {
    if (this.#waypoints.length <= 1) {
      this.waypointIndex = 0;
      return this.currentWaypoint;
    }
    
    let nextIndex = this.waypointIndex + this.waypointDirection;
    
    if (nextIndex < 0 || nextIndex >= this.#waypoints.length) {
      this.waypointDirection *= -1;
      nextIndex = this.waypointIndex + this.waypointDirection;
    }
    
    this.waypointIndex = nextIndex;
    
    return this.currentWaypoint;
  }
  
  reverseCourse() {
    if (this.#waypoints.length <= 1) {
      return this;
    }
    
    clearTimeout(this.#goalTimeout);
    this.#goalTimeout = null;
    this.waypointDirection *= -1;
    
    let nextIndex = this.waypointIndex + this.waypointDirection;
    
    if (nextIndex < 0 || nextIndex >= this.#waypoints.length) {
      this.waypointDirection *= -1;
      nextIndex = this.waypointIndex + this.waypointDirection;
    }
    
    this.waypointIndex = nextIndex;
    this.setGoalPoint(this.currentWaypoint);
    
    return this;
  }

  resolveAction(event = {}) {
    if (event.type === 'spatial:blocked') {
      if (event.reason === 'blocked-by:actor') {
        this.reverseCourse();
      }

      this.resetTraversal(this.currentPoint);
      return this;
    }

    return super.resolveAction(event);
  }
  
  destroy() {
    clearTimeout(this.#goalTimeout);
    this.#goalTimeout = null;
    return super.destroy();
  }
  
  toJSON() {
    return {
      ...super.toJSON(),
      waypoints: this.#waypoints,
      wait: this.#wait,
      waypointDirection: this.waypointDirection,
      waypointIndex: this.waypointIndex,
    };
  }
}

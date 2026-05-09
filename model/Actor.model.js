import { TraverserModel } from './Traverser.model.js';
import { getDirectionFromPoints } from '../core/spatial/utils.js';

import { Point } from '../core/spatial/Point.js';
import ham from 'ham';
const { sleep } = ham;

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

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
    
    this.prevDir = null;
    this.currDir = null;
  }
  
  onTraversalStart(_context) {}
  onIdle(_context) {}
  onTraversalEnd(_context) {}
  onTraversalError(_context) {}
  
  onGoal() {
    this.update({ teleporting: false });
    console.warn('actor goal reached', { id: this.id, point: this.point, goalPoint: this.goalPoint });
  }
  
  onMove(event) {
    this.prevDir = this.currDir;
    this.currDir = getDirectionFromPoints(event.prevPoint, event.point);
    
    if (this.prevDir === this.currDir) {
      this.stepInterval = clamp(this.stepInterval - 0.008, 0.05, 0.1);
    } else {
      this.stepInterval = clamp(this.stepInterval + 0.012, 0.05, 0.1);
    }
  }
  
  onBlocked(event) {
    console.warn('onBlocked', event);
    this.travelTo(event.prevPoint);
  }
  
}
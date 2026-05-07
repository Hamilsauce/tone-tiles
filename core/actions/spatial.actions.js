import { createAction } from './create-action.js';
import { optional, isPointLike, isString, isBoolean } from '../../lib/utils.js';

const isStringArray = (value) => Array.isArray(value) && value.every(isString);

export const SpatialMove = createAction('spatial:move', {
  id: isString,
  point: isPointLike,
  prevPoint: isPointLike,
  goalPoint: optional(isPointLike),
  fromNodeId: isString,
  toNodeId: isString,
  direction: optional(isString),
  teleporting: optional(isBoolean),
  actionType: isString,
});

export const SpatialBlocked = createAction('spatial:blocked', {
  id: isString,
  point: isPointLike,
  prevPoint: isPointLike,
  goalPoint: optional(isPointLike),
  fromNodeId: isString,
  toNodeId: isString,
  blockers: isStringArray,
  reason: isString,
  direction: optional(isString),
  teleporting: optional(isBoolean),
  actionType: isString,
});

export const SpatialCollision = createAction('interaction:collision', {
  id: isString,
  point: isPointLike,
  prevPoint: isPointLike,
  actors: isStringArray,
  blockers: isStringArray,
  entering: isString,
  direction: optional(isString),
  teleporting: optional(isBoolean),
  actionType: isString,
});

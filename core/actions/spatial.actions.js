import { createAction } from './create-action.js';
import { optional, isPointLike, isString } from '../../lib/utils.js';

const isStringArray = (value) => Array.isArray(value) && value.every(isString);

export const SpatialMove = createAction('spatial:move', {
  id: isString,
  point: isPointLike,
  prevPoint: isPointLike,
  goalPoint: optional(isPointLike),
  fromNodeId: isString,
  toNodeId: isString,
});

export const SpatialCollision = createAction('interaction:collision', {
  point: isString,
  actors: isStringArray,
  entering: optional(isString),
});

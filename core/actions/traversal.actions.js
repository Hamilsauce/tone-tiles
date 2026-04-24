import { createAction } from './create-action.js';

const isString = (value) => typeof value === 'string' && value.length > 0;
const isPointLike = (value) => !!value && typeof value.x === 'number' && typeof value.y === 'number';
const isObject = (value) => !!value && typeof value === 'object';
const isErrorLike = (value) => value instanceof Error || isObject(value);
const optional = (validator) => (value) => value === undefined || value === null || validator(value);

export const TraversalStart = createAction('traversal:start', {
  id: isString,
  point: isPointLike,
  goalPoint: isPointLike,
});

export const TraversalMove = createAction('traversal:move', {
  id: isString,
  point: isPointLike,
  prevPoint: isPointLike,
  goalPoint: optional(isPointLike),
});

export const TraversalGoal = createAction('traversal:goal', {
  id: isString,
  point: isPointLike,
  goalPoint: isPointLike,
});

export const TraversalIdle = createAction('traversal:idle', {
  id: isString,
  point: isPointLike,
  reason: isString,
  goalPoint: optional(isPointLike),
});

export const TraversalStop = createAction('traversal:stop', {
  id: isString,
  point: isPointLike,
  reason: optional(isString),
  goalPoint: optional(isPointLike),
});

export const TraversalError = createAction('traversal:error', {
  id: isString,
  error: isErrorLike,
  point: optional(isPointLike),
  goalPoint: optional(isPointLike),
});

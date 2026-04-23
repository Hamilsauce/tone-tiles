import { createAction } from './create-action.js';

const isString = (value) => typeof value === 'string' && value.length > 0;
const isPointLike = (value) => !!value && typeof value.x === 'number' && typeof value.y === 'number';
const isObject = (value) => !!value && typeof value === 'object';
const isErrorLike = (value) => value instanceof Error || isObject(value);
const optional = (validator) => (value) => value === undefined || value === null || validator(value);

export const ActorTravel = createAction('actor:travel', {
  id: isString,
  point: isPointLike,
  goalPoint: isPointLike,
});

export const ActorMove = createAction('actor:move', {
  id: isString,
  point: isPointLike,
  prevPoint: isPointLike,
});

export const ActorIdle = createAction('actor:idle', {
  id: isString,
  point: isPointLike,
  reason: isString,
  goalPoint: optional(isPointLike),
});

export const ActorGoal = createAction('actor:goal', {
  id: isString,
  point: isPointLike,
  goalPoint: isPointLike,
});

export const ActorMapLink = createAction('actor:map-link', {
  id: isString,
  point: isPointLike,
  linkedMapId: isString,
});

export const ActorTeleport = createAction('actor:teleport', {
  id: isString,
  point: isPointLike,
});

export const ActorStop = createAction('actor:stop', {
  id: isString,
  point: isPointLike,
});

export const ActorError = createAction('actor:error', {
  id: isString,
  error: isErrorLike,
});

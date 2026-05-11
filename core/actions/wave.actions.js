import { createAction } from './create-action.js';
import { optional, isPointLike, isString } from '../../lib/utils.js';

const isNumber = (value) => typeof value === 'number' && Number.isFinite(value);

export const WaveGravity = createAction('wave:gravity', {
  id: isString,
  point: isPointLike,
  radius: isNumber,
  stepIntervalModifier: isNumber,
});

export const TraverserStepIntervalModifier = createAction('traverser:step-interval-modifier', {
  id: isString,
  sourceId: isString,
  point: isPointLike,
  sourcePoint: isPointLike,
  modifier: isNumber,
  radius: optional(isNumber),
});

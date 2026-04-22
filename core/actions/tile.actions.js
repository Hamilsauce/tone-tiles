import { createAction } from './create-action.js';

const isString = (value) => typeof value === 'string' && value.length > 0;
const isObject = (value) => !!value && typeof value === 'object';

export const NodeUpdated = createAction('node:update', {
  id: isString,
  data: isObject,
});

export const TilePatched = createAction('tile:patch', {
  id: isString,
  model: isObject,
});

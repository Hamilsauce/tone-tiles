import { createAction } from './create-action.js';

const isString = (value) => typeof value === 'string' && value.length > 0;
const isObject = (value) => !!value && typeof value === 'object';
const validateTeleportPayload = (value) => {
  if (!isObject(value)) return false;
  
}

export const TeleportTo = createAction('teleport:to', {
  id: isString,
  data: isObject,
});

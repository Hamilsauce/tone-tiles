export const isString = (value) => typeof value === 'string' && value.length > 0;
export const isBoolean = (value) => typeof value === 'boolean';
export const isPointLike = (value) => !!value && typeof value.x === 'number' && typeof value.y === 'number';
export const isObject = (value) => !!value && typeof value === 'object';
export const isErrorLike = (value) => value instanceof Error || isObject(value);
export const optional = (validator) => (value) => value === undefined || value === null || validator(value);

export const typeCheckers = {
  isString,
  isPointLike,
  isObject,
  isErrorLike,
  isBoolean,
  optional,
}

export const copyTextToClipboard = async (text) => {
  await navigator.clipboard.writeText(text);
};

const pointerEventSet = new Set(['pointerdown', 'pointermove', 'pointerup'])

export const dispatchPointerEvent = (target, type, options = {}) => {
  target = target ?? document;
  type = pointerEventSet.has(type) ? type : 'pointermove';
  
  options = Object.assign({
    view: window,
    bubbles: true,
    cancelable: true
  }, (options ?? {}));
  
  const ev = new PointerEvent(type, options);
  target.dispatchEvent(ev);
};
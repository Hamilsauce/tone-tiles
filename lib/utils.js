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
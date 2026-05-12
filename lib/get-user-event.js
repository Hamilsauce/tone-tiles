import { rxjs } from 'rxjs';
import { domPoint as _domPoint } from './utils.js';
import { createCustomEvent } from './create-event.js';


const { fromEvent, operators, merge } = rxjs;
const { filter, map, tap } = operators;

const DRAG_DISTANCE_THRESHOLD = 4;

export const getUserEvents = (eventTarget) => {
  const domPoint = typeof eventTarget.domPoint === 'function' ?
    (x, y) => eventTarget.domPoint(x, y) :
    (x, y) => _domPoint(eventTarget.dom, x, y);
  
  let didDrag = false;
  let suppressNextClick = false;
  let pointerDown = false;
  let isEditing = false;
  
  const pointerDownDOM$ = fromEvent(eventTarget.dom, 'pointerdown').pipe(
    tap(({ clientX, clientY }) => {
      suppressNextClick = false;
      pointerDown = { x: clientX, y: clientY };
      didDrag = false;
    }),
  );
  
  const pointerMoveDOM$ = fromEvent(eventTarget.dom, 'pointermove').pipe(
    tap(({ clientX, clientY }) => {
      if (!pointerDown || didDrag) return;
      
      const dx = clientX - pointerDown.x;
      const dy = clientY - pointerDown.y;
      const distance = Math.hypot(dx, dy);
      
      if (distance >= DRAG_DISTANCE_THRESHOLD) {
        didDrag = true;
      }
    }),
  );
  
  const pointerUpDOM$ = fromEvent(eventTarget.dom, 'pointerup').pipe(
    tap(() => {
      if (pointerDown && didDrag) {
        suppressNextClick = true;
      }
      
      pointerDown = null;
      didDrag = false;
    }),
  );
  
  const clickDOM$ = fromEvent(eventTarget.dom, 'click').pipe(
    filter(() => {
      if (!suppressNextClick) return true;
      
      suppressNextClick = false;
      return false;
    }),

    filter(() => {
      if (!isEditing) return true;
     eventTarget.dispatchEvent(createCustomEvent('contextmenu:blur', {}))
 
      isEditing = false;
      return false;
    }),

    tap(e => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }),
  );
  
  const contextMenuDOM$ = fromEvent(eventTarget.dom, 'contextmenu').pipe(
    tap(e => {
      e.preventDefault();
      e.stopPropagation();
      
      isEditing = true;
    }),
  );
  
  const eventEmits$ = merge(clickDOM$, contextMenuDOM$)  .pipe(
      // tap(x => console.log('x', x)),
      map((e) => {
        const { type, clientX, clientY, target } = e;
        const layerDOM = target.closest('[data-type="layer"]');
        return { type, clientX, clientY, layerDOM }
      }),
      filter(({ layerDOM }) => !!layerDOM),
      
      map(({ type, layerDOM, clientX, clientY }) => {
        const layerName = layerDOM.dataset.name;
        
        const point = domPoint(clientX, clientY);
        const x = Math.floor(point.x);
        const y = Math.floor(point.y);
        
        return {
          type: `${layerName}:${type}`,
          detail: {
            id: `${x}_${y}`,
            point: { x, y },
            x,
            y,
          }
        };
      }),
      tap(({ type, detail }) => {
        eventTarget.dispatchEvent(createCustomEvent(type, detail))
      }),
    );
  
  return {
    eventEmits$,
    pointerEvents$: merge(pointerDownDOM$, pointerMoveDOM$, pointerUpDOM$)
  };
  
};

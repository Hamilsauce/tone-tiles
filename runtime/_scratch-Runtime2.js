import { Subject } from 'rxjs';
import {
  buffer,
  distinctUntilChanged,
  filter,
  groupBy,
  map,
  share,
  shareReplay,
} from 'rxjs/operators';

const now = () => {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  
  return Date.now();
};

export class Runtime {
  #channels;
  #teardowns;
  #producers;
  #loopConnected;
  #frame$;
  #tick$;
  
  constructor() {
    this.event$ = new Subject();
    this.#channels = new Map();
    this.#teardowns = [];
    this.#producers = new Set();
    this.#loopConnected = false;
    this.#frame$ = null;
    this.#tick$ = null;
  }
  
  dispatch(action = {}) {
    const event = this.#normalizeAction(action);
    this.event$.next(event);
    return event;
  }
  
  connectEmitter(emitter, eventMap = {}) {
    if (!emitter || typeof emitter.on !== 'function') {
      throw new TypeError('Runtime.connectEmitter requires an emitter with an on(eventName, handler) method');
    }
    
    const disconnectors = Object.entries(eventMap).map(([eventName, createAction]) => {
      if (typeof createAction !== 'function') {
        throw new TypeError(`Runtime.connectEmitter expected an action creator for "${eventName}"`);
      }
      
      const handler = (payload = {}) => {
        this.dispatch(createAction(payload));
      };
      
      const teardown = emitter.on(eventName, handler);
      
      if (typeof teardown === 'function') {
        this.#teardowns.push(teardown);
        return teardown;
      }
      
      if (typeof emitter.off === 'function') {
        const off = () => emitter.off(eventName, handler);
        this.#teardowns.push(off);
        return off;
      }
      
      if (teardown && typeof teardown.unsubscribe === 'function') {
        const unsubscribe = () => teardown.unsubscribe();
        this.#teardowns.push(unsubscribe);
        return unsubscribe;
      }
      
      return null;
    });
    
    return () => {
      disconnectors.forEach(disconnect => disconnect?.());
      this.#teardowns = this.#teardowns.filter(teardown => !disconnectors.includes(teardown));
    };
  }
  
  connectLoop(loop, TickAction) {
    if (!loop || typeof loop.onTick !== 'function') {
      throw new TypeError('Runtime.connectLoop requires a loop with an onTick(handler) method');
    }
    
    if (typeof TickAction !== 'function') {
      throw new TypeError('Runtime.connectLoop requires a TickAction creator');
    }
    
    if (this.#loopConnected) {
      throw new Error('Runtime.connectLoop has already been called');
    }
    
    const teardown = loop.onTick((tickPayload = {}) => {
      this.#stepProducers(tickPayload);
      
      this.dispatch(TickAction({
        ...tickPayload,
        t: typeof tickPayload.t === 'number' ? tickPayload.t : now(),
      }));
    });
    
    if (typeof teardown === 'function') {
      this.#teardowns.push(teardown);
    } else if (loop.off && typeof loop.off === 'function') {
      const off = () => loop.off('tick');
      this.#teardowns.push(off);
    }
    
    this.#loopConnected = true;
    this.#tick$ = this.channel('tick').pipe(
      shareReplay({ bufferSize: 1, refCount: true })
    );
    
    this.#frame$ = this.event$.pipe(
      buffer(this.#tick$),
      filter(events => events.length > 0),
      share()
    );
    
    return teardown;
  }
  
  registerProducer(producer) {
    if (!producer || typeof producer.step !== 'function') {
      throw new TypeError('Runtime.registerProducer requires an object with a step(dt) method');
    }
    
    this.#producers.add(producer);
    
    return () => {
      this.#producers.delete(producer);
    };
  }
  
  channel(type) {
    if (!this.#channels.has(type)) {
      const shared$ = this.event$.pipe(
        filter(event => event.type === type),
        shareReplay({ bufferSize: 1, refCount: true }),
      );
      
      this.#channels.set(type, shared$);
    }
    
    return this.#channels.get(type);
  }
  
  fromChannel(type, options = {}) {
    const {
      map: mapPayload,
      filter: filterPayload,
      distinct,
    } = options;
    
    let stream$ = this.channel(type).pipe(
      map(event => event.payload),
    );
    
    if (typeof filterPayload === 'function') {
      stream$ = stream$.pipe(filter(filterPayload));
    }
    
    if (typeof mapPayload === 'function') {
      stream$ = stream$.pipe(map(mapPayload));
    }
    
    if (typeof distinct === 'function') {
      stream$ = stream$.pipe(distinctUntilChanged(distinct));
    }
    
    return stream$.pipe(share());
  }
  
  groupedByType() {
    return this.event$.pipe(groupBy(event => event.type));
  }
  
  frame() {
    if (!this.#frame$) {
      throw new Error('Runtime.frame() requires connectLoop() to be called first');
    }
    
    return this.#frame$;
  }
  
  tick() {
    if (!this.#tick$) {
      throw new Error('Runtime.tick() requires connectLoop() to be called first');
    }
    
    return this.#tick$;
  }
  
  destroy() {
    this.#teardowns.forEach(teardown => teardown?.());
    this.#teardowns = [];
    this.#channels.clear();
    this.#producers.clear();
    this.event$.complete();
    this.#frame$ = null;
    this.#tick$ = null;
    this.#loopConnected = false;
  }
  
  #stepProducers(tickPayload) {
    for (const producer of this.#producers) {
      producer.step(tickPayload);
    }
  }
  
  #normalizeAction(action) {
    if (!action || typeof action !== 'object') {
      throw new TypeError('Runtime.dispatch requires an action object');
    }
    
    if (typeof action.type !== 'string' || action.type.length === 0) {
      throw new TypeError('Runtime.dispatch requires action.type to be a non-empty string');
    }
    
    return {
      type: action.type,
      payload: action,
      t: typeof action.t === 'number' ? action.t : now(),
    };
  }
}

export class ToneTilesRuntime extends Runtime {}
export default Runtime;
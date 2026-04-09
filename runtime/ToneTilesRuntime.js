import { Subject } from 'rxjs';
import {
  distinctUntilChanged,
  filter,
  groupBy,
  map,
  share,
} from 'rxjs/operators';

const now = () => {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }

  return Date.now();
};

export class Runtime {
  constructor() {
    this.event$ = new Subject();
    this.#channels = new Map();
    this.#teardowns = [];
  }

  #channels;
  #teardowns;

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

  channel(type) {
    if (!this.#channels.has(type)) {
      const shared$ = this.event$.pipe(
        filter(event => event.type === type),
        share(),
      );

      this.#channels.set(type, shared$);
    }

    return this.#channels.get(type);
  }

  fromChannel(type, options = {}) {
    const { map: mapPayload, filter: filterPayload, distinct } = options;

    let stream$ = this.channel(type).pipe(
      map(event => event.payload),
    );

    if (typeof mapPayload === 'function') {
      stream$ = stream$.pipe(map(mapPayload));
    }

    if (typeof filterPayload === 'function') {
      stream$ = stream$.pipe(filter(filterPayload));
    }

    if (typeof distinct === 'function') {
      stream$ = stream$.pipe(distinctUntilChanged(distinct));
    }

    return stream$.pipe(share());
  }

  groupedByType() {
    return this.event$.pipe(groupBy(event => event.type));
  }

  destroy() {
    this.#teardowns.forEach(teardown => teardown?.());
    this.#teardowns = [];
    this.#channels.clear();
    this.event$.complete();
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
      payload: this.#normalizePayload(action.payload),
      t: typeof action.t === 'number' ? action.t : now(),
    };
  }

  #normalizePayload(payload) {
    if (!payload || typeof payload !== 'object') {
      return {};
    }

    return payload;
  }
}

export class ToneTilesRuntime extends Runtime {}

export default Runtime;

import { rxjs } from 'rxjs';
const { Subject, operators } = rxjs;
const { takeUntil,tap, share, filter, map, distinctUntilChanged, shareReplay } = operators;

export class Connection {
	#stop$ = new Subject();
	#closed = false;
	#sub;
	
	constructor(source$, sink$, options = {}) {
		const { transform } = options;
		
		const input$ = transform ?
			source$.pipe(transform) :
			source$;
		
		this.#sub = input$
			.pipe(takeUntil(this.#stop$))
			.subscribe(sink$);
	}
	
	close() {
		if (this.#closed) return;
		this.#closed = true;
		
		this.#stop$.next();
		this.#stop$.complete();
		this.#sub.unsubscribe();
	}
	
	get closed() {
		return this.#closed;
	}
}

export class ConnectionBus {
	#input$ = new Subject();
	#connections = new Map(); // optional naming
	#id = 0;
	
	events$ = this.#input$.pipe(share());
	
	/**
	 * Attach a stream
	 * @param {Observable} source$
	 * @param {Object} options
	 * @param {string} [options.name]
	 * @param {Function} [options.transform]
	 */
	attach(source$, options = {}) {
		const { name, transform } = options;
		
		const id = name ?? `conn_${this.#id++}`;
		const taggedSource$ = source$.pipe(
			map(_ => ({
				..._,
				source: id.description ?? id.toString()
			})),
			// tap(x => console.log('taggedSource$', x)),
			
		);
		const conn = new Connection(taggedSource$, this.#input$, { transform });
		
		this.#connections.set(id, conn);
		
		return {
			id,
			detach: () => {
				const c = this.#connections.get(id);
				if (!c) return;
				c.close();
				this.#connections.delete(id);
			}
		};
	}
	
	emit(event) {
		this.#input$.next(event);
	}
	
	detach(id) {
		const conn = this.#connections.get(id);
		if (!conn) return;
		conn.close();
		this.#connections.delete(id);
	}
	
	clear() {
		for (const conn of this.#connections.values()) {
			conn.close();
		}
		this.#connections.clear();
	}
	
	get size() {
		return this.#connections.size;
	}
}

export function createConnectionBus(host = null) {
	const bus = new ConnectionBus();
	
	const api = {
		events$: bus.events$,
		
		in: ({ name, source$, transform }) => bus.attach(source$, { name, transform }),
		
		out: ({ type = null, filter: filterFn = null, map: mapFn = null, distinct = null } = {}) => {
			let stream$ = bus.events$.pipe(
				filter(({ type: eventType }) => type ? eventType.includes(type) : true),
			);
			
			if (filterFn) {
				stream$ = stream$.pipe(filter(filterFn));
			}
			
			if (mapFn) {
				stream$ = stream$.pipe(map(mapFn));
			}
			
			if (distinct) {
				stream$ = stream$.pipe(distinctUntilChanged(distinct));
			}
			
			return stream$.pipe(
				shareReplay({ bufferSize: 1, refCount: true }),
			);
		},
		
		emit: (event) => bus.emit(event),
		
		detach: (id) => bus.detach(id),
		
		clear: () => bus.clear(),
		
		get size() {
			return bus.size;
		}
	};
	
	if (host) {
		host.in = api.in;
		host.out = api.out;
	}
	
	return api;
}
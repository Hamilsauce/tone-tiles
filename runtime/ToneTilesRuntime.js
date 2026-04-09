import { Subject } from 'rxjs';

export class ToneTilesRuntime {
  constructor() {
    // --- Subsystems ---
    this.graph = null;
    this.traversal = null;
    this.audio = null;
    this.renderer = null;
    this.loop = null;
    
    // --- Event ingress (subjects) ---
    this.events = {
      nodeUpdate$: new Subject(),
      objectMove$: new Subject(),
      actorStep$: new Subject(),
      tick$: new Subject(),
    };
    
    // --- Subscriptions (for cleanup) ---
    this._subscriptions = [];
    
    this.informationSuperHighway = combineLatest(
      ...Object.values(this.events),
      (nodeUpdate, objectMove, actorStep) => ({ nodeUpdate, objectMove, actorStep })
    );
    
  }
  
  init({ graph, traversal, audio, renderer, loop }) {
    this.graph = graph;
    this.traversal = traversal;
    this.audio = audio;
    this.renderer = renderer;
    this.loop = loop;
    
    this.#wireEmitters();
    this.#setupPipelines();
  }
  
  start() {
    this.loop.start();
  }
  
  stop() {
    this.loop.stop();
    this._subscriptions.forEach(sub => sub.unsubscribe());
  }
  
  // -------------------------
  // INTERNALS
  // -------------------------
  
  #wireEmitters() {
    // Graph → streams
    this.graph.on('node:update', e => {
      this.events.nodeUpdate$.next(e);
    });
    
    this.graph.on('object:move', e => {
      this.events.objectMove$.next(e);
    });
    
    // Traversal → streams
    this.traversal.on('actor:step', e => {
      this.events.actorStep$.next(e);
    });
    
    // Loop → streams
    this.loop.onTick(t => {
      this.events.tick$.next(t);
    });
  }
  
  #setupPipelines() {
    const { actorStep$, tick$ } = this.events;
    
    // --- Example: drive traversal from loop ---
    this._subscriptions.push(
      tick$.subscribe(() => {
        this.traversal.step();
      })
    );
    
    // --- Example: actor movement → audio ---
    this._subscriptions.push(
      actorStep$.subscribe(e => {
        this.audio.playStep(e);
      })
    );
    
    // --- Example: actor movement → rendering ---
    this._subscriptions.push(
      actorStep$.subscribe(e => {
        this.renderer.updateActor(e);
      })
    );
  }
}
import { CanvasObject, DefaultCanvasObjectOptions } from './CanvasObject.js';
import { GraphNode } from '../lib/graph.model.js';

export class CanvasActor extends CanvasObject {
  #prev = {};
  #traversalGen;
  #trail = [];
  #getGoal;
  
  constructor(ctx, options = DefaultCanvasObjectOptions) {
    // if (options.model && !(options.model instanceof GraphNode)) {
    //   throw new Error(`Must init CanvasActor with GraphNode Model. Received: ${JSON.stringify(options.model, null, 2)}`);
    // }'
    // const graph = options.graph
    
    
    // const node = options.model;
    options.model = {...options.model, isMoving: false}
    // options.id = node.address;
    
    super(ctx, 'tile', options);
    
    this.#traversalGen = graph.traverseHybrid(
      graph.getNodeAtPoint({ x: this.x, y: this.y }),
      () => this.#getGoal
    );
  };
  
  attachTraversal(traversalGen, goalGetter = () => null) {
    this.#traversalGen = traversalGen;
    this.#getGoal = goalGetter;
  }
  
  scoot() {
    if (!this.#traversalGen) {
      throw new Error(`Cant scoot`)
    }
    
    const curr = this.#traversalGen.next().value;
    if (curr && this.#prev && curr.id !== this.#prev?.id) {
      // this.#trail = this.#trail.unshift(curr);
      this.update({ ...curr.data(), isMoving: true });
      this.#prev = curr;
      
      return curr;
      
    } else if (this.model.isMoving) {
      this.update({ isMoving: true });
    }
  }
}
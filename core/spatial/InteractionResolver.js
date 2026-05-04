import { SpatialCollision, SpatialMove } from '../actions/spatial.actions.js';
import { createConnectionBus } from '../../core/create-connection.js';
import { rxjs } from 'rxjs';
const { operators, merge } = rxjs;
const { map, filter } = operators;

export const derive$ = (events$, graph) => {
  const base$ = events$.pipe(
    filter(event => !event.meta?.derived)
  );

  const move$ = base$.pipe(
    filter(event => event.type === 'traversal:move'),
    map(event => SpatialMove({
      id: event.id,
      point: event.point,
      prevPoint: event.prevPoint,
      goalPoint: event.goalPoint,
      fromNodeId: graph.pointToAddress(event.prevPoint),
      toNodeId: graph.pointToAddress(event.point),
      meta: { derived: true },
    }))
  );

  const collision$ = base$.pipe(
    filter(event => event.type === 'node:update'),
    filter(event => typeof event.data?.added === 'string'),
    filter(event => Array.isArray(event.data?.objectIds) && event.data.objectIds.length > 1),
    map(event => SpatialCollision({
      point: event.id,
      actors: event.data.objectIds,
      entering: event.data.added,
      meta: { derived: true },
    }))
  );

  return merge(move$, collision$);
};


export class InteractionResolver {
  constructor({ entities, graph }) {
    this.graph = graph;
    this.entities = entities;

    createConnectionBus(this);

    this.in({ name: 'entities', source$: entities.out({}) });
    this.in({ name: 'graph', source$: graph.out({}) });

    this.derived$ = derive$(this.out({}), graph);
  }
}

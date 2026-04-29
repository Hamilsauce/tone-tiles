import { ModelTypes } from './model.types.js';
import { EntityCollection } from '../../model/EntityCollection.js';
import { Graph } from '../../model/graph.model.js';

export const CollectionRegistry = new Map([
  [ModelTypes.ENTITIES, EntityCollection],
  [ModelTypes.GRAPH, Graph],
]);

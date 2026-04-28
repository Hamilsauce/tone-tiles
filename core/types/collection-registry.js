import { ModelTypes } from './model.types.js';
import { EntityCollection } from '../../model/EntityCollection.js';
// import { GraphNodeModel } from '../model/GraphNodeModel';
import {
  Graph
} from '../../model/index.js';

export const CollectionRegistry = new Map([
  [ModelTypes.ENTITIES, EntityCollection],
  [ModelTypes.GRAPH, Graph],
]);

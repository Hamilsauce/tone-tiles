import { ModelTypes } from './model.types.js';
import { ActorModel } from '../model/ActorModel';
import { GraphNodeModel } from '../model/GraphNodeModel';

export const ModelRegistry = new Map([
  [ModelTypes.ACTOR, ActorModel],
  [ModelTypes.NODE, GraphNodeModel],
]);
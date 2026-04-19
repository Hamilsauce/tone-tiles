import { ModelTypes } from './model.types.js';
// import { ActorModel } from '../model/ActorModel';
// import { GraphNodeModel } from '../model/GraphNodeModel';
import { ActorModel, GraphNode, TeleporterModel } from '../..//model/index.js';

export const ModelRegistry = new Map([
  [ModelTypes.ACTOR, ActorModel],
  [ModelTypes.NODE, GraphNode],
  [ModelTypes.TELEPORTER, TeleporterModel],
]);
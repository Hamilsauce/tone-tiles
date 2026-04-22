import { ModelTypes } from './model.types.js';
// import { ActorModel } from '../model/ActorModel';
// import { GraphNodeModel } from '../model/GraphNodeModel';
import {
  ActorModel,
  GraphNodeModel,
  TeleporterModel
} from '../../model/index.js';

export const ModelRegistry = new Map([
  [ModelTypes.ACTOR, ActorModel],
  [ModelTypes.NODE, GraphNodeModel],
  [ModelTypes.TELEPORTER, TeleporterModel],
]);
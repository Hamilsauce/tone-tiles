import { ModelTypes } from './model.types.js';
// import { ActorModel } from '../model/ActorModel';
// import { GraphNodeModel } from '../model/GraphNodeModel';
import {
  ActorModel,
  GraphNodeModel,
  TeleporterModel,
  DarkSunModel,
} from '../../model/index.js';

export const ModelRegistry = new Map([
  [ModelTypes.ACTOR, ActorModel],
  [ModelTypes.TELEPORTER, TeleporterModel],
  [ModelTypes.NODE, GraphNodeModel],
  [ModelTypes.DARK_SUN, DarkSunModel],
]);
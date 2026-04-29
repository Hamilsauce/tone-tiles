import { ModelTypes } from './model.types.js';
import { ActorModel } from '../../model/Actor.model.js';
import { GraphNodeModel } from '../../model/GraphNode.model.js';
import { TeleporterModel } from '../../model/Teleporter.model.js';
import { DarkSunModel } from '../../model/DarkSun.model.js';

export const ModelRegistry = new Map([
  [ModelTypes.ACTOR, ActorModel],
  [ModelTypes.TELEPORTER, TeleporterModel],
  [ModelTypes.NODE, GraphNodeModel],
  [ModelTypes.DARKSUN, DarkSunModel],
]);

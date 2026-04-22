import { SpatialModel } from './Spatial.model.js';

const DefaultActorProperties = {
  type: 'actor',
  id: null,
  point: { x: 0, y: 0 },
};

export class ActorModel extends SpatialModel {
  constructor(options = {}) {
    const properties = {
      ...DefaultActorProperties,
      ...(options.properties ?? {}),
    };

    super({
      ...options,
      id: options.id ?? properties.id,
      type: options.type ?? properties.type,
      point: options.point ?? properties.point,
      properties,
    });
  }
}

import { SpatialModel } from './Spatial.model.js';

const DefaultTeleporterProperties = {
  type: 'teleporter',
  id: null,
  point: { x: 0, y: 0 },
  target: null,
  linkedId: null,
};

export class TeleporterModel extends SpatialModel {
  constructor(options = {}) {
    const properties = {
      ...DefaultTeleporterProperties,
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

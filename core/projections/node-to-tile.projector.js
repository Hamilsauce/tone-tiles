import { CanvasPoint } from '../../canvas/CanvasPoint.js';
import { NodeUpdated } from '../actions/node.actions.js';

const normalizeNodeSource = (nodeOrSnapshot = {}) => {
  const source = typeof nodeOrSnapshot?.data === 'function' ?
    nodeOrSnapshot.data() :
    nodeOrSnapshot;

  const point = CanvasPoint.from(source.point ?? {
    x: source.x ?? 0,
    y: source.y ?? 0,
  });

  const id = source.id ?? source.address ?? point.key;
  const address = source.address ?? id;

  return {
    ...source,
    id,
    address,
    point,
    x: point.x,
    y: point.y,
  };
};

export const projectNodeToTileModel = (nodeOrSnapshot = {}) => {
  const { properties, ...model } = normalizeNodeSource(nodeOrSnapshot);
  return model;
};

export const projectNodePatchToRenderPatch = (nodeUpdate = {}) => {
  const action = nodeUpdate.type === 'node:update' ?
    NodeUpdated(nodeUpdate) :
    NodeUpdated({
      id: nodeUpdate.id,
      data: nodeUpdate.data ?? nodeUpdate,
    });

  const { properties, ...data } = action.data ?? {};
  const hasSpatialData = data.point || data.x !== undefined || data.y !== undefined;
  const model = hasSpatialData ?
    projectNodeToTileModel({
      id: action.id,
      ...data,
    }) :
    data;

  return {
    id: action.id,
    model,
  };
};

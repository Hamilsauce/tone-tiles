import { SpatialBlocked, SpatialCollision, SpatialMove } from '../actions/spatial.actions.js';
import { createConnectionBus } from '../../core/create-connection.js';
import { rxjs } from 'rxjs';
const { operators } = rxjs;
const { concatMap, filter, share } = operators;

const CO_OCCUPANCY_RULES = {
  actor: new Set(['teleporter']),
  'dark-sun': new Set(['teleporter']),
  teleporter: new Set(['actor', 'dark-sun', 'teleporter']),
};

const canCoOccupy = (entrantType = '', occupantType = '') => {
  if (!entrantType || !occupantType) {
    return false;
  }

  if (entrantType === occupantType) {
    return false;
  }

  return !!(
    CO_OCCUPANCY_RULES[entrantType]?.has(occupantType) &&
    CO_OCCUPANCY_RULES[occupantType]?.has(entrantType)
  );
};

const getEntityType = (entity) => entity?.type ?? entity?.properties?.type ?? 'unknown';

const resolveTraversalMove = (event, graph, entities) => {
  const movingEntity = entities.get(event.id);
  const fromNodeId = graph.pointToAddress(event.prevPoint);
  const toNodeId = graph.pointToAddress(event.point);
  const toNode = graph.getNodeAtPoint(event.point);

  if (!movingEntity || !toNode) {
    return [
      SpatialBlocked({
        id: event.id,
        point: event.point,
        prevPoint: event.prevPoint,
        goalPoint: event.goalPoint,
        fromNodeId,
        toNodeId,
        blockers: [],
        reason: !movingEntity ? 'missing-entity' : 'invalid-destination',
        meta: { derived: true },
      }),
    ];
  }

  const movingType = getEntityType(movingEntity);
  const blockingEntities = toNode.objectIds
    .filter((occupantId) => occupantId !== event.id)
    .map((occupantId) => entities.get(occupantId))
    .filter((occupant) => occupant && !canCoOccupy(movingType, getEntityType(occupant)));

  if (!blockingEntities.length) {
    graph.moveObject(event.id, event.point);

    return [
      SpatialMove({
        id: event.id,
        point: event.point,
        prevPoint: event.prevPoint,
        goalPoint: event.goalPoint,
        fromNodeId,
        toNodeId,
        meta: { derived: true },
      }),
    ];
  }

  const blockers = blockingEntities.map(({ id }) => id);
  const blockerTypes = [...new Set(blockingEntities.map(getEntityType))];
  const actors = [...new Set([event.id, ...blockers])];
  const reason = blockerTypes.includes('actor') ? 'blocked-by:actor' : `blocked-by:${blockerTypes[0] ?? 'occupant'}`;

  return [
    SpatialBlocked({
      id: event.id,
      point: event.point,
      prevPoint: event.prevPoint,
      goalPoint: event.goalPoint,
      fromNodeId,
      toNodeId,
      blockers,
      reason,
      meta: { derived: true },
    }),
    SpatialCollision({
      id: event.id,
      point: event.point,
      prevPoint: event.prevPoint,
      actors,
      blockers,
      entering: event.id,
      meta: { derived: true },
    }),
  ];
};

export const derive$ = (events$, graph, entities) => {
  const base$ = events$.pipe(
    filter(event => !event.meta?.derived)
  );

  return base$.pipe(
    filter(event => event.type === 'traversal:move'),
    concatMap((event) => rxjs.from(resolveTraversalMove(event, graph, entities))),
  );
};


export class InteractionResolver {
  constructor({ entities, graph }) {
    this.graph = graph;
    this.entities = entities;

    createConnectionBus(this);

    this.in({ name: 'entities', source$: entities.out({}) });
    this.in({ name: 'graph', source$: graph.out({}) });

    this.derived$ = derive$(this.out({}), graph, entities).pipe(share());
  }

  syncEntityPosition(id, point) {
    this.graph.moveObject(id, point);
    return this;
  }
}

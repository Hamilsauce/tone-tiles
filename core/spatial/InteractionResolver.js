import { TraversalIdle, TraversalMove } from '../actions/traversal.actions.js';
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
  event.prevPoint = event.prevPoint ?? event.point;
  
  const movingEntity = entities.get(event.id);
  const toNode = graph.getNodeAtPoint(event.point);
  if (!movingEntity || !toNode) {
    return [
      TraversalIdle({
        id: event.id,
        point: event.prevPoint,
        prevPoint: event.prevPoint,
        goalPoint: event.goalPoint,
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
      TraversalMove({
        id: event.id,
        point: event.point,
        prevPoint: event.prevPoint,
        goalPoint: event.goalPoint,
        meta: { derived: true },
      }),
    ];
  }
  
  const blockerTypes = [...new Set(blockingEntities.map(getEntityType))];
  const reason = blockerTypes.includes('actor') ? 'blocked-by:actor' : `blocked-by:${blockerTypes[0] ?? 'occupant'}`;
  
  return [
    TraversalIdle({
      id: event.id,
      point: event.prevPoint,
      prevPoint: event.prevPoint,
      goalPoint: event.goalPoint,
      reason,
      meta: { derived: true },
    }),
  ];
};

export const derive$ = (events$, graph, entities) => {
  const base$ = events$.pipe(
    filter(event => !event.meta?.derived)
  );
  
  return base$.pipe(
    filter((event) => event.type === 'traversal:move'),
    concatMap((event) => rxjs.from(resolveTraversalMove(event, graph, entities))),
  );
};


export class InteractionResolver {
  constructor({ entities, graph, userEvents$ }) {
    this.graph = graph;
    this.entities = entities;
    
    createConnectionBus(this);
    
    this.in({ name: 'entities', source$: entities.out({}) });
    this.in({ name: 'graph', source$: graph.out({}) });
    this.in({ name: 'user-events', source$: userEvents$ });
    
    this.derived$ = derive$(this.out({}), graph, entities).pipe(share());
    
    this.out({ type: 'tile:click' }).subscribe((e) => {
      this.handleTileClick(e)
      return e;
    });
  }
  
  async handleTileClick({ type, detail }) {
    if (this.isSelectingLinkTile === true) return;
    
    const goalNode = this.graph.getNodeByAddress(detail.id);
    
    if (!goalNode || !goalNode.isTraversable) {
      console.warn('NO GOAL OR GOAL NOT TRAVERSABLE. Early return');
      console.warn(goalNode?.id, goalNode?.isTraversable);
      // entityCollection.get('actor1').stop();
      
      this.entities.getAll().forEach(entity => {
        if (entity.type === 'actor') {
          entity.stop();
        }
      });
      
      return;
    }
    
    this.entities.getAll().forEach(entity => {
      if (entity.type === 'actor') {
        entity.travelTo(goalNode.point);
      }
    });
  };
}

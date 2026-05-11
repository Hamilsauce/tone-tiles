import { rxjs } from 'rxjs';
import { createConnectionBus } from '../create-connection.js';
import { TraverserStepIntervalModifier, WaveGravity } from '../actions/wave.actions.js';

const { operators } = rxjs;
const { concatMap, filter, share } = operators;

const isTraverser = (entity) => !!(
  entity &&
  typeof entity.stepInterval === 'number' &&
  typeof entity.resolveAction === 'function'
);

const toPointLike = (entity) => entity?.currentPoint ?? entity?.point ?? entity?.properties?.point ?? null;

const getDistance = (p1, p2) => {
  if (!p1 || !p2) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.hypot((p1.x ?? 0) - (p2.x ?? 0), (p1.y ?? 0) - (p2.y ?? 0));
};

const createWaveEvents = (entities) => {
  return entities.entities
    .filter((entity) => entity?.type === 'big-rupture')
    .map((entity) => {
      const point = toPointLike(entity);
      const radius = entity.gravityRadius ?? entity.properties?.gravityRadius;
      const stepIntervalModifier = entity.gravityStepIntervalModifier ?? entity.properties?.stepIntervalModifier;

      if (!point || !Number.isFinite(radius) || !Number.isFinite(stepIntervalModifier) || stepIntervalModifier === 0) {
        return null;
      }

      return WaveGravity({
        id: entity.id,
        point,
        radius,
        stepIntervalModifier,
      });
    })
    .filter(Boolean);
};

const resolveWaveGravity = (event, entities) => {
  return entities.entities
    .filter((entity) => entity?.id !== event.id)
    .filter(isTraverser)
    .filter((entity) => {
      const targetPoint = toPointLike(entity);
      return getDistance(targetPoint, event.point) <= event.radius;
    })
    .map((entity) => TraverserStepIntervalModifier({
      id: entity.id,
      sourceId: event.id,
      point: toPointLike(entity),
      sourcePoint: event.point,
      modifier: event.stepIntervalModifier,
      radius: event.radius,
      meta: { derived: true },
    }));
};

export const derive$ = (events$, entities) => {
  return events$.pipe(
    filter((event) => !event.meta?.derived),
    filter((event) => event.type === 'wave:gravity'),
    concatMap((event) => rxjs.from(resolveWaveGravity(event, entities))),
  );
};

export class WaveInfluenceResolver {
  constructor({ entities, loopEngine }) {
    this.entities = entities;
    this.loopEngine = loopEngine;

    createConnectionBus(this);

    this.in({
      name: 'tick',
      source$: loopEngine.tick$.pipe(
        concatMap(() => rxjs.from(createWaveEvents(entities))),
      ),
    });

    this.derived$ = derive$(this.out({}), entities).pipe(share());
  }
}

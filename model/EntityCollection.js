// import { ModelRegistry } from '../core/types/model-registry.js';
import { ModelTypes } from '../core/types/model.types.js';
import { Collection } from '../model/Collection.js';
import { rxjs } from 'rxjs';

const { operators } = rxjs;
const { tap } = operators;

const ENTITY_TYPE_NAMES = new Map([
  [ModelTypes.ACTOR, 'actor'],
  [ModelTypes.DARKSUN, 'dark-sun'],
  [ModelTypes.TELEPORTER, 'teleporter'],
]);

const createEntityId = (typeName = 'entity') => {
  if (globalThis.crypto?.randomUUID) {
    return `${typeName}_${globalThis.crypto.randomUUID()}`;
  }
  
  return `${typeName}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
};

export class EntityCollection extends Collection {
  constructor(options = {}) {
    super({ ...options });

    const connectIn = this.in.bind(this);

    this.in = ({ name, source$, transform } = {}) => connectIn({
      name,
      source$,
      transform: (input$) => {
        const stream$ = transform ? input$.pipe(transform) : input$;
        return stream$.pipe(
          tap((event) => this.#routeResolvedEvent(event)),
        );
      },
    });
  }
  
  get entities() {
    return [...this.getAll().values()];
  }
  
  get actors() {
    return this.entities.filter((entity) => entity.type === 'actor');
  }
  
  get teleporters() {
    return this.entities.filter((entity) => entity.type === 'teleporter');
  }
  
  createEntity(type, options = {}) {
    const entity = super.create(type, this.#normalizeEntityOptions(type, options));
    
    super.emit({
      type: 'entity:create',
      id: entity.id,
      data: entity.data(),
    });
    
    return entity;
  }
  
  
  createActor(options = {}) {
    return this.createEntity(ModelTypes.ACTOR, options);
  }
  
  createDarkSun(options = {}) {
    console.warn('creating dark sun with options', options);
    return this.createEntity(ModelTypes.DARKSUN, options);
  }
  createTeleporter(options = {}) {
    return this.createEntity(ModelTypes.TELEPORTER, options);
  }
  
  remove(id) {
    const entity = this.get(id);
    super.remove(id);
    
    if (entity) {
      this.emit({
        type: 'entity:remove',
        id,
        data: entity.data(),
      });
    }
    
    return entity;
  }
  
  #normalizeEntityOptions(type, options = {}) {
    const typeName = options.type ?? options.properties?.type ?? ENTITY_TYPE_NAMES.get(type) ?? 'entity';
    const point = options.point ?? options.properties?.point ?? { x: 0, y: 0 };
    const properties = { ...(options.properties ?? {}) };
    delete properties.point;
    const id = options.id ?? options.properties?.id ?? createEntityId(typeName);
    
    return {
      ...options,
      id,
      type: typeName,
      point,
      properties: {
        ...properties,
        id,
        type: typeName,
      },
    };
  }

  #routeResolvedEvent(event = {}) {
    if (!event?.meta?.derived) {
      return;
    }

    if (event.type === 'spatial:move' || event.type === 'spatial:blocked') {
      this.get(event.id)?.resolveAction?.(event);
      return;
    }

    if (event.type === 'interaction:collision') {
      [...new Set(event.actors ?? [])].forEach((id) => {
        this.get(id)?.resolveAction?.(event);
      });
    }
  }
}

let entities;

const getEntities = () => {
  if (entities) {
    return entities;
  }
  
  return entities = new EntityCollection();
};

export default getEntities;

import { CanvasObject, DefaultCanvasObjectOptions } from './CanvasObject.js';

const DefaultCanvasActorModel = {
  x: 0,
  y: 0,
  moving: false,
  teleporting: false,
};

export class CanvasActor extends CanvasObject {
  #entityModel = null;
  #ticker = 0;

  constructor(ctx, options = DefaultCanvasObjectOptions) {
    const model = {
      ...DefaultCanvasActorModel,
      ...(options.model ?? {}),
    };

    super(ctx, 'actor', {
      ...options,
      model,
    });
  }

  get entityModel() {
    return this.#entityModel;
  }

  get currentNode() {
    return this.#entityModel?.currentNode ?? null;
  }

  get currentPoint() {
    return this.#entityModel?.currentPoint ?? this.model.point;
  }

  get goalNode() {
    return this.#entityModel?.goalNode ?? null;
  }

  get goalPoint() {
    return this.#entityModel?.goalPoint ?? null;
  }

  update(patch) {
    super.update(patch);
    this.#ticker = this.#ticker === 0 ? 1 : 0;
    if (this.#ticker === 0) {
      this.rotateTo(20, 0.5, 0.5);
    }
    else {
      this.rotateTo(-20, 0.5, 0.5);

    }
  }

  configure({ model } = {}) {
    if (model) {
      this.#entityModel = model;
    }

    return this;
  }

  resetTraversal(startNode) {
    return this.#entityModel?.resetTraversal(startNode);
  }

  travelTo(goalNode) {
    return this.#entityModel?.travelTo(goalNode);
  }

  stop() {
    return this.#entityModel?.stop();
  }
}

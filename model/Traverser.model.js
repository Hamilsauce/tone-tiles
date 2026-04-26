import { SpatialModel } from './Spatial.model.js';
import { getTraversal } from './graph.model.js';
import { DefaultModelOptions } from './Model.js';
import { Point } from '../core/spatial/Point.js';
import {
  TraversalError,
  TraversalGoal,
  TraversalIdle,
  TraversalMove,
  TraversalStart,
  TraversalStop,
} from '../core/actions/traversal.actions.js';

const DefaultTraverserOptions = {
  point: { x: 0, y: 0 },
  isMoving: false,
  isTraversing: false,
  teleporting: false,
  idleReason: null,
  goalPoint: null,
  ...DefaultModelOptions,
};

let createTraversal;
export const toPoint = (value) => Point.from(value?.point ?? value);

export class TraverserModel extends SpatialModel {
  #traversalGen = null;
  #goalPoint = null;
  #idleReason = null;
  #dtSum = 0;
  #stepInterval = 0.1;
  #isStepping = false;
  // #step = null;

  constructor(options = DefaultTraverserOptions) {
    super(options);
    createTraversal = getTraversal();
    this.#traversalGen = createTraversal(this.point, () => this.goalPoint);
    this.#stepInterval = options.stepInterval ?? 0.1;
    this.step = this.#step.bind(this);
    this.stop = this.#stopTraversal.bind(this);
    this.resetTraversal = this.#resetTraversal.bind(this);
  }

  get stepInterval() {
    return this.#stepInterval;
  }

  set stepInterval(value) {
    this.#stepInterval = value;
  }

  get isMoving() {
    return !!this.properties.isMoving;
  }

  get isTraversing() {
    return !!this.properties.isTraversing;
  }

  get currentPoint() {
    return this.point;
  }

  get idleReason() {
    return this.properties.idleReason ?? null;
  }

  get goalPoint() {
    return this.#goalPoint;
  }

  // --- Traversal Hooks for subclasses ---
  onTraversalStart(_context) { }
  onMove(_context) { }
  onGoal(_context) { }
  onIdle(_context) { }
  onTraversalEnd(_context) { }
  onTraversalError(_context) { }

  setMoving(value = true) {
    if (this.isMoving === value) return this;
    this.update({ isMoving: value });
    return this;
  }

  setTeleporting(value = true) {
    if (this.properties.teleporting === value) return this;
    this.update({ teleporting: value });
    return this;
  }

  travelTo(goalPoint) {
    const goal = toPoint(goalPoint);

    this.setGoalPoint(goal);
    this.#idleReason = null;
    this.update({ idleReason: null });

    if (!this.#traversalGen) {
      this.#traversalGen = createTraversal(this.currentPoint, () => this.goalPoint);
    }

    return true;
  }

  setGoalPoint(goalPoint = null) {
    this.#goalPoint = goalPoint ? Point.from(goalPoint) : null;
    this.properties.goalPoint = this.#goalPoint;
    return this;
  }

  #clearGoalPoint() {
    return this.setGoalPoint(null);
  }

  #setIdleReason(reason = null) {
    if (this.properties.idleReason === reason) return this;
    this.#idleReason = reason;
    this.update({ idleReason: reason });
    return this;
  }

  #resetTraversal(startPoint = this.currentPoint) {
    const start = toPoint(startPoint);
    this.#destroyTraversal();

    if (start) {
      this.syncPoint(start);
    }

    this.#idleReason = null;
    this.#dtSum = 0;
    this.#isStepping = false;
    this.update({
      isTraversing: false,
      idleReason: null,
    });

    this.#traversalGen = this.goalPoint ? createTraversal(start, () => this.goalPoint) : null;

    return this;
  }

  #stopTraversal(reason = 'stopped') {
    const context = this.#createContext({
      point: this.currentPoint,
      goalPoint: this.goalPoint,
      reason,
    });

    this.#destroyTraversal();
    this.update({
      isTraversing: false,
      idleReason: null,
    });

    this.#clearGoalPoint();
    this.#idleReason = null;

    this.#emitTraversalAction(TraversalStop, context);
    this.onTraversalEnd(context);

    return this;
  }

  #destroyTraversal() {
    this.#traversalGen?.return?.();
    this.#traversalGen = null;
    this.#dtSum = 0;
    this.#isStepping = false;
    return this;
  }

  async #step(dt = 0) {
    if (!this.goalPoint) {
      return;
    }

    this.#dtSum += dt;
    if (this.#dtSum <= this.#stepInterval || this.#isStepping) {
      return;
    }

    this.#dtSum = 0;
    this.#isStepping = true;

    try {
      if (!this.#traversalGen) {
        this.#traversalGen = createTraversal(this.currentPoint, () => this.goalPoint);
      }

      if (!this.isTraversing) {
        const startContext = this.#createContext({
          point: this.currentPoint,
          goalPoint: this.goalPoint,
        });

        this.update({
          isTraversing: true,
          idleReason: null,
        });

        this.#emitTraversalAction(TraversalStart, startContext);
        await this.onTraversalStart(startContext);

        if (this.currentPoint?.equals?.(this.goalPoint)) {
          this.#handleTraversalGoal(this.currentPoint);
          return;
        }
      }

      const nextValue = this.#traversalGen?.next().value;
      const nextPoint = nextValue ? toPoint(nextValue) : null;

      if (!nextPoint) {
        this.#handleTraversalIdle('no-point');
        return;
      }
      if (this.currentPoint?.equals?.(nextPoint)) {
        // The graph traversal yields the current/start point first.
        // Consume that no-op step without translating it into an idle lifecycle event.
        return;
      }

      await this.#handleTraversalMove(nextPoint);

      if (this.goalPoint?.equals?.(this.currentPoint)) {
        this.#handleTraversalGoal(this.currentPoint);
      }
    } catch (error) {
      this.#handleTraversalError(error);
    } finally {
      this.#isStepping = false;
    }
  }

  async #handleTraversalMove(nextPoint) {
    const prevPoint = this.currentPoint;
    const point = toPoint(nextPoint);

    this.syncPoint(point);
    this.#idleReason = null;
    this.update({
      isTraversing: true,
      idleReason: null,
    });

    const context = this.#createContext({
      prevPoint,
      point: this.currentPoint,
      goalPoint: this.goalPoint,
    });

    this.#emitTraversalAction(TraversalMove, context);
    await this.onMove(context);

    return context;
  }

  #handleTraversalGoal(point = this.currentPoint) {
    const context = this.#createContext({
      point,
      goalPoint: this.goalPoint,
    });

    this.#emitTraversalAction(TraversalGoal, context);
    this.onGoal(context);

    if (!this.goalPoint || toPoint(point).equals(this.goalPoint)) {
      this.#stopTraversal('goal');
    } else {
      this.#traversalGen = createTraversal(this.currentPoint, () => this.goalPoint);
    }

    return this;
  }

  #handleTraversalIdle(reason = 'idle') {
    if (this.#idleReason === reason) {
      return this;
    }

    this.#idleReason = reason;
    this.update({
      isTraversing: false,
      idleReason: reason,
    });

    const context = this.#createContext({
      point: this.currentPoint,
      goalPoint: this.goalPoint,
      reason,
    });

    this.#emitTraversalAction(TraversalIdle, context);
    this.onIdle(context);

    return this;
  }

  #handleTraversalError(error) {
    const context = this.#createContext({
      point: this.currentPoint,
      goalPoint: this.goalPoint,
      error,
    });

    this.#emitTraversalAction(TraversalError, context);
    this.onTraversalError(context);

    return this;
  }

  #createContext(overrides = {}) {
    return {
      id: this.id,
      point: toPoint(overrides.point ?? this.currentPoint),
      prevPoint: overrides.prevPoint ? toPoint(overrides.prevPoint) : undefined,
      goalPoint: overrides.goalPoint ? toPoint(overrides.goalPoint) : (this.goalPoint ?? undefined),
      reason: overrides.reason,
      error: overrides.error,
      model: this,
    };
  }

  #emitTraversalAction(createAction, context) {
    const payload = {
      id: this.id,
      point: context.point,
    };

    if (context.prevPoint) payload.prevPoint = context.prevPoint;
    if (context.goalPoint) payload.goalPoint = context.goalPoint;
    if (context.reason) payload.reason = context.reason;
    if (context.error) payload.error = context.error;

    this.emit?.(createAction(payload));
  }

  destroy() {
    this.#destroyTraversal();
    return this;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      point: this.point,
    };
  }
}

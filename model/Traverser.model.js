import { SpatialModel, DefaultSpatialProperties } from './Spatial.model.js';
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

export const DefaultTraverserProperties = {
  direction: null,
  isTraversing: false,
  teleporting: false,
  idleReason: null,
  goalPoint: null,
  prevPoint: null,
};

const DefaultTraverserOptions = {
  traversal: { ...DefaultTraverserProperties },
  // ...DefaultSpatialProperties,
};

let createTraversal;
export const toPoint = (value) => Point.from(value?.point ?? value);

export class TraverserModel extends SpatialModel {
  #traversalGen = null;
  #goalPoint = null;
  #idleReason = null;
  #dtSum = 0;
  #stepInterval = 0.1;
  #stepIntervalModifier = 0;
  #stepIntervalModifierSourceId = null;
  #isStepping = false;
  #traversal = { ...DefaultTraverserProperties }
  // #step
  // #handleTraversalGoal
  // #handleTraversalIdle
  // #handleTraversalMove
  // #handleTraversalError
  // #stopTraversal
  // #resetTraversal
  // #destroyTraversal
  // #createContext
  // #emitTraversalAction
  
  constructor(options = DefaultTraverserOptions) {
    super(options);
    createTraversal = getTraversal();
    this.#traversalGen = createTraversal(this.point);
    this.#stepInterval = options.stepInterval ?? 0.1;
    this.step = this.#step.bind(this);
    this.stop = this.#stopTraversal.bind(this);
    this.resetTraversal = this.#resetTraversal.bind(this);
    
    this.update = this.update.bind(this);
    // this.#stopTraversal = this.#stopTraversal.bind(this);
  }
  
  get stepInterval() {
    return this.#stepInterval;
  }
  
  set stepInterval(value) {
    this.#stepInterval = value;
  }
  
  get stepIntervalModifier() {
    return this.#stepIntervalModifier;
  }
  
  get effectiveStepInterval() {
    return Math.max(0.01, this.#stepInterval - this.#stepIntervalModifier);
  }
  
  // get isMoving() {
  //   return !!this.properties.isMoving;
  // }
  
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
  onTraversalStart(_context) {}
  onMove(_context) {}
  onBlocked(_context) {}
  onGoal(_context) {}
  onIdle(_context) {}
  onTraversalEnd(_context) {}
  onTraversalError(_context) {}
  
  update({ direction, isTraversing, prevPoint, goalPoint, idleReason, ...rest }) {
    // update(payload = {}) {
    
    let traversal = {}
    const attributeMap = { direction, isTraversing, prevPoint, goalPoint }
    
    traversal = Object.entries(attributeMap).reduce((ptch, [k, v]) => {
      const modelV = this.#traversal[k];
      if (v === undefined || modelV === undefined || v === modelV) return ptch;
      
      const isValid = !(v === undefined || modelV === undefined);
      
      ptch = ptch ?? {};
      this.#traversal[k] = v;
      ptch[k] = v;
      
      return ptch;
    }, null);
    
    if (!traversal) {
      return super.update({ ...rest })
    };
    
    return super.update({
      traversal,
      ...rest
    })
    
    return this;
  }
  
  
  resolveAction(event = {}) {
    if (event.type === 'spatial:move') {
      this.commitResolvedMove(event);
      return this;
    }
    
    if (event.type === 'spatial:blocked') {
      this.handleBlockedMove(event);
      return this;
    }
    
    if (event.type === 'traverser:step-interval-modifier') {
      this.applyStepIntervalModifier(event.modifier, event.sourceId);
      return this;
    }
    
    return this;
  }
  
  applyStepIntervalModifier(value = 0, sourceId = null) {
    if (!Number.isFinite(value) || value === 0 || this.#stepIntervalModifier !== 0) {
      return false;
    }
    
    this.#stepIntervalModifier = value;
    this.#stepIntervalModifierSourceId = sourceId;
    
    return true;
  }
  
  clearStepIntervalModifier() {
    this.#stepIntervalModifier = 0;
    this.#stepIntervalModifierSourceId = null;
    return this;
  }
  
  // setMoving(value = true) {
  //   if (this.isMoving === value) return this;
  //   this.update({ isMoving: value });
  //   return this;
  // }
  
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
      this.#traversalGen = createTraversal(this.currentPoint);
    }
    
    return true;
  }
  
  setGoalPoint(goalPoint = null) {
    this.#goalPoint = goalPoint ? Point.from(goalPoint) : null;
    this.properties.goalPoint = this.#goalPoint;
    return this;
  }
  
  commitResolvedMove({ point, goalPoint } = {}) {
    const nextPoint = toPoint(point ?? this.currentPoint);
    this.syncPoint(nextPoint);
    this.#idleReason = null;
    
    this.update({
      point: this.currentPoint,
      goalPoint: goalPoint ? toPoint(goalPoint) : this.goalPoint,
      isTraversing: true,
      idleReason: null,
    });
    
    return this;
  }
  
  handleBlockedMove(e) {
    this.resetTraversal(e.prevPoint);
    this.#clearGoalPoint()
    this.onBlocked(e)
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
    
    this.#traversalGen = this.goalPoint ? createTraversal(start) : null;
    
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
    try {
      if (!this.goalPoint) {
        return;
      }
      
      this.#dtSum += dt;
      if (this.#dtSum <= this.effectiveStepInterval || this.#isStepping) {
        return;
      }
      
      this.#dtSum = 0;
      this.#isStepping = true;
      
      if (!this.#traversalGen) {
        this.#traversalGen = createTraversal(this.currentPoint);
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
      
      if (this.goalPoint && this.currentPoint?.equals?.(this.goalPoint)) {
        this.#handleTraversalGoal(this.currentPoint);
        return;
      }
      
      const nextValue = this.#traversalGen?.next(this.goalPoint).value;
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
    } catch (error) {
      this.#handleTraversalError(error);
    } finally {
      this.#isStepping = false;
      this.clearStepIntervalModifier();
    }
  }
  
  async #handleTraversalMove(nextPoint) {
    const prevPoint = this.currentPoint;
    const point = toPoint(nextPoint);
    
    this.#idleReason = null;
    this.update({
      isTraversing: true,
      idleReason: null,
    });
    
    const context = this.#createContext({
      prevPoint,
      point,
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
      this.stop('goal');
    } else {
      this.#traversalGen = createTraversal(this.currentPoint);
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
  
  #emitTraversalAction(action, context) {
    const payload = {
      id: this.id,
      point: context.point,
    };
    
    if (context.prevPoint) payload.prevPoint = context.prevPoint;
    if (context.goalPoint) payload.goalPoint = context.goalPoint;
    if (context.reason) payload.reason = context.reason;
    if (context.error) payload.error = context.error;
    
    this.emit?.(action(payload));
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
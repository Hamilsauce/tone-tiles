// import { SpatialModel } from './Spatial.model.js';
// import { Point } from '../core/Point.js';
// import { getTraversal } from './graph.model.js';
// import {
//   TraversalError,
//   TraversalGoal,
//   TraversalIdle,
//   TraversalMove,
//   TraversalStart,
//   TraversalStop,
// } from '../core/actions/traversal.actions.js';

// const DefaultTraversingSpatialProperties = {
//   point: { x: 0, y: 0 },
//   isTraversing: false,
//   goalPoint: null,
//   idleReason: null,
// };

// const toPoint = (value) => Point.from(value?.point ?? value);
// const createTraversal = getTraversal();

// export class TraversingSpatialModel extends SpatialModel {
//   #traversalGen = null;
//   #goalPoint = null;
//   #idleReason = null;
//   #dtSum = 0;
//   #stepInterval = 0.1;
//   #isStepping = false;

//   constructor(options = {}) {
//     const properties = {
//       ...DefaultTraversingSpatialProperties,
//       ...(options.properties ?? {}),
//     };

//     super({
//       ...options,
//       point: options.point ?? properties.point,
//       properties,
//     });

//     this.#goalPoint = properties.goalPoint ? toPoint(properties.goalPoint) : null;
//     this.#stepInterval = options.stepInterval ?? 0.1;
//     this.step = this.step.bind(this);
//   }

//   get goalPoint() {
//     return this.#goalPoint;
//   }

//   get currentPoint() {
//     return this.point;
//   }

//   get isTraversing() {
//     return !!this.properties.isTraversing;
//   }

//   get idleReason() {
//     return this.properties.idleReason ?? null;
//   }

//   get stepInterval() {
//     return this.#stepInterval;
//   }

//   set stepInterval(value) {
//     this.#stepInterval = value;
//   }

//   setGoalPoint(goalPoint = null) {
//     this.#goalPoint = goalPoint ? toPoint(goalPoint) : null;
//     this.properties.goalPoint = this.#goalPoint;
//     return this;
//   }

//   clearGoalPoint() {
//     return this.setGoalPoint(null);
//   }

//   resetTraversal(startPoint = this.currentPoint) {
//     const start = toPoint(startPoint);
//     this.destroyTraversal();

//     if (start) {
//       this.syncPoint(start);
//     }

//     this.#idleReason = null;
//     this.#dtSum = 0;
//     this.#isStepping = false;
//     this.update({
//       isTraversing: false,
//       idleReason: null,
//     });

//     this.#traversalGen = this.goalPoint ? createTraversal(start, () => this.goalPoint) : null;

//     return this;
//   }

//   travelTo(goalPoint) {
//     const goal = toPoint(goalPoint);

//     this.setGoalPoint(goal);
//     this.#idleReason = null;
//     this.update({ idleReason: null });

//     if (!this.#traversalGen) {
//       this.#traversalGen = createTraversal(this.currentPoint, () => this.goalPoint);
//     }

//     return true;
//   }

//   stopTraversal(reason = 'stopped') {
//     const context = this.#createContext({
//       point: this.currentPoint,
//       goalPoint: this.goalPoint,
//       reason,
//     });

//     this.destroyTraversal();
//     this.update({
//       isTraversing: false,
//       idleReason: null,
//     });

//     this.clearGoalPoint();
//     this.#idleReason = null;

//     this.#emitTraversalAction(TraversalStop, context);
//     this.onTraversalEnd(context);

//     return this;
//   }

//   destroyTraversal() {
//     this.#traversalGen?.return?.();
//     this.#traversalGen = null;
//     this.#dtSum = 0;
//     this.#isStepping = false;
//     return this;
//   }

//   async step(dt = 0) {
//     if (!this.goalPoint) {
//       return;
//     }

//     this.#dtSum += dt;
//     if (this.#dtSum <= this.#stepInterval || this.#isStepping) {
//       return;
//     }

//     this.#dtSum = 0;
//     this.#isStepping = true;

//     try {
//       if (!this.#traversalGen) {
//         this.#traversalGen = createTraversal(this.currentPoint, () => this.goalPoint);
//       }

//       if (!this.isTraversing) {
//         const startContext = this.#createContext({
//           point: this.currentPoint,
//           goalPoint: this.goalPoint,
//         });

//         this.update({
//           isTraversing: true,
//           idleReason: null,
//         });

//         this.#emitTraversalAction(TraversalStart, startContext);
//         await this.onTraversalStart(startContext);

//         if (this.currentPoint?.equals?.(this.goalPoint)) {
//           this.handleTraversalGoal(this.currentPoint);
//           return;
//         }
//       }

//       const nextValue = this.#traversalGen?.next().value;
//       const nextPoint = nextValue ? toPoint(nextValue) : null;

//       if (!nextPoint) {
//         this.handleTraversalIdle('no-point');
//         return;
//       }

//       if (this.currentPoint?.equals?.(nextPoint)) {
//         this.handleTraversalIdle('same-point');
//         return;
//       }

//       await this.handleTraversalMove(nextPoint);

//       if (this.goalPoint?.equals?.(this.currentPoint)) {
//         this.handleTraversalGoal(this.currentPoint);
//       }
//     } catch (error) {
//       this.handleTraversalError(error);
//     } finally {
//       this.#isStepping = false;
//     }
//   }

//   async handleTraversalMove(nextPoint) {
//     const prevPoint = this.currentPoint;
//     const point = toPoint(nextPoint);

//     this.syncPoint(point);
//     this.#idleReason = null;
//     this.update({
//       isTraversing: true,
//       idleReason: null,
//     });

//     const context = this.#createContext({
//       prevPoint,
//       point: this.currentPoint,
//       goalPoint: this.goalPoint,
//     });

//     this.#emitTraversalAction(TraversalMove, context);
//     await this.onMove(context);

//     return context;
//   }

//   handleTraversalGoal(point = this.currentPoint) {
//     const context = this.#createContext({
//       point,
//       goalPoint: this.goalPoint,
//     });

//     this.#emitTraversalAction(TraversalGoal, context);
//     this.onGoal(context);

//     if (!this.goalPoint || toPoint(point).equals(this.goalPoint)) {
//       this.stopTraversal('goal');
//     } else {
//       this.#traversalGen = createTraversal(this.currentPoint, () => this.goalPoint);
//     }

//     return this;
//   }

//   handleTraversalIdle(reason = 'idle') {
//     if (this.#idleReason === reason) {
//       return this;
//     }

//     this.#idleReason = reason;
//     this.update({
//       isTraversing: false,
//       idleReason: reason,
//     });

//     const context = this.#createContext({
//       point: this.currentPoint,
//       goalPoint: this.goalPoint,
//       reason,
//     });

//     this.#emitTraversalAction(TraversalIdle, context);
//     this.onIdle(context);

//     return this;
//   }

//   handleTraversalError(error) {
//     const context = this.#createContext({
//       point: this.currentPoint,
//       goalPoint: this.goalPoint,
//       error,
//     });

//     this.#emitTraversalAction(TraversalError, context);
//     this.onTraversalError(context);

//     return this;
//   }

//   onTraversalStart(_context) { }
//   onMove(_context) { }
//   onGoal(_context) { }
//   onIdle(_context) { }
//   onTraversalEnd(_context) { }
//   onTraversalError(_context) { }

//   destroy() {
//     this.destroyTraversal();
//     return this;
//   }

//   toJSON() {
//     return {
//       ...super.toJSON(),
//       point: this.point,
//     };
//   }

//   #createContext(overrides = {}) {
//     return {
//       id: this.id,
//       point: toPoint(overrides.point ?? this.currentPoint),
//       prevPoint: overrides.prevPoint ? toPoint(overrides.prevPoint) : undefined,
//       goalPoint: overrides.goalPoint ? toPoint(overrides.goalPoint) : (this.goalPoint ?? undefined),
//       reason: overrides.reason,
//       error: overrides.error,
//       model: this,
//     };
//   }

//   #emitTraversalAction(createAction, context) {
//     const payload = {
//       id: this.id,
//       point: context.point,
//     };

//     if (context.prevPoint) payload.prevPoint = context.prevPoint;
//     if (context.goalPoint) payload.goalPoint = context.goalPoint;
//     if (context.reason) payload.reason = context.reason;
//     if (context.error) payload.error = context.error;

//     this.emit?.(createAction(payload));
//   }
// }

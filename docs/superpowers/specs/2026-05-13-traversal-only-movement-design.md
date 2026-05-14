# Traversal-Only Movement Design

Date: 2026-05-13

## Goal

Make traversal events the only movement contract in the system.

After this change:

- The only movement lifecycle events emitted or consumed are `traversal:start`, `traversal:move`, `traversal:goal`, `traversal:idle`, and `traversal:stop`.
- `InteractionResolver` emits only `traversal:*`.
- No code listens to `spatial:move` or `spatial:blocked`.
- No traversal-to-spatial bridge exists anywhere in the runtime.

## Hard Constraints

- Do not introduce transitional architecture.
- Do not add adapter layers or bridge layers.
- Do not invent replacement movement event names.
- Do not create new public semantics beyond the existing `traversal:*` lifecycle.
- Preserve the current graph-backed resolution model where movement intent is validated against world occupancy before it is committed.

## Problem

The current architecture splits movement into two overlapping public surfaces:

1. `TraverserModel` emits `traversal:*`.
2. `InteractionResolver` translates traversal events into `spatial:*`.
3. Models and render subscriptions consume `spatial:*` and then restate movement back into model state.

That translation layer creates semantic drift:

- `traversal:start`, `traversal:goal`, and `traversal:stop` can be converted into fake `spatial:move` events.
- Consumers treat any `spatial:move` as proof that traversal is active.
- `isTraversing` can flip back to `true` after traversal has already ended.

The bug is a symptom of the deeper issue: movement has two public event vocabularies, and one is pretending to be the other.

## Design Summary

Keep the existing intent -> resolution -> commit loop, but make `traversal:*` the only public event surface.

The final shape should be:

1. A traverser decides it wants to take a step toward `goalPoint`.
2. That step is resolved against graph occupancy in `InteractionResolver`.
3. The traverser commits the accepted result or handles the blocked result.
4. Only traversal lifecycle events are emitted for downstream consumers.
5. Rendering, audio, map transitions, and autonomous entity behavior subscribe only to `traversal:*`.

`spatial:*` stops existing as a movement contract.

## Event Semantics

### `traversal:start`

Emitted when traversal begins for a goal.

Consumers may use it for:

- start-of-travel visuals
- tile goal highlighting
- audio cue initialization

It must not imply that a move was committed.

### `traversal:move`

Emitted only after a move has been resolved and committed.

This is the key semantic correction in the refactor.

Requirements:

- `point` is the committed destination.
- `prevPoint` is the committed origin.
- `goalPoint` is the current goal for the traversal.
- If the move was blocked, no `traversal:move` event is emitted.

Every downstream consumer that currently uses `spatial:move` should move to `traversal:move`.

### `traversal:goal`

Emitted when the traverser reaches its goal.

Consumers may use it for:

- goal-complete cleanup
- map transition behavior
- autonomous waypoint progression

It must not be transformed into a move-like event.

### `traversal:idle`

Remains the existing non-progress event.

Blocked movement is represented using the existing `traversal:idle` event plus existing fields:

- `point`
- `goalPoint`
- `reason`

No new blocked-specific public event is introduced.

Blocked attempts should use a stable `reason` string that stays within the current idle-reason model.

### `traversal:stop`

Emitted when traversal is explicitly stopped or ends cleanly after goal resolution.

It must never produce downstream move behavior.

## Resolver Responsibilities

`InteractionResolver` continues to own world resolution, but not event translation.

It should:

- read traversal intent
- validate destination occupancy against the graph
- update graph occupancy for committed moves
- produce traversal-scoped outcomes only
- preserve collision and blockage consequences without emitting `spatial:*`

It should not:

- emit `spatial:move`
- emit `spatial:blocked`
- translate traversal lifecycle events into a second public event vocabulary

## Model Responsibilities

### `TraverserModel`

`TraverserModel` should stop treating pre-resolution traversal events as public committed movement.

The model should:

- initiate traversal
- request the next step
- commit accepted moves
- handle blocked or idle outcomes
- emit traversal lifecycle events only when those lifecycle events are true

The important behavioral change is:

- `traversal:move` becomes a committed-move event, not an attempted-step event.

### `ActorModel`

`ActorModel` should continue to derive direction and pacing from committed traversal movement.

No actor-specific movement bridge should survive this refactor.

### `DarkSunModel` and `BigRuptureModel`

These models currently react to `spatial:blocked` to reverse course.

After the refactor they should react through traversal-only signals, using `traversal:idle` plus `reason` and `goalPoint`.

That keeps their behavior intact without preserving a second movement vocabulary.

## Runtime and Rendering Responsibilities

`run-canvas.js` should subscribe only to `traversal:*` for movement lifecycle behavior.

This includes:

- actor visual movement
- dark sun visual movement
- big rupture visual movement
- traversal sound effects
- map-link handling
- tile highlighting
- traversal cleanup

Any subscriber currently using `spatial:move` or `spatial:blocked` must be moved to `traversal:*`.

`CanvasActor` should remain passive. It should respond only to the traversal state it receives and should not need any special-case protection against fake move events after this refactor.

## Collision and Blocked Effects

The current runtime uses `spatial:blocked` and `interaction:collision` for recoil and collision feedback.

This refactor keeps the traversal-only listener rule by deriving those side effects from traversal events and graph state, not from a second public movement event stream.

Acceptable sources for those effects:

- `traversal:idle` with a blocked reason
- current graph occupancy at `goalPoint`
- current entity state already available in collections

Not acceptable:

- keeping `spatial:blocked` as a hidden internal event
- translating `traversal:idle` into a renamed blocked event
- inventing a new collision event family to replace `spatial:*`

If a blocked-only effect cannot be represented cleanly from existing traversal data, it should be removed rather than reintroduced through bridge architecture.

## Data Flow After Refactor

1. User input or autonomous waypoint logic sets `goalPoint`.
2. Traverser starts traversal and emits `traversal:start`.
3. Traverser requests a step.
4. Resolver checks occupancy and path validity.
5. If accepted:
   - graph occupancy updates
   - model commits the move
   - `traversal:move` emits with committed `prevPoint` and `point`
6. If blocked or no progress:
   - model does not emit `traversal:move`
   - model emits `traversal:idle` with an appropriate existing `reason`
7. On arrival:
   - `traversal:goal` emits
   - traversal ends with `traversal:stop` when appropriate

## Files Expected To Change

- `core/spatial/InteractionResolver.js`
- `model/Traverser.model.js`
- `model/EntityCollection.js`
- `model/DarkSun.model.js`
- `model/BigRupture.model.js`
- `run-canvas.js`
- `PROJECT_CONTEXT.md`

Possibly:

- `core/actions/traversal.actions.js` if payload validation needs to tighten around committed traversal semantics
- `core/actions/spatial.actions.js` if it becomes dead code and is safe to remove

## Non-Goals

- No broader rename or rewrite of traversal concepts
- No event bus overhaul
- No graph subsystem rewrite
- No new model hierarchy
- No attempt to preserve `spatial:*` as compatibility shims

## Risks

### Blocked behavior regression

Blocked behavior currently depends on `spatial:blocked`.

Mitigation:

- identify every blocked consumer before removing it
- move each one to traversal-only inputs or remove it explicitly

### Collision feedback drift

Collision audio or recoil may currently rely on data that was bundled into old resolver events.

Mitigation:

- verify each blocked/collision effect against existing traversal and graph state
- remove effects that cannot be represented cleanly without violating the constraints

### Premature move emission

If `traversal:move` is still emitted before resolution anywhere, the architecture remains split in practice even if `spatial:*` disappears.

Mitigation:

- make committed traversal movement the single invariant of `traversal:move`

## Testing

Verification should cover:

1. Actor traversal emits `traversal:start -> traversal:move* -> traversal:goal -> traversal:stop` without a false-to-true `isTraversing` rebound after stop.
2. `InteractionResolver` emits only `traversal:*`.
3. No runtime subscription listens to `spatial:move` or `spatial:blocked`.
4. Actor, dark sun, and big rupture still move visually from committed traversal events.
5. Blocked movement still reverses autonomous entities where that behavior exists.
6. Map-link and teleport behavior still work under traversal-only subscriptions.

## Recommendation

Implement the strict cutover in one pass rather than incrementally.

A partial migration would violate the main constraint of the change, because any coexistence period between traversal and spatial movement semantics recreates the bridge architecture we are explicitly trying to remove.

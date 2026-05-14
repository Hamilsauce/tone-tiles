# Traversal-Only Movement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove `spatial:move` and `spatial:blocked` from the movement pipeline so `InteractionResolver` only emits `traversal:*`, and every movement consumer listens only to `traversal:*`.

**Architecture:** Keep the existing intent -> resolution -> commit flow, but collapse the public movement surface down to traversal lifecycle events only. `traversal:move` becomes the committed move event, blocked attempts become `traversal:idle` with existing fields, and rendering/audio/model hooks subscribe only to traversal events.

**Tech Stack:** Browser ES modules, RxJS connection buses, model/collection event streams, SVG canvas rendering

---

### Task 1: Move Resolution Becomes Traversal-Native

**Files:**
- Modify: `/Users/jake.hamilton/source/tone-tiles/model/Traverser.model.js`
- Modify: `/Users/jake.hamilton/source/tone-tiles/core/spatial/InteractionResolver.js`
- Modify: `/Users/jake.hamilton/source/tone-tiles/model/EntityCollection.js`

- [ ] **Step 1: Capture the current broken behavior**

Run:

```bash
rg -n "type: 'spatial:move'|type: 'spatial:blocked'|event.type === 'spatial:move'|event.type === 'spatial:blocked'" \
  /Users/jake.hamilton/source/tone-tiles/model \
  /Users/jake.hamilton/source/tone-tiles/core \
  /Users/jake.hamilton/source/tone-tiles/run-canvas.js
```

Expected:

```text
InteractionResolver emits spatial:* events and EntityCollection/TraverserModel consume them.
```

- [ ] **Step 2: Rewrite traversal resolution so committed moves stay in traversal semantics**

Implement the core cutover in these shapes:

```js
// Traverser.model.js
resolveAction(event = {}) {
  if (event.type === 'traversal:move') {
    this.commitResolvedMove(event);
    return this;
  }

  if (event.type === 'traversal:idle') {
    this.handleBlockedMove(event);
    return this;
  }

  if (event.type === 'traverser:step-interval-modifier') {
    this.applyStepIntervalModifier(event.modifier, event.sourceId);
    return this;
  }

  return this;
}
```

```js
// InteractionResolver.js
return base$.pipe(
  filter((event) => event.type === 'traversal:move'),
  concatMap((event) => rxjs.from(resolveTraversalMove(event, graph, entities))),
);
```

```js
// InteractionResolver.js
if (!blockingEntities.length) {
  graph.moveObject(event.id, event.point);
  return [TraversalMove({ ...resolvedPayload, meta: { derived: true } })];
}

return [TraversalIdle({ id: event.id, point: event.prevPoint, goalPoint: event.goalPoint, reason })];
```

- [ ] **Step 3: Make `traversal:move` emit only after commit**

Refactor the traversal model so this pre-resolution flow:

```js
this.#emitTraversalAction(TraversalMove, context);
await this.onMove(context);
```

becomes a committed-move flow shaped like:

```js
await this.onMove(context);
this.commitResolvedMove(context);
this.#emitTraversalAction(TraversalMove, committedContext);
```

with the invariant that:

```js
// committedContext.point is the accepted point in graph occupancy
// committedContext.prevPoint is the last committed point
// blocked attempts do not emit TraversalMove
```

- [ ] **Step 4: Remove spatial routing from entity resolution**

Delete the old routing and keep only traversal-native derived events:

```js
if (event.type === 'traversal:move' || event.type === 'traversal:idle') {
  this.get(event.id)?.resolveAction?.(event);
  return;
}
```

- [ ] **Step 5: Run a focused source scan**

Run:

```bash
rg -n "spatial:move|spatial:blocked" \
  /Users/jake.hamilton/source/tone-tiles/model \
  /Users/jake.hamilton/source/tone-tiles/core \
  /Users/jake.hamilton/source/tone-tiles/run-canvas.js
```

Expected:

```text
No movement pipeline usage remains in Traverser.model.js, InteractionResolver.js, or EntityCollection.js.
```

### Task 2: Convert Runtime Consumers To Traversal-Only

**Files:**
- Modify: `/Users/jake.hamilton/source/tone-tiles/run-canvas.js`
- Modify: `/Users/jake.hamilton/source/tone-tiles/model/DarkSun.model.js`
- Modify: `/Users/jake.hamilton/source/tone-tiles/model/BigRupture.model.js`

- [ ] **Step 1: Switch actor movement subscriptions from `spatial:move` to `traversal:move`**

Convert these shapes:

```js
runtime.out({
  type: 'spatial:move',
  filter: ({ id }) => entityCollection.get(id).type === 'actor',
})
```

to:

```js
runtime.out({
  type: 'traversal:move',
  filter: ({ id }) => entityCollection.get(id).type === 'actor',
})
```

and remove the redundant traversal-state restatement:

```js
entity.update({ isTraversing: true });
```

- [ ] **Step 2: Switch dark sun and big rupture movement subscriptions to `traversal:move`**

Apply the same subscription change to:

```js
runtime.out({ type: 'traversal:move', filter: ({ id }) => entityCollection.get(id).type === 'dark-sun' })
runtime.out({ type: 'traversal:move', filter: ({ id }) => entityCollection.get(id).type === 'big-rupture' })
```

while keeping the existing visual and audio reactions to committed `point` / `prevPoint`.

- [ ] **Step 3: Move blocked behavior onto traversal events**

Replace:

```js
if (event.type === 'spatial:blocked') {
  if (typeof event.reason === 'string' && event.reason.startsWith('blocked-by:')) {
    this.reverseCourse();
  }

  this.resetTraversal(this.currentPoint);
  return this;
}
```

with traversal-native handling shaped like:

```js
if (event.type === 'traversal:idle' && typeof event.reason === 'string' && event.reason.startsWith('blocked-by:')) {
  this.reverseCourse();
  this.resetTraversal(this.currentPoint);
  return this;
}
```

- [ ] **Step 4: Remove runtime listeners that depend on `spatial:blocked`**

Delete the old blocked subscription and make any remaining blocked cleanup hang off traversal lifecycle:

```js
entityCollection.out({
  filter: ({ id, type, reason }) =>
    entityCollection.get(id)?.type === 'dark-sun' &&
    type === 'traversal:idle' &&
    typeof reason === 'string' &&
    reason.startsWith('blocked-by:')
})
```

- [ ] **Step 5: Rebuild collision-side effects only if they can be sourced from traversal + graph state**

Keep only traversal-only logic shaped like:

```js
const node = tileLayer.get(graphModel.pointToAddress(event.goalPoint ?? event.point));
const occupants = graphModel.getNodeAtPoint(event.goalPoint ?? event.point)?.objectIds ?? [];
```

If the old collision effect cannot be expressed from `traversal:idle` plus graph occupancy without inventing new events, delete the effect instead of recreating a bridge.

### Task 3: Clean Up Dead Spatial Surface And Verify The Fix

**Files:**
- Modify: `/Users/jake.hamilton/source/tone-tiles/PROJECT_CONTEXT.md`
- Modify: `/Users/jake.hamilton/source/tone-tiles/core/actions/spatial.actions.js`
- Modify: `/Users/jake.hamilton/source/tone-tiles/docs/superpowers/specs/2026-05-13-traversal-only-movement-design.md` (only if implementation reality requires a spec correction)

- [ ] **Step 1: Remove or dead-code-mark spatial movement actions**

If no code paths remain, delete imports and usage shaped like:

```js
import { SpatialBlocked, SpatialCollision, SpatialMove } from '../actions/spatial.actions.js';
```

so the surviving movement imports are traversal-native:

```js
import { TraversalIdle, TraversalMove } from '../actions/traversal.actions.js';
```

- [ ] **Step 2: Update project context to reflect traversal-only movement**

Change the movement flow summary from:

```md
InteractionResolver listens to traversal events and derives world-resolved events such as:
- spatial:move
- spatial:blocked
```

to:

```md
InteractionResolver resolves traversal intent and emits traversal-scoped outcomes only.
Committed movement and blocked outcomes stay within traversal:* semantics.
```

- [ ] **Step 3: Verify the event surface is traversal-only**

Run:

```bash
rg -n "spatial:move|spatial:blocked" /Users/jake.hamilton/source/tone-tiles
```

Expected:

```text
No remaining listeners or resolver emissions in runtime/model code.
Only historical logs or intentionally retained dead files may match.
```

- [ ] **Step 4: Verify the original bug condition is gone**

Run the app, reproduce an actor traversal to completion, then export `window.graphEvents` and confirm the end-of-traversal window does not contain:

```json
{ "type": "spatial:move", "actionType": "traversal:stop" }
```

and does not contain:

```json
{ "type": "actor:update", "data": { "isTraversing": true } }
```

immediately after:

```json
{ "type": "traversal:stop" }
```

- [ ] **Step 5: Commit**

```bash
git add \
  /Users/jake.hamilton/source/tone-tiles/model/Traverser.model.js \
  /Users/jake.hamilton/source/tone-tiles/core/spatial/InteractionResolver.js \
  /Users/jake.hamilton/source/tone-tiles/model/EntityCollection.js \
  /Users/jake.hamilton/source/tone-tiles/model/DarkSun.model.js \
  /Users/jake.hamilton/source/tone-tiles/model/BigRupture.model.js \
  /Users/jake.hamilton/source/tone-tiles/run-canvas.js \
  /Users/jake.hamilton/source/tone-tiles/PROJECT_CONTEXT.md
git commit -m "Refactor movement to traversal-only events"
```

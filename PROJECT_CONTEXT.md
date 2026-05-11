# Tone Tiles Project Context

This file is a durable handoff note for future AI collaborators.

It is not meant to be a product spec or a rewrite proposal. It is a grounded summary of what the codebase currently appears to be, what patterns are already present, and what assumptions seem important to preserve when reasoning about changes.

## What Tone Tiles Seems To Be

Tone Tiles appears to be a musical / spatial interaction system built around a traversable tile world.

At a high level:

- The user interacts with a grid-like map.
- An actor moves through that map toward goals.
- Traversal is not just visual movement; it drives audio, highlighting, collision response, and map transitions.
- The codebase is trending toward an event-driven world model where domain behavior happens in models and collections first, and rendering/audio subscribe downstream.

The strongest architectural idea in the codebase is:

1. A model expresses movement intent.
2. The world resolves whether that movement is valid.
3. The model commits the resolved result.
4. UI and audio react to the emitted events.

That loop matters more than any individual canvas or UI detail.

## Current System Shape

The core world stack is roughly:

- `model/Model.js`
- `model/Spatial.model.js`
- `model/Traverser.model.js`
- `model/Actor.model.js`
- `model/DarkSun.model.js`
- `model/Collection.js`
- `model/EntityCollection.js`
- `model/graph.model.js`
- `model/Scene.model.js`
- `core/spatial/InteractionResolver.js`
- `core/create-connection.js`
- `core/loop-engine/loop-engine.js`
- `runtime/Runtime.js`
- `run-canvas.js`

The best mental model is:

- `Model` is the local mutable state primitive.
- `SpatialModel` adds canonical point semantics.
- `TraverserModel` adds step-driven traversal behavior.
- `ActorModel` and `DarkSunModel` are specializations of traversal behavior.
- `Collection` is storage + factory + event boundary + loop registration boundary.
- `EntityCollection` is the domain-specific collection for moving world entities.
- `Graph` is the traversable world and occupancy authority.
- `InteractionResolver` turns traversal intent into concrete spatial outcomes.
- `SceneModel` composes collections and the resolver into one world event surface.
- `Runtime` creates the loop, scene, and canvas.
- `run-canvas.js` is the main orchestration layer that wires world events to rendering, audio, input, and map changes.

## Core Flow: User-Directed Actor Movement

The main player-facing flow currently looks like this:

1. A tile click resolves to a traversable goal node.
2. The actor receives `travelTo(goalPoint)`.
3. The loop engine calls the actor's `step(dt)` routine because the entity collection auto-registered it.
4. The traverser emits traversal lifecycle events such as:
   - `traversal:start`
   - `traversal:move`
   - `traversal:goal`
   - `traversal:idle`
   - `traversal:stop`
5. `InteractionResolver` listens to those traversal events and derives world-resolved events such as:
   - `spatial:move`
   - `spatial:blocked`
   - `interaction:collision`
6. `EntityCollection` routes derived events back into the entity via `resolveAction(...)`.
7. The traverser commits movement or handles blockage.
8. Scene/entity subscriptions in `run-canvas.js` update:
   - object positions
   - tile highlighting
   - actor traversal melody behavior
   - map transitions
   - collision reactions

Important takeaway:

The movement system is already built around intent -> resolution -> commit, not direct mutation of world state.

## Core Flow: Autonomous Dark Sun Movement

The dark sun shares the same traversal substrate as the actor, but its behavior is autonomous rather than user-directed.

Current behavior:

- It owns a waypoint list.
- It sets its current waypoint as the active goal.
- On reaching a waypoint, it waits briefly, then advances to the next waypoint.
- On actor-caused blockage, it reverses course rather than trying to occupy the blocked tile.

This means the dark sun is not a separate movement system. It is a specialized traverser with different hooks and different blocked behavior.

That is a strong sign that `TraverserModel` is the intended reusable behavior base.

## Graph Responsibilities

`Graph` is doing several important jobs at once:

- Loading map data into node models.
- Providing neighborhood queries.
- Performing pathfinding.
- Representing teleporter adjacency.
- Tracking entity occupancy on nodes.
- Emitting map load events.
- Supporting map-link transitions.

This means the graph is not just static topology. It is the active spatial truth of the world.

Important details:

- The graph owns object occupancy via node object sets and an object index.
- Movement validation depends on graph occupancy rather than render state.
- Teleporters are modeled primarily through graph/node relationships, not through a deeply realized teleporter entity model.
- Map links are represented as synthetic nodes placed around the map edges.

## Collection Responsibilities

Collections are more than container classes.

`Collection` currently owns four responsibilities:

- model creation from a registry
- model storage and lookup
- event emission boundary for contained models
- loop routine registration for models with `step`

That last point is especially important:

Any model that exposes a `step` method becomes loop-driven when added to a collection. This is an emergent capability pattern, not a hardcoded actor-only rule.

`EntityCollection` adds domain-specific behavior on top:

- entity creation helpers
- entity ID normalization
- entity lifecycle events like `entity:create` / `entity:remove`
- routing of derived resolver events back into entities

That routing behavior is a major architectural hinge. It effectively lets entities "propose" movement via traversal events, then "learn" the resolved result from the world.

## Event Stream Model

The repo uses a small RxJS-based stream bus abstraction from `core/create-connection.js`.

That bus gives hosts:

- `in(...)` to attach upstream streams
- `out(...)` to subscribe to filtered downstream streams
- `emit(...)` to push events into the local bus

The event model is distributed but fairly consistent in intent:

- Models emit updates and actions.
- Collections expose those events outward.
- The scene aggregates collection outputs.
- The resolver derives new events from existing ones.
- Runtime subscribers react to those outputs for render/audio/UI concerns.

There are now two distinct derivation styles in the world:

- graph-resolved spatial derivation via `InteractionResolver`
- wave/field influence derivation via a sibling wave influence resolver

This is one of the most valuable things to preserve when extending the project. The world is becoming event-composed, and that trend already has real shape.

## Emerging Invariants

These are not all formally enforced, but they appear to be the assumptions the code increasingly relies on.

### 1. World movement should be resolved through the graph

Entities should not simply decide their new final position and bypass graph/world validation.

The current movement pipeline assumes:

- traversal emits intent
- resolver consults graph occupancy / validity
- entity commits the resolved result

If a new behavior bypasses that flow, it is likely to create desync between entity state, graph occupancy, and downstream audio/visual reactions.

### 2. Graph occupancy is the world truth for collisions

Collision and blocking behavior assume that node occupancy in the graph is authoritative.

If render objects or UI state become alternate sources of positional truth, the architecture will get harder to reason about.

### 3. Loop-driven behavior is capability-based

A model with a `step` routine is assumed to be something the world should advance every frame or tick interval.

That means adding a `step` method is architecturally meaningful.

### 4. Domain behavior should emit events that downstream systems react to

The code is already leaning toward:

- domain first
- render/audio second

That seems like a good invariant to maintain. `run-canvas.js` is large, but much of what it does is subscribe reactively rather than drive the world directly.

### 4a. Spatial truth and wave influence are different kinds of world fact

The code now has a meaningful distinction between:

- spatial facts that require graph adjudication
- influence facts that modulate entity behavior without changing graph truth

`InteractionResolver` should stay focused on graph-backed movement and collisions.

Wave-world field effects can live in sibling derivation layers that emit influence events into the same sphere without pretending to be graph movement.

### 5. Traverser subclasses should differentiate through hooks, not whole new movement stacks

`ActorModel` and `DarkSunModel` both get their distinct behavior mostly by overriding traversal hooks and reactions. That pattern looks intentional and worth preserving.

### 5a. Traversers own their effective cadence, even when influenced externally

Wave-world entities can now influence traversers by emitting field events that ultimately resolve to temporary cadence modifiers.

The important ownership rule is:

- external systems emit influence
- traversers decide how to apply it
- base `stepInterval` stays traverser-owned
- temporary modifiers affect `effectiveStepInterval`

For the current MVP, cadence modifiers are ephemeral and cleared after each traverser step invocation, so emitters must keep reapplying them while the target remains in range.

### 6. `properties` shape is meaningful

`Model.update(...)` only accepts keys that already exist in `properties`.

That means new persistent model attributes usually need to be declared in default property objects first. It acts as a lightweight schema discipline.

## Emerging Vision / Direction

The codebase seems to be converging toward something like:

"A scene-composed world model where stateful entities and graph nodes emit typed events, a resolver mediates movement against world rules, and audiovisual systems subscribe to those events to create the Tone Tiles experience."

That direction now also includes a second world behavior track:

"wave-world entities can emit non-spatial influence into the same event sphere, and traversers can absorb that influence without breaking graph-resolved movement."

A few signs of that direction:

- registries for models and collections
- `SceneModel` as composition root
- typed action creators
- explicit traversal lifecycle events
- a dedicated interaction resolver
- loop registration via collection behavior
- reactive downstream subscriptions in `run-canvas.js`

This matters because future work should probably reinforce that direction rather than fight it accidentally.

## Patterns Already Working Well

### Intent -> Resolution -> Commit

This is the strongest pattern in the project.

The traverser does not directly own world permission to move. It proposes movement, the world resolves it, and then the traverser absorbs the outcome.

That is more robust than direct mutation and makes collision/block logic much easier to centralize.

### Shared Traversal Substrate

The actor and dark sun are not bespoke one-off movement implementations.

They share a common traversal base and specialize via hook behavior. That is good reuse and also a good conceptual model for future moving entities.

### Scene-As-Composition

`SceneModel` is not only a passive container. It is the place where collections and the resolver are brought into one stream-connected world.

That is a promising center of gravity for the runtime architecture.

### Downstream Reactivity

Much of the rendering/audio behavior subscribes to scene/entity/graph events instead of mutating domain state directly.

That is a healthier pattern than letting canvas concerns become the source of truth.

### Lightweight Runtime Validation

Action creators validate event payloads at creation time. This is small, but it is useful protection in an eventful architecture.

## Seams / Caveats To Remember

These are not rewrite recommendations. They are current realities worth remembering so future conversations stay grounded.

### Traversal still depends on a module-level active graph

The traversal generator currently resolves through a module-level graph singleton pattern in `model/graph.model.js`.

That means the newer scene-based composition still sits on top of an older "one active graph" assumption.

This is probably the clearest architectural seam in the current world model.

### Event shapes are not perfectly unified

There are multiple event idioms in the codebase:

- model update events
- traversal action events
- spatial resolved events
- some older alternate shapes in spatial model methods

The main path is understandable, but not every event family looks like it was designed at the same moment.

### `run-canvas.js` is a large orchestration surface

This is not inherently bad. In fact, a lot of the architecture is readable because the subscriptions are explicit there.

Still, it currently acts as the place where:

- runtime setup
- render binding
- traversal audio
- collision effects
- map switching
- input handling

all meet.

Future changes often need to reason about that file as the "behavior composition script."

### Some legacy / partial strata remain

Examples visible in the repo:

- alternate runtime/event abstractions
- commented actor-specific emitters
- a skeletal teleporter entity model
- a few stub or placeholder files

These do not erase the current architecture, but they do mean the repo is still in an active consolidation phase.

## Practical Guidance For Future AI Conversations

If you are a future AI collaborator, start from these assumptions unless the user tells you otherwise:

1. The movement system is the architectural heart of the repo.
2. Graph occupancy is the source of spatial truth.
3. Traversal intent should usually be resolved through the resolver path.
4. `SceneModel` + collections + resolver are the main world composition layers.
5. `run-canvas.js` is the main downstream behavior wiring file.
6. The codebase seems to prefer extending the existing event/traversal model over introducing a totally separate control path.

When evaluating a change, ask:

- Does it preserve graph/world authority over movement?
- Does it keep entity behavior eventful rather than canvas-driven?
- Does it fit the traverser hook model if the thing moves?
- Does it create a second source of truth for position or occupancy?

## Short Summary

Tone Tiles already has a meaningful architecture.

It is not just a canvas toy or an arbitrary tangle of UI code. The codebase has a recognizable center:

- models hold state
- collections host and clock behavior
- the graph owns traversable world structure and occupancy
- traversers emit movement intent
- the resolver turns that intent into world facts
- render/audio subscribe to those facts

The clearest current direction is toward a scene-composed, event-driven movement architecture with music and spatial behavior tightly linked.

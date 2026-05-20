**Findings**
 - [P1] Actor occupancy/move bookkeeping is currently broken. `runCanvas` listens for `actor:move` and destructures `{ id, point }`, but `CanvasActor` never emits `id`; it emits `{ actor, prevNode, node, prevPoint, point }`. That means `graph.moveObject(id, point)` is getting `undefined`, so object occupancy/index state won't stay correct. See  and .
 - [P1] `Graph.fromMap()` can incorrectly invent a start tile at `0_0`. `hasStart` is reassigned on every tile instead of accumulated, so a valid earlier start can be overwritten by later non-start tiles and then  forces `0_0` to `start`. See .
 - [P1] Layer unload/reconciliation is incomplete. `TileLayer.loadTileSet()` calls `unload()` for old tiles, but `SceneLayer.unload()` only sets `unload: true`, and `CanvasObject.render()` never translates that into hidden/removed DOM. On map size/topology changes, stale tiles can linger. See , , and .
 - [P2] The refactor is halfway into a new runtime, but the app still runs on the old loop/orchestration style. `Runtime2` expects `loop.onTick()`, but `AudioClockLoop` has no such API, and nothing instantiates the runtime yet. So the new runtime is promising but still aspirational. See  and .
 - [P2] There are a few obvious refactor leftovers that are harmless until touched, then sharp: duplicate/broken `createTileObject()` methods in , semantically wrong `findAll/findAny` in , and `disableItem()` using assignment instead of comparison in .
 
 **How It Works**
 This looks like a map editor / traversal toy / music sequencer hybrid. The graph is the real world model, the SVG canvas is the retained-mode visual scene, and the actor walking the graph is what turns topology into sound.
 
 `SVGCanvas` is the root DOM adapter. It grabs the `<svg>`, creates a `Scene`, installs tile/object layers, clones templates out of `<defs>`, and translates raw DOM clicks/contextmenus into semantic events like `tile:click` and `surface:click` based on layer hit-testing. See .
 
 The canvas object model is small but pretty coherent. `CanvasObject` is the base retained SVG entity: it owns a model, a DOM node cloned from a template, and a `TransformList` wrapper around SVG transforms. `Scene` is just a top-level `CanvasObject` containing `SceneLayer`s; layers manage child object maps; `TileLayer` specializes that by projecting graph nodes into `TileObject`s. See , , , and .
 
 The graph model is the heart of the project. `GraphNode` holds tile state like `tileType`, `target`, `linkedMap`, `selected`, `active`, etc. `Graph` builds nodes from saved maps, derives neighbors, supports teleports and off-map links, and does BFS pathfinding. The genuinely interesting idea is that map links make the world bigger than one grid, and teleports are first-class edges, not special rendering hacks. See  and .
 
 `CanvasActor` is both sprite and controller right now. It owns traversal state, steps a generator from the graph on each loop tick, emits movement/goal/teleport/map-link events, and updates its own transform. That makes it effective, but also means domain behavior and view behavior are still coupled. See .
 
 `run-canvas.js` is still the orchestration hub. It wires together graph, canvas, selection, context menu, actor, audio loop, map store, and all the event subscriptions. So even after the breakup from the old mega-file, you can still feel the "former god object" shape here. See .
 
 **Assessment**
 The project has a real point of view. It does not feel like "generic tile editor with sound added later"; it feels like the map, traversal rules, and harmony were imagined together. The direction-to-chord mapping in  is especially telling: movement through space is the composition surface.
 
 Architecturally, the new code is healthier than the old monolith shape. The scene/layer/object split is the right kind of decomposition, and `Runtime2` is a noticeably better long-term abstraction than direct callback soup. The issue is that the rewrite is in the awkward middle: the object model exists, but orchestration is still centralized; the runtime exists, but isn't driving the app; graph state is authoritative in spirit, but view/controller objects still mutate it directly.
 
 If I were steering this next, I'd push in one direction hard: make the graph and actor pure domain state, make canvas objects pure projections, and make the runtime the only place where input, tick, graph mutation, and audio side effects meet. In practical terms, that means turning `run-canvas.js` into a thin composition root, giving `Runtime2` a real loop adapter, and defining a small action vocabulary like `map.loaded`, `tile.clicked`, `selection.changed`, `actor.goalSet`, `actor.stepped`, and `graph.nodePatched`.
 
 Big picture: this is a strong, weird, promising codebase. It feels like it could become either a delightful musical puzzle editor, a tiny SVG-native game engine for grid worlds, or a composition tool where map structure is the score. Right now it's closest to all three at once, which is why it's exciting and also why the refactor pressure is so high.
 
 I didn't run the browser app, so this is a static/code-level review rather than a behavior-verified one.
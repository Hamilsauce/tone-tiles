const TileTypeDefinition = {
  empty: {
    name: 'empty',
    traversable: true,
  },
  barrier: {
    name: 'barrier',
    traversable: false,
  },
  start: {
    name: 'start',
    traversable: true,
  },
  goal: {
    name: 'goal',
    traversable: true,
  },
  teleport: {
    name: 'teleport',
    traversable: true,
  },
  mapLink: {
    name: 'map-link',
    traversable: true,
  },
}
export const TILE_TYPE_INDEX = Object.values(TileTypeDefinition).map(def => def.name);
export const TRAVERSABLE_TILE_TYPES = TILE_TYPE_INDEX.filter(type => TileTypeDefinition[type.replace(/-([a-z])/g, (_, c) => c.toUpperCase())].traversable);

export const TileTypes = TILE_TYPE_INDEX.reduce((acc, curr) => {
  const key = curr.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  return { ...acc, [key]: curr };
}, {});

const DEFAULT_TILE_DATA = {
	type: 'tile',
	id: null,
	tileType: null,
	current: false,
	active: false,
	address: null,
	x: null,
	y: null,
	isPathNode: false,
	isVisited: false,
	linkedNodeAddress: null,
	linkedMap: null,
	target: null,
	selected: false,
	isLink: false,
	dir: null,
};

const createNodeData = (overrides = {}) => {
	return {
		...DEFAULT_TILE_DATA,
		...overrides,
	};
};

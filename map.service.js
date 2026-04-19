import { mapSyncHelpers, dbAdd, dbGet, dbGetAll, dbUpdate, getFields, dbDelete } from './firestore.js';
import { maps, mapStorageFormatter } from './store/maps.js';

const { collection, doc, writeBatch, db, deleteField } = mapSyncHelpers;

export const validateMapLinks = (graph) => {
  const OPP = { N: "S", S: "N", E: "W", W: "E" };
  
  for (const [id, links] of Object.entries(graph)) {
    for (const [dir, neighbor] of Object.entries(links)) {
      if (graph[neighbor]?.[OPP[dir]] !== id) {
        throw new Error(`Broken symmetry at ${id}.${dir}`);
      }
    }
  }
}

export const bulkUpdateMapsLinks = async (mapGraph = {}) => {
  validateMapLinks(mapGraph)
  
  for (const [id, linkedMaps] of Object.entries(mapGraph)) {
    await dbUpdate('mapIndex', id, { linkedMaps })
  }
  
  console.warn('YPDATE COMPLETE')
}

const cache = new Map();

export const updateMap = async (mapToStore) => {
  const id = await dbUpdate('maps', mapToStore.id, mapToStore);
  
  return id;
};

export const storeMap = async (mapToStore) => {
  const { tileData, ...formatted } = mapToStore;
  const id = mapToStore?.id ?? doc(collection(db, "mapIndex")).id;
  
  const mapIndexRef = doc(db, "mapIndex", id);
  const tileDataRef = doc(db, "tileData", id);
  
  const batch = writeBatch(db);
  formatted.updated = Date.now()
  batch.set(
    mapIndexRef, {
      ...formatted,
      id,
      linkedMaps: formatted.linkedMaps ?? {},
    } //, { merge: true }
  );
  
  batch.set(
    tileDataRef, {
      id,
      width: formatted.width,
      height: formatted.height,
      tileData: tileData
    },
  );
  
  await batch.commit();
  
  
  return id;
};

export const storeMaps = async (mapsToStore = maps) => {
  const ids = Object.values(mapsToStore).map(async (map, i) => {
    return await storeMap(map);
  });
  
  return ids;
};

export const loadMapIndex = async () => {
  // const fetched = await getFields('mapIndex', ['name', 'meta', 'width', 'height']);
  const fetched = await dbGetAll('mapIndex');
  
  return fetched;
};

export const loadMap = async (id) => {
  const fetched = await dbGet('tileData', id);
  
  fetched.id = id;
  return fetched;
};

export const loadMaps = async (asMap = false) => {
  const fetched = await dbGetAll('maps');
  
  fetched.forEach((m, i) => {
    cache.set(m.id, m);
  });
  
  return asMap ? [...cache.entries()]
    .reduce((acc, [id, m]) => ({ ...acc, [id]: m }), {}) : [...cache.entries()];
};

export const clearMaps = async () => {
  const savedMaps = cache.size > 0 ? [...cache.entries()] : await dbGetAll('maps');
  
  
  savedMaps.forEach(async ({ id, ...m }, i) => {
    await dbDelete('maps', id);
    cache.delete(id);
  });
  
  return true;
};
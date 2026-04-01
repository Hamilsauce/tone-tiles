// firestore.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  // select
  runTransaction,
  writeBatch,
  deleteField,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCIqydhVpTC-eJmy04gCdq0UXgTdNROQTQ",
  authDomain: "tile-maps-1234-ea32e.firebaseapp.com",
  projectId: "tile-maps-1234-ea32e",
  storageBucket: "tile-maps-1234-ea32e.firebasestorage.app",
  messagingSenderId: "184465476054",
  appId: "1:184465476054:web:3c556363a497d274b03c77"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// export const migrateMapsToSplitModel = async () => {
//   const mapsSnap = await getDocs(collection(db, "maps"));

//   for (const mapDoc of mapsSnap.docs) {
//     await runTransaction(db, async (transaction) => {
//       const mapRef = mapDoc.ref;
//       const freshSnap = await transaction.get(mapRef);

//       if (!freshSnap.exists()) return;

//       const data = freshSnap.data();

//       // If already migrated (paranoia guard)
//       const mapIndexRef = doc(db, "mapIndex", mapDoc.id);
//       const tileDataRef = doc(db, "tileData", mapDoc.id);

//       const existingIndex = await transaction.get(mapIndexRef);
//       if (existingIndex.exists()) {
//         console.log(`Skipping ${mapDoc.id} (already migrated)`);
//         return;
//       }

//       const mapIndexData = {
//         id: mapDoc.id,
//         name: data.name ?? "Untitled",
//         meta: data.meta ?? {},
//         width: data.width,
//         height: data.height,
//         updated: data.updated ?? Date.now(),
//       };

//       const tileDataDoc = {
//         id: mapDoc.id,
//         width: data.width,
//         height: data.height,
//         tileData: data.tileData ?? {},
//       };

//       transaction.set(mapIndexRef, mapIndexData);
//       transaction.set(tileDataRef, tileDataDoc);
//       transaction.delete(mapRef);
//     });

//     console.log(`Migrated ${mapDoc.id}`);
//   }

//   console.log("Migration complete.");
// };


export const dbGet = async (collectionPath, docId) => {
  const ref = doc(db, collectionPath, docId);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
};

export const dbSet = async (collectionPath, docId, data, options = { merge: false }) => {
  const ref = doc(db, collectionPath, docId);
  await setDoc(ref, data, options);
};

export const dbAdd = async (collectionPath, data) => {
  const col = collection(db, collectionPath);
  const ref = await addDoc(col, data);
  return ref.id;
};

export const dbUpdate = async (collectionPath, docId, updates) => {
  const ref = doc(db, collectionPath, docId);
  await updateDoc(ref, updates);
}

export const dbDelete = async (collectionPath, docId) => {
  const ref = doc(db, collectionPath, docId);
  await deleteDoc(ref);
};

export const dbGetAll = async (collectionPath, options = {}) => {
  const col = collection(db, collectionPath);
  const q = options.select ?
    query(col, select(...options.select)) :
    col;

  const snap = await getDocs(q);
  return snap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

export const getFieldOnly = async (coll, fieldName) => {
  const q = query(collection(db, coll));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    [fieldName]: doc.get(fieldName),
  }));
};

export const getFields = async (coll, fieldNames = []) => {
  const q = query(collection(db, coll));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docRef) => fieldNames.reduce((acc, fieldName) => ({
    ...acc,
    [fieldName]: docRef.get(fieldName)
  }), { id: docRef.id }));
}

export const mapSyncHelpers = {
  writeBatch,
  collection,
  doc,
  db,
  deleteField,
}
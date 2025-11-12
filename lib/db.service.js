  import { db } from '../firebase.js';

import { collection, addDoc } from "firebase/firestore";

try {
  const docRef = await addDoc(collection(db, "users"), {
    first: "Ada",
    last: "Lovelace",
    born: 1815
  });
  console.log("Document written with ID: ", docRef.id);
} catch (e) {
  console.error("Error adding document: ", e);
}


export const setDoc = (data) => {
  await setDoc(docRef, {
    tiles: [
      [0, 0, 1],
      [1, 2, 0],
      [0, 0, 0]
    ],
    tileData: {
      "0_2": { type: "teleport", target: { x: 1, y: 1, map: "map2" } },
      "1_1": { type: "event", script: "openDoor" }
    }
  });
  
}
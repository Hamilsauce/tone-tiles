const makeTraverser = pipe(
  spatial,
  traversal,
);

const withAudioVisuals = pipe(
  audio,
  canvas,
);

const asRpgCharacter = pipe(
  combat,
  inventory,
);

const createActor = pipe(
  makeTraverser,
  withAudioVisuals,
  asRpgCharacter
);
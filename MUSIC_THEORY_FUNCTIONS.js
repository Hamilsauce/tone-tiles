const noteDataURL = 'https://raw.githubusercontent.com/Hamilsauce/guitar-tab/refs/heads/main/data/note-data.json'

const {
  notes: responseNotes
} = (await (await fetch(noteDataURL)).json());

export const NoteData = responseNotes
  .map(({ note, name, ...rest }, i) => ({
    ...rest,
    pitchClass: note,
    pitch: name,
    json() {
      return JSON.stringify({ ...rest, pitchClass: note, pitch: name }, null, 2)
    },
    toJSON() { return this; },
  }));

export const MusicalScales = {
  major: [0, 2, 4, 5, 7, 9, 11],
  majorPentatonic: [0, 2, 4, 7, 9],
  majorSeventh: [0, 4, 7, 11],
  bebopMajor: [0, 2, 4, 5, 7, 8, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  minor: [0, 2, 3, 5, 7, 8, 11],
  melodicMinor: [0, 2, 3, 5, 7, 9, 11],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
  minorPentatonic: [0, 3, 5, 7, 10],
  bebopMinor: [0, 2, 3, 4, 5, 7, 9, 10],
  bebopDiminished: [0, 2, 4, 5, 7, 9, 10, 11],
  diminished: [0, 2, 3, 5, 6, 8, 9, 11],
  augmented: [0, 3, 4, 7, 8, 11],
  diminishedSeventh: [0, 3, 6, 9],
  blues: [0, 3, 5, 6, 7, 10],
  wholeTone: [0, 2, 4, 6, 8, 10],
  octatonic: [0, 1, 3, 4, 6, 7, 9, 10],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
}

const ChordScaleDegrees = [0, 2, 4, 6]


export const pitchToFrequency = (pitch = 'C4') => {
  const note = NoteData.find(note => note.pitch === pitch)
  return note.frequency
}

export const getScalePitchClasses = (root, scaleName) => {
  const scaleFormula = MusicalScales[scaleName]
  const firstRootIndex = NoteData.findIndex(note => note.pitchClass === root)
  
  return scaleFormula.map((interval) => {
    const noteIndex = firstRootIndex + interval
    return NoteData[noteIndex].pitchClass
  });
}

export const getScaleNotes = (rootPitch, scaleName) => {
  const scaleFormula = MusicalScales[scaleName]
  const firstRootIndex = NoteData.findIndex(note => note.pitch === rootPitch)
  
  return scaleFormula.map((interval) => {
    const noteIndex = firstRootIndex + interval
    return NoteData[noteIndex]
  });
}

export const getChordNotes = (root, scaleName) => {
  const scalePitches = getScaleNotes(root, scaleName)
  
  return ChordScaleDegrees.map((interval) => scalePitches[interval]);
}
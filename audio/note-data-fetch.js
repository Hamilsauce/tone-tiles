import { midiToPitch } from '../audio/midi-pitch.js';


const noteDataURL = 'https://raw.githubusercontent.com/Hamilsauce/guitar-tab/refs/heads/main/data/note-data.json'
// const noteDataURL = 'https://raw.githubusercontent.com/Hamilsauce/hamilsauce.github.io/refs/heads/master/note-data-with-midi.json'
const noteDataURL2 = 'https://raw.githubusercontent.com/Hamilsauce/hamilsauce.github.io/refs/heads/master/note-data-with-midi.json'

const noteData = (await (await fetch(noteDataURL2)).json()) //.filter(_=>_.id);

const { notes: responseNotes } = (await (await fetch(noteDataURL)).json()) //.filter(_=>_.id);
console.log('noteData', noteData)

export const NoteData = noteData
  .map(({ note, name, ...rest }, i) => ({
    ...rest,
    pitchClass: note,
    pitch: name,
    json() {
      return JSON.stringify({ ...rest, pitchClass: note, pitch: name }, null, 2)
    },
    toJSON() { return this; },
  }));
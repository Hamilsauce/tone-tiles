import { midiToPitch } from '../audio/midi-pitch.js';


const noteDataURL = 'https://raw.githubusercontent.com/Hamilsauce/hamilsauce.github.io/refs/heads/master/note-data-with-midi.json';

const noteData = (await (await fetch(noteDataURL)).json()); //.filter(_=>_.id);

export const NoteData = noteData
  .map(({ note, name, ...rest }, i) => ({
    ...rest,
    json() {
      return JSON.stringify(rest, null, 2);
    },
    toJSON() { return this; },
  }));
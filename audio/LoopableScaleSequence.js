import { MusicalScales } from '../MUSIC_THEORY_FUNCTIONS.js';
import { NoteData } from './note-data-fetch.js';

const mod = (value, divisor) => ((value % divisor) + divisor) % divisor;

const buildScaleNotes = ({
  rootPitch = 'C4',
  scaleName = 'major',
  octaveSpan = 3,
} = {}) => {
  const scale = MusicalScales[scaleName] ?? MusicalScales.major;
  const rootIndex = NoteData.findIndex((note) => note.pitch === rootPitch);
  
  if (rootIndex < 0) {
    throw new Error(`Unknown root pitch: ${rootPitch}`);
  }
  
  const notes = [];
  
  for (let octave = 0; octave < octaveSpan; octave++) {
    for (const interval of scale) {
      const note = NoteData[rootIndex + interval + (octave * 12)];
      
      if (note) {
        notes.push(note);
      }
    }
  }
  
  const wrapRoot = NoteData[rootIndex + (octaveSpan * 12)];
  
  if (wrapRoot) {
    notes.push(wrapRoot);
  }
  
  return notes;
};

export class LoopableScaleSequence {
  constructor(options = {}) {
    this.notes = buildScaleNotes(options);
    this.index = 0;
  }
  
  get length() {
    return this.notes.length;
  }
  
  get current() {
    return this.notes[this.index] ?? this.notes[0];
  }
  
  noteAt(index = 0) {
    return this.notes[mod(index, this.length)];
  }
  
  reset(index = 0) {
    this.index = mod(index, this.length);
    return this.current;
  }
  
  next() {
    this.index = mod(this.index + 1, this.length);
    return this.current;
  }
}

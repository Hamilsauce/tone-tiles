import { audioEngine } from '../audio/index.js';
import { getScaleNotes, getChordNotes, pitchToFrequency } from '../MUSIC_THEORY_FUNCTIONS.js';
import { getChordToneDegreeFromDir, getDirectionFromPoints } from '../lib/graph.model.js';
import { AudioNote } from '../audio/AudioNote.js';
import { major7 } from '../MUSIC_THEORY_FUNCTIONS.js';


const getRandomInt = (max = 4) => {
  return Math.floor(Math.random() * max);
};

let pointer = 0;
let curr;
let prev;
let prevDir;

const harmonicCxt = {
  root: 'C4',
  scale: 'major',
  octave: 4,
  notes: getScaleNotes('C4', 'major'),
  chordNotes: getChordNotes('C4', 'major'),
};
let audioNote1; // = (new AudioNote(audioEngine));


const fireAudioNote = (freq, vel, dur = 1) => (new AudioNote(audioEngine.ctx, {type: 'sine'})
  .at(audioEngine.now)
  .frequencyHz(freq)
  .duration(dur)
  .velocity(vel).play()
  // .at(audioEngine.currentTime+0.1)
  // .velocity(0.005).play()
);



const getTileDegree = (x, scaleLength) => {
  return harmonicCxt.notes[x % scaleLength].pitchClass;
};

const getTileOctave = (y, scaleLength) => {
  return Math.floor(y / scaleLength) + harmonicCxt.octave;
};

function getScaleDegree(x, y, arp) {
  return arp ? (x + y) % harmonicCxt.chordNotes.length : (x + y) % harmonicCxt.notes.length;
}

const getTileTone = ({ x, y, degree, arp = false, octaveMod }) => {
  const deg = degree ?? getScaleDegree(x, y, arp);
  
  const {
    pitch,
    pitchClass,
    octave,
    sharp,
    flat
  } = harmonicCxt.notes[Math.max(deg, 0)]
  // arp ? harmonicCxt.chordNotes[deg] : harmonicCxt.notes[deg];
  if (octaveMod) {
    const pClassResolved = sharp ?? flat ?? pitchClass
    const finalPitch = `${pClassResolved}${octave+octaveMod}`
    const chord = getChordNotes(finalPitch, 'major')
    const note = harmonicCxt.chordNotes[getRandomInt(4)]
    return note.frequency
  }
  return pitchToFrequency(pitch)
};

const getDynamicTone = (x, y, dir = 1) => {
  const mod = y > 5 ? -2 : 0;
  
  const pitchClass = getTileDegree(x, harmonicCxt.notes.length);
  const octave = getTileOctave(Math.min(y, 5), harmonicCxt.notes.length);
  
  const pitch = `${pitchClass}${octave + dir}`;
  
  return pitchToFrequency(pitch);
};

const _toTone = (x, y, degree) => (x % 2 && y % 2) ?
  getDynamicTone(x, y, 0) :
  // getTileTone(x, y, deg, true);
  getTileTone({ x, y, degree, arp: true, octaveMod })

const toTone = ({ x, y, degree, arp, octaveMod = 0 }) => getTileTone({ x, y, degree, arp, octaveMod });

const DefaultDoAudioNoteOptions = {
  forceNewNote: false,
}


const doAudioNote = (currentNode, options = DefaultDoAudioNoteOptions) => {
  const { forceNewNote } = options;
  curr = currentNode;
  prev = prev ?? curr;
  
  const travelDir = getDirectionFromPoints(prev, curr);
  const chordToneDegree = getChordToneDegreeFromDir(travelDir);
  
  try {
    const vel = pointer % 2 === 0 ? 0.3 : 0.4;
    let freq = toTone({ x: curr.x, y: curr.y, degree: chordToneDegree });
    
    if (!audioNote1) {
      audioNote1 = fireAudioNote(freq, vel);
    }
    
    if (forceNewNote) {
      audioNote1.stop(0.2)
      audioNote1 = fireAudioNote(freq, vel);
    }
    
    else if (curr.tileType === 'teleport') {
      audioNote1.stop(0.015)
      
      freq = major7(toTone({ x: curr.x, y: curr.y, degree: chordToneDegree, octaveMod: 1 }))[getRandomInt(4)];
      
      audioNote1 = fireAudioNote(freq, vel);
    }
    else if (prevDir === travelDir) {
      audioNote1 = audioNote1
    }
    else {
      audioNote1.stop(0.2)
      audioNote1 = fireAudioNote(freq, vel);
    }
    
    prevDir = travelDir;
    prev = curr;
    
    pointer++;
    // audioNote1 = fireAudioNote(freq, vel);
  } catch (e) {
    console.error(`no audio note for you: ${e}`);
  }
}

export default doAudioNote
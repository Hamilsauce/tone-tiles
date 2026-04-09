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


const fireAudioNote = (freq, vel, dur = 2) => (new AudioNote(audioEngine.ctx)
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

const getTileTone = (x, y, degree, arp = false) => {
  const deg = degree ?? getScaleDegree(x, y, arp);
  
  const pitch = arp ? harmonicCxt.chordNotes[deg] : harmonicCxt.notes[deg];
  return pitchToFrequency(pitch.pitch);
};

const getDynamicTone = (x, y, dir = 1) => {
  const mod = y > 5 ? -2 : 0;
  
  const pitchClass = getTileDegree(x, harmonicCxt.notes.length);
  const octave = getTileOctave(Math.min(y, 5), harmonicCxt.notes.length);
  
  const pitch = `${pitchClass}${octave + dir}`;
  
  return pitchToFrequency(pitch);
};

const _toTone = (x, y, deg) => (x % 2 && y % 2) ?
  getDynamicTone(x, y, 0) :
  getTileTone(x, y, deg, true);

const toTone = (x, y, deg, arp) => getTileTone(x, y, deg, arp);



const doAudioNote = (currentNode) => {
  // AudioNote Block
  curr = currentNode;
  prev = prev ?? curr;
  
  const travelDir = getDirectionFromPoints(prev, curr);
  const chordToneDegree = getChordToneDegreeFromDir(travelDir);
  
  try {
    const vel = pointer % 2 === 0 ? 0.2 : 0.4;
    let freq = toTone(curr.x, curr.y, chordToneDegree);
    
    if (!audioNote1) {
      audioNote1 = fireAudioNote(freq, vel);
    }
    
    else if (curr.tileType === 'teleport') {
      
      audioNote1.stop(0.015)
      
      freq = major7(toTone(curr.x, curr.y, chordToneDegree))[getRandomInt(4)];
      
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
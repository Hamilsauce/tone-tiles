// import { MusicalScales, NoteData } from './src/data/index.js';
import { NoteData, major7, MusicalScales, getScaleNotes, getChordNotes, pitchToFrequency } from '../MUSIC_THEORY_FUNCTIONS.js';

import ham from 'ham';
const { sleep } = ham;

const toPitchClassNames = (notesArray = []) => notesArray
	.filter((x, i) => i <= 11)
	.map(({ pitchClass }, i) => pitchClass);

const moduleState = {
	scaleMap: new Map(Object.entries(MusicalScales)),
	noteMap: new Map(
		NoteData.map((note) => [note.pitch, note])
	),
	pitchClassNames: toPitchClassNames(NoteData),

	orderPitchesFromNote(pitch) {
		const index = this.pitchClassNames.indexOf(pitch)

		const reorder1 = this.pitchClassNames
			.slice(index)
			.concat(this.pitchClassNames.slice(0, index))

		return reorder1
	},

	getScale(name) {
		return this.scaleMap.get(name)
	},

	getNote(pitch) {
		return this.noteMap.get(pitch)
	},
};

const badChars = '",{,} ';

/*
  my current janker. for context MusicalScales and NoteData is a json of note objects from C0 to B8 of shape:

  {
	"id": 5,
	"step": 5,
	"note": "F",
	"name": "F0",
	"isNatural": true,
	"frequency": 21.83,
	"wavelength": 1580.63,
	"octave": 0
},
*/
const initNumberInRangeTester = (lower = 0, upper = 1) => (num) => {
	return typeof num === 'number' &&
		num >= lower &&
		num < upper;
}

const initIndexIncrementLooper = (initialIndex = 0, lower = 0, upper = 1) => {
	const isNumberInRange = initNumberInRangeTester(0, upper)
	let index = initialIndex;

	return (override) => {
		index = isNumberInRange(override) ? override : (index + 1) % upper;
		return index;
	}
}

function* generator(rootName, scaleName = 'major', orderedPitches = [], octave = 0) {
	const baseNote = moduleState.noteMap.get(rootName);
	const scale = moduleState.getScale(scaleName);
	const baseIndex = baseNote.id;

	let index = 0;
	// let indexOverride
	let currentDegree = scale[index]
	const loopIncrementIndex = initIndexIncrementLooper(index, baseIndex, scale.length)

	while (true) {
		const { indexOverride, incrementModifier } = yield NoteData[baseIndex + currentDegree]
		index = incrementModifier ? index + incrementModifier : loopIncrementIndex(index) + indexOverride ?? 0;
		currentDegree = scale[index] ?? 12;
	}
}

export const run = (rootName = 'E2', scaleName = 'chromatic') => {
	return generator(rootName, scaleName)
};


/*
 combine that with this proper iterator class
 */
export class CircularIterator {
	constructor(sourceArray = []) {
		if (!Array.isArray(sourceArray) || sourceArray.length === 0) {
			throw new Error("CircularIterator requires a non-empty array.");
		}
		this.sourceArray = sourceArray;
		this.iterator = circleLooper(sourceArray);
		this.current = this.sourceArray[0]; // Start with the first item
	}

	// Start the loop from the beginning (reset)
	reset() {
		this.iterator = circleLooper(this.sourceArray);
		this.current = this.sourceArray[0];
	}

	// Get the current item
	currentItem() {
		return this.current;
	}

	// Advance the loop by one item
	next() {
		this.current = this.iterator.next().value;
		return this.current;
	}

	// Skip to a specific index in the array
	jumpTo(index) {
		if (index >= 0 && index < this.sourceArray.length) {
			this.iterator.next(index);
			this.current = this.sourceArray[index];
		}
		return this.current;
	}

	// Peek at the next item without advancing
	peekNext() {
		const current = this.iterator.next().value;
		this.iterator = circleLooper(this.sourceArray); // Reset the iterator
		return current;
	}
}

// The generator function itself
function* circleLooper(sourceArray = [], delay = 0) {
	let index = 0;
	let indexOverride;
	let currentItem = sourceArray[index];

	while (true) {
		indexOverride = yield currentItem;

		if (indexOverride >= 0) {
			index = indexOverride;
			indexOverride = null;
		} else {
			index = index < sourceArray.length ? index + 1 : 0;
		}

		currentItem = sourceArray[index];

		if (!currentItem) {
			index = 0;
			currentItem = sourceArray[index];
		}
	}
}
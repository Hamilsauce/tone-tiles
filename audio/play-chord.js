import ham from 'ham';
const { sleep } = ham;


const AudioContext = window.AudioContext || window.webkitAudioContext;
const ctx = new AudioContext();

// ======== GRAPH (UNCHANGED) ========

const master = ctx.createGain();
master.gain.value = 0.3;
master.connect(ctx.destination);

const delay = ctx.createDelay();
delay.delayTime.value = 0.25;

const feedback = ctx.createGain();
feedback.gain.value = 0.4;

delay.connect(feedback);
feedback.connect(delay);

const delayMix = ctx.createGain();
delayMix.gain.value = 0.4;

delay.connect(delayMix);
delayMix.connect(master);

// ======== STATE ========

let lastFreq = 261.63;

// optional mapping helper
function pointToFreq({ x, y }) {
	const base = 261.63;
	return base * Math.pow(2, (x + y) / 12);
}

let currentVoice = null;

// export async function playChordLong(options = {}) {
// 	if (ctx.state === 'suspended') await ctx.resume();

// 	const {
// 		point,
// 		freq: inputFreq,
// 		time = ctx.currentTime,
// 		crossfade = 0.08, // 👈 tweak this
// 	} = options;

// 	const freq = inputFreq || pointToFreq(point || { x: 0, y: 0 });

// 	// 🔥 kill previous voice cleanly
// 	if (currentVoice) {
// 		currentVoice.stop(time, crossfade);
// 	}

// 	const filter = ctx.createBiquadFilter();
// 	filter.type = 'lowpass';
// 	filter.frequency.setValueAtTime(1200, time);

// 	const amp = ctx.createGain();
// 	amp.gain.setValueAtTime(0, time);

// 	// original envelope
// 	amp.gain.linearRampToValueAtTime(0.8, time + 0.01);
// 	amp.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

// 	filter.connect(amp);
// 	amp.connect(master);
// 	amp.connect(delay);

// 	const ratios = [1, 1.25, 1.5];
// 	const oscillators = [];

// 	ratios.forEach(r => {
// 		const osc = ctx.createOscillator();
// 		osc.type = "triangle";

// 		osc.frequency.setValueAtTime(lastFreq * r, time);
// 		osc.frequency.linearRampToValueAtTime(freq * r, time + 0.02);

// 		osc.connect(filter);
// 		osc.start(time);
// 		osc.stop(time + 0.5);

// 		oscillators.push(osc);
// 	});

// 	lastFreq = freq;

// 	// 👇 store voice handle
// 	currentVoice = {
// 		stop(atTime, fadeTime = 0.05) {
// 			amp.gain.cancelScheduledValues(atTime);

// 			// smooth fade instead of hard cut
// 			amp.gain.setTargetAtTime(0.0001, atTime, fadeTime);

// 			oscillators.forEach(o => {
// 				try {
// 					o.stop(atTime + fadeTime * 4);
// 				} catch {}
// 			});
// 		}
// 	};
// }

// ======== EXACT VOICE ========

export async function playChord(options = {}) {
	if (ctx.state === 'suspended') await ctx.resume();
	
	const {
		point,
		freq: inputFreq,
		time = ctx.currentTime,
	} = options;
	
	const freq = inputFreq || pointToFreq(point || { x: 0, y: 0 });
	
	const filter = ctx.createBiquadFilter();
	filter.type = 'lowpass';
	filter.frequency.setValueAtTime(1200, time);
	
	const amp = ctx.createGain();
	amp.gain.setValueAtTime(0, time);
	
	// ======== ORIGINAL ENVELOPE ========
	amp.gain.linearRampToValueAtTime(0.4, time + 0.01);
	amp.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
	
	filter.connect(amp);
	amp.connect(master);
	amp.connect(delay);
	
	const ratios = [1, 1.25, 1.5];
	
	ratios.forEach(async(r, i) => {
		const osc = ctx.createOscillator();
		osc.type = "triangle";
		
		// original glide behavior
		osc.frequency.setValueAtTime(lastFreq * r, time);
		osc.frequency.linearRampToValueAtTime(freq * r, time + 0.02);
		
		osc.connect(filter);
		await sleep(50 * i)
		osc.start(time);
		osc.stop(time + 0.5);
	});
	
	lastFreq = freq;
}
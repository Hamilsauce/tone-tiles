import { getChordToneDegreeFromDir, getDirectionFromPoints } from '../core/spatial/utils.js';
import { GlideVoice } from './GlideVoice.js';
import { LoopableScaleSequence } from './LoopableScaleSequence.js';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const normalizeRhythmPattern = ({ playEvery = 1, playPattern = null } = {}) => {
	if (Array.isArray(playPattern) && playPattern.length) {
		const pattern = playPattern
			.map(step => Number(step))
			.filter(step => step === 0 || step === 1);

		if (pattern.length) {
			return pattern;
		}
	}

	const interval = Math.max(1, Math.floor(playEvery || 1));

	return Array.from({ length: interval }, (_, index) => index === 0 ? 1 : 0);
};

const getDirectionAnchorDegree = (direction) => getChordToneDegreeFromDir(direction) ?? 0;

const getDirectionTravelPolarity = (direction) => {
	if (direction === 'right' || direction === 'down') {
		return 1;
	}

	if (direction === 'left' || direction === 'up') {
		return -1;
	}

	return 0;
};

export const createTraversalGlissController = ({
	audioEngine,
	options = {},
} = {}) => {
	const traversalMelodyOptions = {
		rootPitch: 'C4',
		scaleName: 'major',
		octaveSpan: 3,
		glideTime: 0.054,
		turnGlideTime: 0.03,
		teleportGlideTime: 0.1,
		teleportLeadTime: 18,
		releaseTime: 0.2,
		velocity: 0.205,
		playEvery: 1,
		playPattern: null,
		...options,
	};

	const traversalRhythmPattern = normalizeRhythmPattern(traversalMelodyOptions);
	const traversalSequence = new LoopableScaleSequence(traversalMelodyOptions);
	const traversalVoice = new GlideVoice(audioEngine.ctx);

	let traversalPrevDirection = null;
	let traversalRhythmIndex = 0;
	let traversalTeleportTimer = null;
	let traversalSameDirCount = 0;
	let traversalPersistencePhase = 0;

	const getTraversalExpression = (direction, sameDirCount = 0) => {
		const persistence = Math.max(0, sameDirCount - 1);
		const mediumBlend = clamp(persistence / 2.5, 0, 1);
		const longBlend = clamp((persistence - 4) / 5, 0, 1);
		const travelWave = Math.sin(traversalPersistencePhase);
		const swellWave = Math.sin((traversalPersistencePhase * 0.53) + 0.9);
		const lift = Math.max(0, travelWave);
		const ebb = Math.max(0, -travelWave);
		const polarity = getDirectionTravelPolarity(direction);

		return {
			glideScale: clamp(
				0.74 +
				(mediumBlend * 0.22) +
				(longBlend * (0.14 + (lift * 0.1) - (ebb * 0.04))),
				0.68,
				1.24
			),
			brightness: clamp(
				0.24 +
				(mediumBlend * 0.16) +
				(longBlend * (0.1 + (travelWave * 0.11) + (swellWave * 0.05))),
				0.16,
				0.72
			),
			warmth: clamp(
				0.16 +
				(mediumBlend * 0.14) +
				(longBlend * (0.12 + (lift * 0.07) + (swellWave * 0.04))),
				0.1,
				0.64
			),
			width: clamp(
				0.12 +
				(mediumBlend * 0.18) +
				(longBlend * (0.18 + (lift * 0.09))),
				0.08,
				0.68
			),
			level: clamp(
				0.43 +
				(mediumBlend * 0.08) +
				(longBlend * (0.06 + (lift * 0.06))),
				0.38,
				0.68
			),
			pan: clamp(
				polarity * longBlend * (0.06 + (travelWave * 0.18)),
				-0.28,
				0.28
			),
			articulationDepth: clamp(
				0.18 -
				(mediumBlend * 0.055) -
				(longBlend * 0.05) +
				(ebb * longBlend * 0.018),
				0.055,
				0.2
			),
			articulationBloom: clamp(
				0.022 +
				(mediumBlend * 0.016) +
				(longBlend * (0.02 + (lift * 0.026) + (Math.max(0, swellWave) * 0.012))),
				0.016,
				0.09
			),
		};
	};

	const resetTraversalMelodyState = () => {
		traversalPrevDirection = null;
		traversalRhythmIndex = 0;
		traversalSameDirCount = 0;
		traversalPersistencePhase = 0;
		traversalSequence.reset(0);
	};

	const ensureReady = async () => {
		try {
			await audioEngine.ensureReady();
		} catch (error) {
			console.warn('Unable to resume traversal audio context', error);
		}
	};

	const clearTraversalTeleportTimer = () => {
		if (traversalTeleportTimer !== null) {
			window.clearTimeout(traversalTeleportTimer);
			traversalTeleportTimer = null;
		}
	};

	const end = ({ release = true } = {}) => {
		clearTraversalTeleportTimer();

		if (release) {
			traversalVoice.release(traversalMelodyOptions.releaseTime);
		} else {
			traversalVoice.dispose();
		}

		resetTraversalMelodyState();
	};

	const start = () => {
		void ensureReady();
		end({ release: false });
	};

	const reanchorTraversalMelody = (direction, { isStart = false } = {}) => {
		const note = traversalSequence.reset(getDirectionAnchorDegree(direction));
		const expression = getTraversalExpression(direction, 1);

		traversalRhythmIndex = 0;
		traversalSameDirCount = 1;
		traversalPersistencePhase = 0;

		if (!traversalVoice.isActive || isStart) {
			traversalVoice.start(note.frequency, traversalMelodyOptions.velocity);
		} else {
			traversalVoice.glideTo(note.frequency, traversalMelodyOptions.turnGlideTime);
		}

		traversalVoice.setExpression({
			...expression,
			width: expression.width * 0.7,
			level: expression.level * 0.96,
		}, { immediate: isStart });

		traversalPrevDirection = direction;

		return note;
	};

	const shouldPlayTraversalStep = () => {
		const step = traversalRhythmPattern[traversalRhythmIndex % traversalRhythmPattern.length] ?? 1;
		traversalRhythmIndex++;
		return step === 1;
	};

	const getTraversalNodeNote = ({ x = 0, y = 0 } = {}) => {
		const index = Math.abs((x ?? 0) + (y ?? 0)) % traversalSequence.length;
		return traversalSequence.noteAt(index);
	};

	const playTeleportGliss = (fromNode, toNode) => {
		if (!fromNode || !toNode) {
			return;
		}

		clearTraversalTeleportTimer();

		const sourceNote = getTraversalNodeNote(fromNode.point);
		const destinationNote = getTraversalNodeNote(toNode.point);

		if (traversalVoice.isActive) {
			traversalVoice.glideTo(sourceNote.frequency, 0.025);
		} else {
			traversalVoice.start(sourceNote.frequency, traversalMelodyOptions.velocity);
		}

		traversalVoice.setExpression({
			brightness: 0.28,
			warmth: 0.18,
			width: 0.18,
			level: 0.46,
			pan: 0,
		}, { immediate: true });

		traversalTeleportTimer = window.setTimeout(() => {
			traversalVoice.glideTo(destinationNote.frequency, traversalMelodyOptions.teleportGlideTime);
			traversalTeleportTimer = null;
		}, traversalMelodyOptions.teleportLeadTime);

		traversalPrevDirection = null;
		traversalRhythmIndex = 0;
		traversalSameDirCount = 0;
		traversalPersistencePhase = 0;
	};

	const handleMove = ({ prevPoint, point } = {}) => {
		const direction = getDirectionFromPoints(prevPoint, point);

		if (!direction) {
			return { direction: null, didTurn: false, played: false };
		}

		if (!traversalVoice.isActive || traversalPrevDirection === null) {
			reanchorTraversalMelody(direction, { isStart: true });
			return { direction, didTurn: true, played: true };
		}

		if (traversalPrevDirection !== direction) {
			reanchorTraversalMelody(direction);
			return { direction, didTurn: true, played: true };
		}

		traversalSameDirCount++;
		traversalPersistencePhase += clamp(0.66 + (traversalSameDirCount * 0.085), 0.66, 1.08);

		if (!shouldPlayTraversalStep()) {
			return { direction, didTurn: false, played: false };
		}

		const note = traversalSequence.next();
		const expression = getTraversalExpression(direction, traversalSameDirCount);
		const glideTime = traversalMelodyOptions.glideTime * expression.glideScale;

		traversalVoice.setExpression(expression);
		traversalVoice.glideTo(note.frequency, glideTime);
		traversalVoice.articulate({
			depth: expression.articulationDepth,
			bloom: expression.articulationBloom,
			dipTime: 0.011,
			recoverTime: 0.16,
			settleTime: 0.3,
		});

		return { direction, didTurn: false, played: true };
	};

	return {
		end,
		ensureReady,
		handleMove,
		playTeleportGliss,
		start,
	};
};

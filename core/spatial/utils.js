export const DIRECTIONS = new Map([
	['up', { x: 0, y: -1 }],
	['down', { x: 0, y: 1 }],
	['left', { x: -1, y: 0 }],
	['right', { x: 1, y: 0 }],
]);

export const DIR_LOOKUP = new Map(
	[...DIRECTIONS.entries()].map(([name, { x, y }]) => [
		`${x}_${y}`,
		name
	])
);

export const DIRECTION_CHORD_TONE = new Map([
	['up', 0],
	['down', 2],
	['left', 4],
	['right', 6],
]);

export const getChordToneDegreeFromDir = (dir) => {
	return DIRECTION_CHORD_TONE.get(dir);
};

export const getLinkCoords = (dir = 'n', { width, height }) => {
	let x, y;
	
	if (dir.toLowerCase() === 'n') {
		x = Math.floor(width / 2);
		y = -1;
	}
	
	if (dir.toLowerCase() === 'e') {
		y = Math.floor(height / 2);
		x = width;
	}
	
	if (dir.toLowerCase() === 's') {
		x = Math.floor(width / 2);
		y = height;
	}
	
	if (dir.toLowerCase() === 'w') {
		x = -1;
		y = Math.floor(height / 2);
	}
	
	return { x, y };
};

export const getDirectionFromPoints = (p1, p2) => {
	if (!p1 || !p2) return null;
	
	const dx = p2.x - p1.x;
	const dy = p2.y - p1.y;
	
	return DIR_LOOKUP.get(`${dx}_${dy}`) || null;
};
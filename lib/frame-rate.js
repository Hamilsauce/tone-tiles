const state = {
	sampleIndex: 0,
	fpsSamples: [0, 0, 0, 0, 0],
	elapsed: 0,
	deltaMs: 0,
	setFPS(delta) {
		const i = this.sampleIndex;
		this.fpsSamples[i] = Math.round((1 / (delta / 1000)))
		this.sampleIndex = i >= 5 ? 0 : i + 1;
		
	},
	get deltaMs() { return Math.round(((1 / (this.deltaMs / 1000)) + this.fpsSamples) / 2); },
	get fps() { return Math.round(this.fpsSamples.reduce((sum, curr, i) => sum + curr, 0) / this.fpsSamples.length) },
}


export const frameRate = (delta) => {
	state.setFPS(delta);
	
	return state.fps;
};

window.fpsState = state
import { CanvasObject, DefaultCanvasObjectOptions } from './CanvasObject.js';
import { getDirectionFromPoints } from '../core/spatial/utils.js';

const directionPivot = {
	up: {
		down: -1,
		left: -1,
		right: 1
	},
	down: {
		up: -1,
		left: 1,
		right: -1
	},
	left: {
		up: 1,
		down: -1,
		right: -1
	},
	right: {
		up: -1,
		down: 1,
		left: -1,
	},
}

export class DarkSun extends CanvasObject {
	#ticker = 0;
	#travelDir = 'down';
	#currentRotation = 0;
	#rotation = 0;
	#rotationMod = 1;
	#rotationStep = 100;
	
	constructor(ctx, options = DefaultCanvasObjectOptions) {
		const model = {
			...{},
			...(options.model ?? {}),
		};
		
		super(ctx, 'dark-sun', {
			...options,
			model,
		});
		
		this.phase = 0;
	}
	
	update(patch) {
		if (patch && patch.point) {
			const prevDir = this.#travelDir;
			this.#travelDir = getDirectionFromPoints(this.point, patch.point) ?? this.#travelDir
			
			if (prevDir !== this.#travelDir) {
				this.#rotationMod = directionPivot[prevDir][this.#travelDir]
			}
		}
		
		super.update(patch);
		this.advanceRotation();
		
		return this
	}
	
	advanceRotation(dr) {
		const change = (dr ?? this.#rotationStep) * this.#rotationMod;
		
		this.#rotation = this.#rotation + change;
		
		this.rotateTo(this.#rotation);
	}
}
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

export class BigRupture extends CanvasObject {
	#ticker = 0;
	#travelDir = 'down';
	#currentRotation = 0;
	#rotation = 0;
	#rotationMod = 1;
	#rotationStep = 50;
	
	constructor(ctx, options = DefaultCanvasObjectOptions) {
		const model = {
			...{},
			...(options.model ?? {}),
		};
		
		super(ctx, 'big-rupture', {
			...options,
			effects: ['radial'],
			model,
		});
		
		this.phase = 0;
		this.scaleMod = 0.2;
		this.scaleValue = 3;
		this.scaleTo(this.scaleValue);
		
		setInterval(() => {
			if (this.scaleValue >= 3.3) {
				this.scaleMod = -0.2;
			} else if (this.scaleValue <= 2.4) {
				this.scaleMod = 0.2;
			}
			
			this.scaleValue += this.scaleMod;
			this.scaleTo(this.scaleValue);
			this.rotateTo(this.transforms.rotation.deg + 4.25)
		}, 40);
	}
	
	recoil(time) {
		const prev = this.#travelDir
		const curr = { x: this.x, y: this.y };
		const prevDir = this.#travelDir;
		
		this.#travelDir = getDirectionFromPoints(prev, curr) ?? this.#travelDir ?? 'down';
		const turnDegree = directionPivot[prevDir][this.#travelDir] ?? 0
		const ang = this.phase === 0 ? 65 : -65;
		
		this.toggle({ recoiling: true }, { time: 500 });
		
		this.rotateTo(this.#currentRotation + turnDegree, 0.0, 0.0);
		this.phase = this.phase === 0 ? 1 : 0;
	}
	
	
	update(patch) {
		if (patch && patch.point) {
			const prevDir = this.#travelDir;
			this.#travelDir = getDirectionFromPoints(this.point, patch.point) ?? this.#travelDir;
			
			if (prevDir !== this.#travelDir) {
				this.#rotationMod = directionPivot[prevDir][this.#travelDir];
			}
		}
		
		super.update(patch);
		// this.advanceRotation();
		
		return this;
	}
	
	advanceRotation(dr) {
		const change = (dr ?? this.#rotationStep) * this.#rotationMod;
		
		this.#rotation = this.#rotation + change;
		
		this.rotateTo(this.#rotation, 0.1, -0.1);
	}
}
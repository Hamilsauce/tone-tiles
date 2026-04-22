import { Model } from './Model.js';
// import { Point } from '../core/spatial/Point.js';
import { EventTypes } from '../core/types/event.types.js';
import { CanvasPoint } from '../canvas/CanvasPoint.js';
const Point = CanvasPoint;

export class SpatialModel extends Model {
	#point;
	
	constructor({ point, ...rest }) {
		super(rest);
		
		this.#point = point instanceof Point ?
			point :
			new Point(point?.x ?? 0, point?.y ?? 0);
	}
	
	// --- getters ---
	
	get point() {
		return this.#point;
	}
	
	get x() {
		return this.#point.x;
	}
	
	get y() {
		return this.#point.y;
	}
	
	// --- core spatial ops ---
	
	setPoint(nextPoint, meta) {
		const prev = this.#point;
		
		const normalized = nextPoint instanceof Point ?
			nextPoint :
			new Point(nextPoint.x, nextPoint.y);
		
		if (prev.x === normalized.x && prev.y === normalized.y) {
			return; // no-op
		}
		
		this.#point = normalized;
		
		this.emit({
			type: this.type,
			kind: EventTypes.UPDATE,
			payload: {
				id: this.id,
				point: normalized,
				prevPoint: prev,
			},
			meta,
		});
	}
	
	translate(dx, dy, meta) {
		this.setPoint(
			new Point(this.#point.x + dx, this.#point.y + dy),
			meta
		);
	}
	
	// optional but useful
	setXY(x, y, meta) {
		this.setPoint(new Point(x, y), meta);
	}
}
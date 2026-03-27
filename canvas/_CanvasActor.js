import { CanvasObject, DefaultCanvasObjectOptions } from './CanvasObject.js'
import { CanvasPoint } from './CanvasPoint.js'

export class CanvasActor extends CanvasObject {
	
	constructor(ctx, options = DefaultCanvasObjectOptions) {
		const model = CanvasActor.normalizeModel(options.model)
		super(ctx, 'actor', {
			...options,
			model,
			x: model.x,
			y: model.y,
		})
		
		// traversal + motion state
		this.traversal = null
		this.motion = null
		this.currentNode = null
	}
	
	// ---------- model normalization ----------
	
	static normalizeModel(input) {
		if (!input) {
			return { point: new CanvasPoint(0, 0), isMoving: false }
		}
		
		if (input.point instanceof CanvasPoint) {
			return {
				isMoving: false,
				...input
			}
		}
		
		if (input instanceof CanvasPoint) {
			return { point: input, isMoving: false, teleporting: false }
		}
		
		if ('x' in input && 'y' in input) {
			return {
				point: new CanvasPoint(input.x, input.y),
				isMoving: false
			}
		}
		
		throw new Error('Invalid CanvasActor model')
	}
	
	// ---------- accessors ----------
	
	get point() { return this.model.point }
	get x() { return this.point.x }
	get y() { return this.point.y }
	
	// ---------- traversal ----------
	
	setTraversal(generator) {
		this.traversal = generator
		
		// optional: interrupt current motion
		this.motion = null
	}
	
	clearTraversal() {
		this.traversal = null
		this.motion = null
		this.model.isMoving = false
	}
	
	stepTraversal(loop) {
		if (!this.traversal) return
		if (this.motion) return
		
		const { value: node, done } = this.traversal.next()
		
		if (done || !node) {
			this.traversal = null
			return
		}
		
		this.moveTo(node, loop)
	}
	
	// ---------- motion ----------
	
	moveTo(node, loop, duration = 0.15) {
		const from = new CanvasPoint(this.x, this.y)
		const to = new CanvasPoint(node.x, node.y)
		
		this.motion = {
			from,
			to,
			start: loop.time,
			duration,
			node
		}
		
		this.model.isMoving = true
	}
	
	updateMotion(loop) {
		if (!this.motion) return false
		
		const { from, to, start, duration, node } = this.motion
		
		const t = (loop.time - start) / duration
		
		if (t >= 1) {
			this.point.set(to.x, to.y)
			
			this.motion = null
			this.model.isMoving = false
			this.currentNode = node
			
			this.onNodeArrival(node, loop)
			
			return false // motion finished
		}
		
		const p = from.lerp(to, t)
		this.point.set(p.x, p.y)
		
		return true // still moving
	}
	
	onNodeArrival(node, loop) {
		// 🔥 node side-effects live here
		node.update({
			current: true,
			active: true
		})
		
		// example of your earlier scheduling question
		loop.schedule(() => {
			node.update({ active: false })
		}, 0.3)
	}
	
	// ---------- main update ----------
	
	update(loop) {
		// 1. continue motion if active
		const moving = this.updateMotion(loop)
		
		if (moving) return
		
		// 2. otherwise pull next traversal step
		this.stepTraversal(loop)
	}
	
	// ---------- render hook ----------
	
	render() {
		// assumes TransformList API like: translate.set(x,y)
		if (this.transforms?.translate) {
			this.transforms.translate.set(this.x, this.y)
		}
	}
}
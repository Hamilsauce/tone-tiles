import { useAppState } from '../../store/app.store.js';
import { frameRate } from '../../lib/frame-rate.js';

export class AudioClockLoop {
	#running = false;
	#rafId = null;
	#debug = false;
	#timeSource; // () => seconds
	#lastTime = 0;

	#routines = new Set();
	#render;

	constructor({
		audioContext = null,
		routines = [],
		render = () => {},
	} = {}) {
		this.#timeSource = audioContext ?
			() => audioContext.currentTime :
			() => performance.now() / 1000;

		for (const r of routines) this.#routines.add(r);
		this.#render = render;
		// window.looper = this
		this.appStore = useAppState();

		// const removeFrameRateRoutine = loopEngine.addRoutine((dt) => {
		// 	appStore.setFrameRate(frameRate(dt * 1000));
		// });

	}

	get running() { return this.#running; }

	addRoutine(fn) {
		this.#routines.add(fn);
		return () => this.#routines.delete(fn);
	}

	removeRoutine(fn) {
		return this.#routines.delete(fn);
	}

	toggleDebug(v) {
		this.#debug = v === undefined ? !this.#debug : !!v;
		console.warn('LOOP DEBUG', this.#debug)

	}

	start() {
		if (this.#running) return;
		this.#running = true;

		this.#lastTime = this.#timeSource();

		let dtSum = 0

		const frame = () => {
			if (this.#debug) {
				console.warn('LOOP DEBUG')
			}

			try {
				if (!this.#running) return;

				const now = this.#timeSource();
				let dt = now - this.#lastTime;
				this.#lastTime = now;

				dt = Math.min(Math.max(dt, 0), 0.1);

				// if (dtSum <= 0.1) {
				// 	dtSum += dt
				// 	this.#rafId = requestAnimationFrame(frame);
				// 	return
				// }
				this.appStore.setFrameRate(frameRate(dt * 1000));
				// dtSum = 0
				// Clamp dt to avoid explosion after tab stalls

				for (const routine of this.#routines) {
					routine(dt, now);
				}

				this.#render(dt, now);

				this.#rafId = requestAnimationFrame(frame);
			} catch (e) {
				throw e
			}
		};

		this.#rafId = requestAnimationFrame(frame);
	}

	pause() {
		this.#running = false;
		if (this.#rafId !== null) cancelAnimationFrame(this.#rafId);
		this.#rafId = null;
	}

	stop() {
		this.pause();
	}
	destroy() {
		this.pause();

		this.#routines.clear();
		this.#render = undefined

	}
}
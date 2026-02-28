import { EventEmitter } from 'https://hamilsauce.github.io/hamhelper/event-emitter.js';

import { AudioNote } from './AudioNote.js';

class AudioEngine extends EventEmitter {
  constructor() {
    super();
    
    this.ctx = new AudioContext()
    this.instruments = new Map()
  }
  
  get now() {
    return this.ctx.currentTime
  }
  
  registerInstrument(name, instrument) {
    this.instruments.set(name, instrument)
  }
  
  trigger(name, event) {
    const inst = this.instruments.get(name)
    inst?.trigger(event, this.ctx)
  }
  
  schedule(name, event) {
    const inst = this.instruments.get(name)
    inst?.trigger(event, this.ctx)
  }
  
  
}

export const audioEngine = new AudioEngine()
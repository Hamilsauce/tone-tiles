export const DefaultModelProperties = {
  width: 1,
  height: 1,
  selected: false,
  active: false,
  hide: false,
  recoiling: false,
  disabled: false,
};

export const DefaultModelOptions = {
  type: '',
  id: '',
  properties: DefaultModelProperties,
  emitCallback: null,
};

export class Model {
  #type = null;
  #id = null;
  #properties;
  #emit;
  
  constructor(options = DefaultModelOptions) {
    const { id, type, properties, emitCallback } = options;
    
    if ([id, type, emitCallback, properties].includes(undefined)) {
      throw new Error(`Model requires id, type, and emitCallback: ${JSON.stringify(options)}`);
    }
    
    this.#id = id;
    this.#type = type;
    this.#properties = { ...properties ?? DefaultModelProperties };
    this.#emit = emitCallback;
  }
  
  get id() { return this.#id; }
  
  get type() { return this.#type; }
  
  get hidden() { return !!this.#properties.hide; }
  
  get properties() { return { ...this.#properties }; }
  
  get emit() { return this.#emit; }
  
  get DefaultProperties() { return { properties: { ...DefaultModelProperties } }; }
  
  // update(attributeMap = {}) {
  //   let patch = { ...this.data(), ...this.data().properties };
  
  //   if (attributeMap) {
  //     patch = Object.entries(attributeMap).reduce((ptch, [k, v]) => {
  //       const modelV = this.#properties[k];
  //       const isValid = !(v === undefined || modelV === undefined);
  
  //       if (v !== undefined && v !== modelV) {
  //         ptch = ptch ?? {};
  //         this.#properties[k] = v;
  //         ptch[k] = v;
  //       } else if (!isValid) {
  //         console.error(`[${this.constructor.name} ${this.id}] invalid Model patch: ${k}: ${v}`);
  //       }
  
  //       return ptch;
  //     }, null);
  
  //     if (!patch) return;
  //   }
  
  //   // instantiate event or push raw data to stream?
  //   this.#emit?.({
  //     type: `${this.#type}:update`,
  //     id: this.id,
  //     data: patch,
  //   });
  
  //   return this;
  // }
  update({ spatial, traversal, ...rest }) {
    let patch = {}
    const attributeMap = rest
    
    // console.warn('{ spatial, traversal, ...rest }', { spatial, traversal, ...rest })
    
    patch = Object.entries(attributeMap).reduce((ptch, [k, v]) => {
      const modelV = this.#properties[k];
      if (v === undefined || modelV === undefined || v === modelV) return ptch;
      
      const isValid = !(v === undefined || modelV === undefined);
      
      ptch = ptch ?? {};
      this.#properties[k] = v;
      ptch[k] = v;
      
      return ptch;
    }, null);
    
    if (!patch) return;
    
    this.emit({ properties: patch, traversal, spatial })
    
    return this;
  }
  
  toJSON() {
    return { properties: { ...this.#properties }, type: this.#type, id: this.#id };
  }
  
  data() {
    const res = this.toJSON();
    
    Object.entries(res).forEach(([k, v]) => {
      if ([undefined].includes(v)) {
        delete res[k];
      }
    });
    
    return res;
  }
}
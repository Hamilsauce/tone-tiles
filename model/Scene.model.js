export class SceneModel {
  constructor() {
    this.root;
  };
  
  get prop() { return this._prop };
  set prop(newValue) { this._prop = newValue };
}
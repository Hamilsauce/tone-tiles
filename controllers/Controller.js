export class Controller {
  #type = null;
  
  constructor(type = 'default', options = {
    
  }) {
    this.#type = type;
  };
  
  get type() { return this.#type };
}
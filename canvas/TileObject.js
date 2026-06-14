import { CanvasObject, DefaultCanvasObjectOptions } from './CanvasObject.js';

export class TileObject extends CanvasObject {
  constructor(ctx, options = DefaultCanvasObjectOptions) {
    const node = options.model;
    
    options.id = node.id ?? node.address;
    
    super(ctx, 'tile', options);
    
    if (node.point.x % 2 || node.point.y % 2) {
      this.rotateTo(1.6)
    } else {
      this.rotateTo(-1.5)
      
    }
    
    
    // setInterval(() => {
    //   this.rotateTo(this.transforms.rotation.deg + 1, 0.5, 0.5)
    // }, 16)
    
    // this.rotateTo(45)
    
  };
  
  // wobble(done) {
  //   this.rotateTo(50, 0.5, 0.5)
    
  //   setTimeout(() => {
  //     this.rotateTo(-50, 0.5, 0.5)
      
  //     setTimeout(() => {
  //       this.rotateTo(0, 0.5, 0.5)
        
  //     }, 150)
      
  //   }, 150)
    
  // }
  
  wobble2(done) {
    
    if (done === true) {
      clearInterval(this.intId)
      
      this.rotateTo(0, 0.5, 0.5)
      return
    }
    
    let dir = 0.1
    
    this.intId = setInterval(() => {
      
      if (done === true) {
        clearInterval(intId)
        
        this.rotateTo(0, 0.5, 0.5)
        return
      }
      
      this.rotateTo(this.transforms.rotation.deg + (dir), 0.5, 0.5)
      if (this.transforms.rotation.deg > 20) {
        dir = -0.1
      }
      else if (this.transforms.rotation.deg < 20) {
        dir = 0.1
      }
    }, 40)
    
    
  }
}
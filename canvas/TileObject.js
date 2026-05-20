import { CanvasObject, DefaultCanvasObjectOptions } from './CanvasObject.js';

export class TileObject extends CanvasObject {
  constructor(ctx, options = DefaultCanvasObjectOptions) {
    const node = options.model;
    
    options.id = node.id ?? node.address;
    
    super(ctx, 'tile', options);
    if (node.point.x % 2 || node.point.y % 2) {
  // rotate = baseRotation + sin(time + phase) * 0.15   
      // this.rotateTo(Math.sin(1 + 1) * 1.75)
      this.rotateTo(1.6)
    } else {
      // this.rotateTo(-Math.sin(1 + -1) * 1.5)
      this.rotateTo(-1.5)

    }
    // if (node.point.x % 2 || node.point.y % 2) {
    //   console.warn('[[[[node]]]]', node.point)
    // this.rotateTo(16)
    
    // }
    
    // if (this.id?.includes('3')) {
    //   this.rotateTo(16)
    
    // }
    
    // setInterval(() => {
    //   this.rotateTo(this.transforms.rotation.deg + 1, 0.5, 0.5)
    // }, 16)
    
    // this.rotateTo(45)
    
  };
  
  
}
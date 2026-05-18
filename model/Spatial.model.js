import { Model, DefaultModelProperties } from './Model.js';
import { Point } from '../core/spatial/Point.js';
import { EventTypes } from '../core/types/event.types.js';

export const DefaultSpatialProperties = {
  point: Point,
  isCollidable: true,
  isTraversable: false,
};


export class SpatialModel extends Model {
  #spatial = { ...DefaultSpatialProperties };
  
  constructor({ point, isCollidable, isTraversable, ...rest }) {
    if (!(Point.isPoint(point) || Point.isPointLike(point))) {
      throw new Error(`SpatialModel requires a valid point: ${JSON.stringify(point)}`);
    }
    
    super({ ...rest });
    
    this.#spatial = { point, isCollidable, isTraversable }
  }
  
  // --- getters ---
  
  get point() {
    return this.#spatial.point;
  }
  
  get x() {
    return this.point.x;
  }
  
  get y() {
    return this.point.y;
  }
  
  syncPoint(nextPoint) {
    const prev = Point.from(this.point)
    const normalized = Point.from(nextPoint);
    
    if (prev.equals(normalized)) {
      return null;
    }
    
    // this.point = normalized;
    this.update({ point: Point.from(nextPoint) })
    
    return {
      prevPoint: prev,
      point: normalized,
    };
  }
  
  update({ point, isCollidable, isTraversable, ...rest }) {
    let spatial = {}
    const attributeMap = { point, isCollidable, isTraversable }
    
    spatial = Object.entries(attributeMap).reduce((ptch, [k, v]) => {
      const modelV = this.#spatial[k];
      if (v === undefined || modelV === undefined || v === modelV) return ptch;
      
      const isValid = !(v === undefined || modelV === undefined);
      
      ptch = ptch ?? {};
      this.#spatial[k] = v;
      ptch[k] = v;
      
      return ptch;
    }, null);
    
    if (!spatial) return super.update({
      ...rest
    });
    
    return super.update({ ...rest, spatial })
    
    return this;
  }
  
  // update({ point, isCollidable, isTraversable, ...rest, }) {
  //   const payload = {
  //     ...rest,
  //     spatial: {
  //       point,
  //       isCollidable,
  //       isTraversable
  //     }
  //   }
  
  //   const prev = this.point;
  //   const normalized = Point.from(nextPoint);
  
  //   if (this.point.equals(normalized)) {
  //     return null;
  //   }
  
  //   // this.point = normalized;
  //   this.update({ point: Point.from(nextPoint) })
  
  //   return {
  //     prevPoint: prev,
  //     point: normalized,
  //   };
  // }
  
  
  
  // --- core spatial ops ---
  // setPoint(nextPoint, meta) {
  //   const result = this.syncPoint(nextPoint);
  
  //   if (!result) {
  //     return this;
  //   }
  
  //   this.emit({
  //     type: this.type,
  //     kind: EventTypes.UPDATE,
  //     payload: {
  //       id: this.id,
  //       point: result.point,
  //       prevPoint: result.prevPoint,
  //     },
  //     meta,
  //   });
  
  //   return this;
  // }
  
  // translate(dx, dy, meta) {
  //   this.setPoint(
  //     this.point.translate(dx, dy),
  //     meta
  //   );
  // }
  
  // optional but useful
  // setXY(x, y, meta) {
  //   this.setPoint(new Point(x, y), meta);
  // }
  
  toJSON() {
    return {
      ...super.toJSON(),
      spatial: { ...this.#spatial },
    };
  }
}
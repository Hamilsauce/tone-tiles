import { SpatialModel } from "./Spatial.model";

export class TraversingSpatialModel extends SpatialModel {
  #traversalGen = null;
  #goalPoint = null;
  #idleReason = null;
  #dtSum = 0;
  #stepInterval = 0.1;
  #isStepping = false;

  constructor(options = {}) { }
}
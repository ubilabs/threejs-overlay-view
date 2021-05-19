import type {RaycasterParameters} from 'three';

export type LatLngAltitudeLiteral = {
  lat: number;
  lng: number;
  altitude: number;
};

export interface RaycastOptions {
  recursive?: boolean;
  raycasterParameters?: RaycasterParameters;
  updateMatrix?: boolean;
}

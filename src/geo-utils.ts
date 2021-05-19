import {MathUtils, Vector3} from 'three';
import type {LatLngAltitudeLiteral} from './types';

// shorthands for math-functions, makes equations more readable
const {sin, cos, pow, sqrt, atan2, asin, sign} = Math;
const {degToRad, radToDeg, euclideanModulo} = MathUtils;

const EARTH_RADIUS_METERS = 6371008.8;

/**
 * Returns the true bearing (=compass direction) of the point from the origin.
 * @param point
 */
function getTrueBearing(point: Vector3): number {
  return euclideanModulo(90 - radToDeg(atan2(point.y, point.x)), 360);
}

/**
 * Computes the distance in meters between two coordinates using the
 * haversine formula.
 * @param from
 * @param to
 */
function distance(
  from: google.maps.LatLngLiteral,
  to: google.maps.LatLngLiteral
): number {
  const {lat: latFrom, lng: lngFrom} = from;
  const {lat: latTo, lng: lngTo} = to;

  const dLat = degToRad(latTo - latFrom);
  const dLon = degToRad(lngTo - lngFrom);
  const lat1 = degToRad(latFrom);
  const lat2 = degToRad(latTo);

  const a =
    pow(sin(dLat / 2), 2) + pow(sin(dLon / 2), 2) * cos(lat1) * cos(lat2);

  return 2 * atan2(sqrt(a), sqrt(1 - a)) * EARTH_RADIUS_METERS;
}

/**
 * Computes a destination-point from a geographic origin, distance
 * and true bearing.
 * @param origin
 * @param distance
 * @param bearing
 * @param target optional target to write the result to
 */
function destination(
  origin: google.maps.LatLngLiteral,
  distance: number,
  bearing: number,
  target: google.maps.LatLngLiteral = {lat: 0, lng: 0}
): google.maps.LatLngLiteral {
  const lngOrigin = degToRad(origin.lng);
  const latOrigin = degToRad(origin.lat);

  const bearingRad = degToRad(bearing);
  const radians = distance / EARTH_RADIUS_METERS;

  const latDestination = asin(
    sin(latOrigin) * cos(radians) +
      cos(latOrigin) * sin(radians) * cos(bearingRad)
  );
  const lngDestination =
    lngOrigin +
    atan2(
      sin(bearingRad) * sin(radians) * cos(latOrigin),
      cos(radians) - sin(latOrigin) * sin(latDestination)
    );

  target.lat = radToDeg(latDestination);
  target.lng = radToDeg(lngDestination);

  return target;
}

/**
 * Converts a point given in lat/lng or lat/lng/altitude-format to world-space coordinates.
 * @param point
 * @param reference
 * @param target optional target to write the result to
 */
export function latLngAltToVector3(
  point: LatLngAltitudeLiteral | google.maps.LatLngLiteral,
  reference: LatLngAltitudeLiteral,
  target: Vector3 = new Vector3()
): Vector3 {
  const dx = distance(reference, {lng: point.lng, lat: reference.lat});
  const dy = distance(reference, {lng: reference.lng, lat: point.lat});

  const sx = sign(point.lng - reference.lng);
  const sy = sign(point.lat - reference.lat);

  const {altitude = 0} = <LatLngAltitudeLiteral>point;

  return target.set(sx * dx, sy * dy, altitude);
}

/**
 * Converts a point given in world-space coordinates into geographic format.
 * @param point
 * @param sceneAnchor
 * @param target optional target to write the result to
 */
export function vector3ToLatLngAlt(
  point: Vector3,
  sceneAnchor: LatLngAltitudeLiteral,
  target: LatLngAltitudeLiteral = {lat: 0, lng: 0, altitude: 0}
): LatLngAltitudeLiteral {
  const distance = point.length();
  const bearing = getTrueBearing(point);

  destination(sceneAnchor, distance, bearing, target);
  target.altitude = point.z;

  return target;
}

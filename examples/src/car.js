import ThreeJSOverlayView from '@ubilabs/threejs-overlay-view';
import {CatmullRomCurve3, Vector3} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader';
import {Line2} from 'three/examples/jsm/lines/Line2.js';
import {LineMaterial} from 'three/examples/jsm/lines/LineMaterial.js';
import {LineGeometry} from 'three/examples/jsm/lines/LineGeometry.js';
import {getMapsApiOptions, loadMapsApi} from '../jsm/load-maps-api';

import CAR_MODEL_URL from 'url:../assets/lowpoly-sedan.glb';

const CAR_FRONT = new Vector3(0, 1, 0);

const VIEW_PARAMS = {
  center: {lat: 53.554486, lng: 10.007479},
  zoom: 18,
  heading: 40,
  tilt: 65
};

const ANIMATION_DURATION = 12000;
const ANIMATION_POINTS = [
  {lat: 53.554473, lng: 10.008226},
  {lat: 53.554913, lng: 10.008124},
  {lat: 53.554986, lng: 10.007928},
  {lat: 53.554775, lng: 10.006363},
  {lat: 53.554674, lng: 10.006383},
  {lat: 53.554473, lng: 10.006681},
  {lat: 53.554363, lng: 10.006971},
  {lat: 53.554453, lng: 10.008091},
  {lat: 53.554424, lng: 10.008201},
  {lat: 53.554473, lng: 10.008226}
];

const mapContainer = document.querySelector('#map');
const tmpVec3 = new Vector3();

async function main() {
  const map = await initMap();

  const overlay = new ThreeJSOverlayView(VIEW_PARAMS.center);
  const scene = overlay.getScene();

  overlay.setMap(map);

  // create a Catmull-Rom spline from the points to smooth out the corners
  // for the animation
  const points = ANIMATION_POINTS.map(p => overlay.latLngAltToVector3(p));
  const curve = new CatmullRomCurve3(points, true, 'catmullrom', 0.2);
  curve.updateArcLengths();

  const trackLine = createTrackLine(curve);
  scene.add(trackLine);

  let carModel = null;
  loadCarModel().then(obj => {
    carModel = obj;
    scene.add(carModel);

    // since loading the car-model happened asynchronously, we need to
    // explicitly trigger a redraw.
    overlay.requestRedraw();
  });

  // the update-function will animate the car along the spline
  overlay.update = () => {
    trackLine.material.resolution.copy(overlay.getViewportSize());

    if (!carModel) return;

    const animationProgress =
      (performance.now() % ANIMATION_DURATION) / ANIMATION_DURATION;

    curve.getPointAt(animationProgress, carModel.position);
    curve.getTangentAt(animationProgress, tmpVec3);
    carModel.quaternion.setFromUnitVectors(CAR_FRONT, tmpVec3);

    overlay.requestRedraw();
  };
}

/**
 * Load the Google Maps API and create the fullscreen map.
 */
async function initMap() {
  const {mapId} = getMapsApiOptions();
  await loadMapsApi();

  return new google.maps.Map(mapContainer, {
    mapId,
    disableDefaultUI: true,
    backgroundColor: 'transparent',
    gestureHandling: 'greedy',
    ...VIEW_PARAMS
  });
}

/**
 * Create a mesh-line from the spline to render the track the car is driving.
 */
function createTrackLine(curve) {
  const numPoints = 10 * curve.points.length;
  const curvePoints = curve.getSpacedPoints(numPoints);
  const positions = new Float32Array(numPoints * 3);

  for (let i = 0; i < numPoints; i++) {
    curvePoints[i].toArray(positions, 3 * i);
  }

  const trackLine = new Line2(
    new LineGeometry(),
    new LineMaterial({
      color: 0x0f9d58,
      linewidth: 5
    })
  );

  trackLine.geometry.setPositions(positions);

  return trackLine;
}

/**
 * Load and prepare the car-model for animation.
 */
async function loadCarModel() {
  const loader = new GLTFLoader();

  return new Promise(resolve => {
    loader.load(CAR_MODEL_URL, gltf => {
      const group = gltf.scene;
      const carModel = group.getObjectByName('sedan');

      carModel.scale.setScalar(3);
      carModel.rotation.set(Math.PI / 2, 0, Math.PI, 'ZXY');

      resolve(group);
    });
  });
}

main().catch(err => console.error(err));

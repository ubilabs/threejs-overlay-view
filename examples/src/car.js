import ThreeJSOverlayView from '@ubilabs/threejs-overlay-view';
import {CatmullRomCurve3, Vector3} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader';
import {Line2} from 'three/examples/jsm/lines/Line2.js';
import {LineMaterial} from 'three/examples/jsm/lines/LineMaterial.js';
import {LineGeometry} from 'three/examples/jsm/lines/LineGeometry.js';

import CAR_MODEL_URL from 'url:../assets/car.gltf';
import animationPathPoints from '../assets/animation-path-points.json';
import {getMapsApiOptions, loadMapsApi} from '../jsm/load-maps-api';

const ANIMATION_DURATION = 20000;
const CAR_FRONT = new Vector3(-1, 0, 0);
const initialViewport = {
  center: {
    lat: 53.55448664730988,
    lng: 10.00747908076427
  },
  zoom: 18,
  heading: 40,
  tilt: 65
};

const tmpVec3 = new Vector3();

async function main() {
  const {mapId} = getMapsApiOptions();
  await loadMapsApi();

  const mapContainer = document.querySelector('#map');
  const map = new google.maps.Map(mapContainer, {
    mapId,
    ...initialViewport
  });

  const overlay = new ThreeJSOverlayView(initialViewport.center);
  overlay.setMap(map);

  initScene(overlay, mapContainer);
  overlay.requestRedraw();
}

function initScene(overlay, mapContainer) {
  const animationPath = new CatmullRomCurve3(
    animationPathPoints.map(([lng, lat]) =>
      overlay.latLngAltToVector3({lat, lng})
    ),
    false,
    'centripetal',
    0.2
  );
  animationPath.updateArcLengths();

  const gltfLoader = new GLTFLoader();

  const scene = overlay.getScene();
  /// line geometry
  const curvePoints = animationPath.getSpacedPoints(
    10 * animationPath.points.length
  );
  const positions = new Float32Array(curvePoints.length * 3);
  for (let i = 0; i < curvePoints.length; i++) {
    curvePoints[i].toArray(positions, 3 * i);
  }
  const lineGeometry = new LineGeometry();
  lineGeometry.setPositions(positions);
  const lineMaterial = new LineMaterial({
    color: 0x0f9d58,
    linewidth: 5,
    vertexColors: false,
    dashed: false
  });

  const line = new Line2(lineGeometry, lineMaterial);
  line.computeLineDistances();

  scene.add(line);

  let car;

  gltfLoader.load(CAR_MODEL_URL, gltf => {
    car = gltf.scene.getObjectByName('car');
    car.scale.setScalar(2);
    scene.add(car);

    overlay.update = () => {
      lineMaterial.resolution.set(
        mapContainer.offsetWidth,
        mapContainer.offsetHeight
      );

      if (!car) {
        return;
      }

      const animationProgress =
        (performance.now() % ANIMATION_DURATION) / ANIMATION_DURATION;

      animationPath.getPointAt(animationProgress, car.position);

      car.quaternion.setFromUnitVectors(
        CAR_FRONT,
        animationPath.getTangentAt(animationProgress, tmpVec3)
      );
      car.rotateX(Math.PI / 2);

      overlay.requestRedraw();
    };
  });
}

main().catch(err => console.error(err));

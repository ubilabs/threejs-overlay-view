import {Mesh, MeshStandardMaterial, BoxGeometry} from 'three';
import ThreeJSOverlayView from '@ubilabs/threejs-overlay-view';

import {getMapsApiOptions, loadMapsApi} from '../jsm/load-maps-api';

const VIEW_PARAMS = {
  center: {
    lat: 40.7484892471959,
    lng: -73.9855785714668
  },
  tilt: 67.5,
  heading: 60,
  zoom: 18
};

async function main() {
  const map = await initMap();

  const overlay = new ThreeJSOverlayView({
    ...VIEW_PARAMS.center
  });
  overlay.setMap(map);

  const scene = overlay.getScene();
  const cube = new Mesh(
    new BoxGeometry(8.67, 14.6, 20),
    new MeshStandardMaterial({color: 0xff0000})
  );

  const cubeLocation = {...VIEW_PARAMS.center, altitude: 89.3808279687458};
  overlay.latLngAltToVector3(cubeLocation, cube.position);

  scene.add(cube);
}

async function initMap() {
  const {mapId} = getMapsApiOptions();
  await loadMapsApi();

  return new google.maps.Map(document.querySelector('#map'), {
    mapId,
    disableDefaultUI: true,
    backgroundColor: 'transparent',
    gestureHandling: 'greedy',
    ...VIEW_PARAMS
  });
}

main().catch(err => {
  console.error('uncaught error in main: ', err);
});

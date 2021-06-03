import {Mesh, MeshStandardMaterial, BoxGeometry} from 'three';
import ThreeJSOverlayView from '@ubilabs/threejs-overlay-view';

import {getMapsApiOptions, loadMapsApi} from '../jsm/load-maps-api';

const initialViewport = {
  center: {
    lat: 53.5,
    lng: 10
  },
  tilt: 67.5,
  heading: 60,
  zoom: 19
};

async function main() {
  const {mapId} = getMapsApiOptions();
  await loadMapsApi();

  const map = new google.maps.Map(document.querySelector('#map'), {
    mapId,
    ...initialViewport
  });

  const overlay = new ThreeJSOverlayView({
    ...initialViewport.center
  });
  overlay.setMap(map);

  const scene = overlay.getScene();
  const cube = new Mesh(
    new BoxGeometry(20, 20, 20),
    new MeshStandardMaterial({color: 0xff0000})
  );

  const cubeLocation = {lat: 53.5, lng: 10, altitude: 30};
  overlay.latLngAltToVector3(cubeLocation, cube.position);

  scene.add(cube);
}

main().catch(err => {
  console.error('uncaught error in main: ', err);
});

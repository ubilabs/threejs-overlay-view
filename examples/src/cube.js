import {Mesh, MeshStandardMaterial, BoxGeometry, AxesHelper} from 'three';
import ThreeJSOverlayView from '@ubilabs/threejs-overlay-view';

import {getMapsApiOptions, loadMapsApi} from '../jsm/load-maps-api';

const initialViewport = {
  center: {
    lat: 53.5,
    lng: 10
  },
  zoom: 5
};

async function main() {
  const {mapId} = getMapsApiOptions();
  await loadMapsApi();

  const map = new google.maps.Map(document.querySelector('#map'), {
    mapId,
    zoom: initialViewport.zoom,
    center: initialViewport.center
  });

  const overlay = new ThreeJSOverlayView({
    ...initialViewport.center,
    altitude: 0
  });
  overlay.setMap(map);

  const scene = overlay.getScene();
  const cube = new Mesh(
    new BoxGeometry(10000, 10000, 10000),
    new MeshStandardMaterial({color: 0xff0000})
  );

  const cubeLocation = {lat: 53.5, lng: 10, altitude: 5000};
  overlay.latLngAltToVector3(cubeLocation, cube.position);

  scene.add(new AxesHelper(10000));
  scene.add(cube);
}

main().catch(err => {
  console.error('uncaught error in main: ', err);
});

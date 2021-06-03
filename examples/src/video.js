import {
  Mesh,
  VideoTexture,
  MeshBasicMaterial,
  FrontSide,
  PlaneGeometry
} from 'three';
import ThreeJSOverlayView from '@ubilabs/threejs-overlay-view';
import {getMapsApiOptions, loadMapsApi} from '../jsm/load-maps-api';
import VIDEO_URL from 'url:../assets/big_buck_bunny_720p_1mb.mp4';

const SCREEN_SIZE = [50, 25];
const ALTITUDE_OFFSET = 3;
const SCREEN_POSITION = {
  lat: 53.55450742,
  lng: 10.0074296368,
  altitude: SCREEN_SIZE[1] / 2 + ALTITUDE_OFFSET
};
const SCREEN_ROTATION = [Math.PI / 2, 0, Math.PI / 13];

const VIEW_PARAMS = {
  center: {
    lat: SCREEN_POSITION.lat,
    lng: SCREEN_POSITION.lng
  },
  heading: 324,
  tilt: 65,
  zoom: 19
};

async function main() {
  const map = await initMap();

  const overlay = new ThreeJSOverlayView({
    ...VIEW_PARAMS.center
  });
  overlay.setMap(map);

  const scene = overlay.getScene();
  const video = document.createElement('video');

  video.src = VIDEO_URL;
  video.loop = true;
  video.muted = true;
  video.autoplay = true;
  video.load();
  video.play();

  const videoTexture = new VideoTexture(video);
  const videoMaterial = new MeshBasicMaterial({
    map: videoTexture,
    side: FrontSide
  });

  const screenGeometry = new PlaneGeometry(...SCREEN_SIZE);
  const screen = new Mesh(screenGeometry, videoMaterial);

  overlay.latLngAltToVector3(SCREEN_POSITION, screen.position);
  screen.rotation.order = 'ZYX';
  screen.rotation.set(...SCREEN_ROTATION);

  scene.add(screen);
  overlay.update = () => overlay.requestRedraw();
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

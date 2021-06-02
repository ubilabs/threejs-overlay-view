import {
  Mesh,
  MeshStandardMaterial,
  Vector3,
  LineMaterial,
  Shape,
  ExtrudeGeometry,
  TextureLoader,
  MeshBasicMaterial,
  PlaneGeometry
} from 'three';
import {LineSegmentsGeometry} from 'three/examples/jsm/lines/LineSegmentsGeometry';
import {Line2} from 'three/examples/jsm/lines/Line2.js';
import {LineMaterial} from 'three/examples/jsm/lines/LineMaterial.js';
import UBI_ICON from 'url:../assets/ubi-icon.png';
import ThreeJSOverlayView from '@ubilabs/threejs-overlay-view';

import {getMapsApiOptions, loadMapsApi} from '../jsm/load-maps-api';

const VIEW_PARAMS = {
  center: {
    lat: 53.55493986295417,
    lng: 10.007137126703523
  },
  heading: 324.66666666666674,
  tilt: 65.66666666666667,
  zoom: 19.43375
};

const BUILDING_HEIGHT = 31;
const BUILDING_LINE_COLOR = 0xffffff;
const BUILDING_FILL_COLOR = 0x000000;
const Z_FIGHTING_OFFSET = 0.001;
const LOGO_SIZE = [16, 16];
const LOGO_POSITION = {
  lat: 53.55463986295417,
  lng: 10.007317126703523,
  altitude: BUILDING_HEIGHT + Z_FIGHTING_OFFSET
};
const LOGO_ROTATION_Z = Math.PI / 12;
const COLOR_CHANGE_DURATION = 30; // completes one hue cycle in x seconds

async function main() {
  const map = await initMap();

  const overlay = new ThreeJSOverlayView(VIEW_PARAMS.center);
  overlay.setMap(map);

  initScene(overlay).then(() => overlay.requestRedraw());
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

async function initScene(overlay) {
  const scene = overlay.getScene();

  const wireframePath = [
    [10.00787808793857, 53.554574397774715],
    [10.006971374559072, 53.55444226566294],
    [10.006565280581388, 53.55467172811441],
    [10.006569569754523, 53.55471724470295],
    [10.007768697370686, 53.554874083634],
    [10.007848668422987, 53.554846301309745],
    [10.007913475744536, 53.554604563663226]
  ];
  const points = wireframePath.map(([lng, lat]) =>
    overlay.latLngAltToVector3({lat, lng})
  );

  const line = getWireframe(points);
  scene.add(line);
  scene.add(getBuilding(points));
  scene.add(await getLogo(overlay));

  overlay.update = () => {
    const time = performance.now();

    line.material.resolution.copy(overlay.getViewportSize());
    line.material.color.setHSL(
      ((time * 0.001) / COLOR_CHANGE_DURATION) % 1,
      0.69,
      0.5
    );

    overlay.requestRedraw();
  };
}

function getWireframe(points) {
  const positions = new Float32Array(18 * points.length).fill(0);

  const offset = new Vector3(0, 0, BUILDING_HEIGHT);
  const pointsTop = points.map(p => p.clone().add(offset));

  for (let i = 0, n = points.length; i < n; i++) {
    points[i].toArray(positions, 6 * i);
    points[(i + 1) % n].toArray(positions, 6 * i + 3);
  }

  let topOffset = points.length * 6;
  for (let i = 0, n = pointsTop.length; i < n; i++) {
    pointsTop[i].toArray(positions, topOffset + 6 * i);
    pointsTop[(i + 1) % n].toArray(positions, topOffset + 6 * i + 3);
  }

  let vertEdgeOffset = points.length * 12;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const pTop = pointsTop[i];

    p.toArray(positions, vertEdgeOffset + 6 * i);
    pTop.toArray(positions, vertEdgeOffset + 6 * i + 3);
  }

  const lineGeometry = new LineSegmentsGeometry();
  lineGeometry.instanceCount = 3 * points.length;
  lineGeometry.setPositions(positions);
  const lineMaterial = new LineMaterial({
    color: BUILDING_LINE_COLOR,
    linewidth: 3
  });

  const line = new Line2(lineGeometry, lineMaterial);
  line.computeLineDistances();
  return line;
}

function getBuilding(points) {
  const buildingMaterial = new MeshStandardMaterial({
    transparent: true,
    opacity: 0.5,
    color: BUILDING_FILL_COLOR
  });

  const buildingShape = new Shape();
  points.forEach((p, i) => {
    i === 0 ? buildingShape.moveTo(p.x, p.y) : buildingShape.lineTo(p.x, p.y);
  });

  const extrudeSettings = {
    depth: BUILDING_HEIGHT,
    bevelEnabled: false
  };
  const buildingGeometry = new ExtrudeGeometry(buildingShape, extrudeSettings);
  return new Mesh(buildingGeometry, buildingMaterial);
}

function getLogo(overlay) {
  return new Promise(resolve => {
    const loader = new TextureLoader();
    loader.load(UBI_ICON, texture => {
      const logoGeometry = new PlaneGeometry(...LOGO_SIZE);
      const logoMaterial = new MeshBasicMaterial({
        map: texture,
        transparent: true
      });
      const logo = new Mesh(logoGeometry, logoMaterial);
      overlay.latLngAltToVector3(LOGO_POSITION, logo.position);
      logo.rotateZ(LOGO_ROTATION_Z);
      resolve(logo);
    });
  });
}

main().catch(err => {
  console.error('uncaught error in main: ', err);
});

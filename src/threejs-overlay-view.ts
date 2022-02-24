import {
  DirectionalLight,
  HemisphereLight,
  Intersection,
  Matrix4,
  Object3D,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGL1Renderer
} from 'three';

import {latLngAltToVector3, vector3ToLatLngAlt} from './geo-utils';

import type {LatLngAltitudeLiteral, RaycastOptions} from './types';

const projectionMatrixInverse = new Matrix4();

/**
 * A wrapper for google.maps.WebGLOverlayView handling the details of the
 * integration with three.js.
 */
export default class ThreeJSOverlayView {
  /**
   * The WebGLOverlayView instance being used. Aggregation is used instead
   * of extending the class to allow for this class to be parsed before the
   * google-maps API has been loaded.
   */
  protected readonly overlay: google.maps.WebGLOverlayView;

  /**
   * The three.js camera-instance. When interacting with this camera it is
   * important to know that the world-matrix doesn't contain any useful
   * information. Position and orientation of the camera are instead part
   * of the projectionMatrix.
   */
  protected readonly camera: PerspectiveCamera;

  /**
   * The three.js renderer instance. This is initialized in the
   * onContextRestored-callback.
   */
  protected renderer: WebGL1Renderer | null;

  /**
   * The three.js Scene instance.
   */
  protected scene: Scene;

  /**
   * The geographic reference-point in latitude/longitude/altitude above ground.
   */
  protected referencePoint: LatLngAltitudeLiteral;

  /**
   * The viewport size used by the renderer, this is always kept up-to-date.
   */
  protected viewportSize: Vector2 = new Vector2();

  /**
   * The raycaster used by the `raycast()` method.
   */
  protected raycaster: Raycaster = new Raycaster();

  /**
   * This callback is called when the overlay has been added to the map, but
   * before it is first rendered.
   */
  onAdd: (() => void) | null = null;

  /**
   * This callback is called after the overlay has been removed from the map.
   */
  onRemove: (() => void) | null = null;

  /**
   * This callback is called for every frame being rendered.
   */
  update: (() => void) | null = null;

  /**
   * Creates a new ThreejsOverlayView with the specified origin-point.
   * @param referencePoint
   */
  constructor(
    referencePoint: LatLngAltitudeLiteral | google.maps.LatLngLiteral
  ) {
    this.referencePoint = {altitude: 0, ...referencePoint};
    this.overlay = this.initWebGLOverlayView();
    this.renderer = null;
    this.scene = this.initScene();
    this.camera = new PerspectiveCamera();
  }

  /**
   * Sets the map-instance this overlay should be shown on.
   */
  setMap(map: google.maps.Map) {
    this.overlay.setMap(map);
  }

  /**
   * Sets the geographic coordinates of the reference point where the scene will
   * have it's origin.
   * @param referencePoint
   */
  setReferencePoint(
    referencePoint: LatLngAltitudeLiteral | google.maps.LatLngLiteral
  ) {
    this.referencePoint = {altitude: 0, ...referencePoint};
  }

  /**
   * Returns the scene-instance that is rendered on the map.
   */
  getScene(): Scene {
    return this.scene;
  }

  /**
   * Returns the viewport-size used by the map and the three.js renderer.
   */
  getViewportSize(): Vector2 {
    return this.viewportSize;
  }

  /**
   * Requests a full redraw of the map and all overlays for the next frame.
   *
   * This has to be called whenever changes to the scene were made to make
   * sure they are actually rendered.
   */
  requestRedraw() {
    this.overlay.requestRedraw();
  }

  /**
   * Runs raycasting for the specified screen-coordinate against the scene
   * or the optionally specified list of objects.
   * @param normalizedScreenPoint the screen-coordinates, x/y in range [-1, 1],
   *   y pointing up.
   * @param objects optional list of objects to consider, raycasts against the
   *   complete scene if none are specified
   * @param options.recursive set to true to also check children of the specified
   *   objects for intersections. Only applies when a list of objects is
   *   specified.
   * @param options.updateMatrix set this to false to skip updating the
   *   inverse-projection-matrix (useful if you need to run multiple
   *   raycasts for the same frame).
   * @param options.raycasterParameters parameters to pass on to the raycaster
   * @return returns the list of intersections
   */
  raycast(
    normalizedScreenPoint: Vector2,
    objects: Object3D | Object3D[] | null = null,
    options: RaycastOptions = {updateMatrix: true, recursive: false}
  ): Intersection[] {
    let {updateMatrix, recursive, raycasterParameters} = options;

    // the mvp-matrix used to render the previous frame is still stored in
    // this.camera.projectionMatrix so we don't need to recompute it. That
    // matrix would transform meters in our world-space (relative to
    // this.referencePoint) to clip-space/NDC coordinates. The inverse matrix
    // created here does the exact opposite and convert NDC-coordinates to
    // world-space
    if (updateMatrix) {
      projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
    }

    // create two points  with different depth from the mouse-position and
    // convert to world-space to setup the ray.
    this.raycaster.ray.origin
      .set(normalizedScreenPoint.x, normalizedScreenPoint.y, 0)
      .applyMatrix4(projectionMatrixInverse);

    this.raycaster.ray.direction
      .set(normalizedScreenPoint.x, normalizedScreenPoint.y, 0.5)
      .applyMatrix4(projectionMatrixInverse)
      .sub(this.raycaster.ray.origin)
      .normalize();

    let oldRaycasterParams = this.raycaster.params;
    if (raycasterParameters) {
      this.raycaster.params = raycasterParameters;
    }

    if (objects === null) {
      objects = this.scene;
      recursive = true;
    }

    const results = Array.isArray(objects)
      ? this.raycaster.intersectObjects(objects, recursive)
      : this.raycaster.intersectObject(objects, recursive);

    // reset raycaster params to whatever they were before
    this.raycaster.params = oldRaycasterParams;

    return results;
  }

  /**
   * Converts geographic coordinates into world-space coordinates.
   * Optionally accepts a Vector3 instance as second parameter to write the value to.
   * @param point
   * @param target optional target the result will be written to
   */
  latLngAltToVector3(
    point: LatLngAltitudeLiteral | google.maps.LatLngLiteral,
    target: Vector3 = new Vector3()
  ): Vector3 {
    return latLngAltToVector3(point, this.referencePoint, target);
  }

  /**
   * Converts world-space coordinates to geographic coordinates.
   * Optionally accepts a LatLngAltitudeLiteral instance to write the value to.
   * @param point
   * @param target optional target the result will be written to
   */
  vector3ToLatLngAlt(
    point: Vector3,
    target: LatLngAltitudeLiteral = {lat: 0, lng: 0, altitude: 0}
  ): LatLngAltitudeLiteral {
    return vector3ToLatLngAlt(point, this.referencePoint, target);
  }

  /**
   * Initializes the threejs-renderer when the rendering-context becomes available.
   * @param gl
   */
  protected onContextRestored(stateOptions: google.maps.WebGLStateOptions) {
    const {gl} = stateOptions;
    const mapGlCanvas = gl.canvas as HTMLCanvasElement;

    let renderer = new WebGL1Renderer({
      canvas: mapGlCanvas,
      context: gl,
      ...gl.getContextAttributes()
    });

    renderer.autoClear = false;
    renderer.autoClearDepth = false;

    const {width, height} = <HTMLCanvasElement>gl.canvas;
    this.viewportSize.set(width, height);
    this.renderer = renderer;
  }

  /**
   * Cleans up and destroy the renderer when the context becomes invalid.
   */
  protected onContextLost() {
    if (!this.renderer) {
      return;
    }

    this.viewportSize.set(0, 0);
    this.renderer.dispose();
    this.renderer = null;
  }

  /**
   * Renders a new frame. Is called by the maps-api when the camera parameters
   * changed or a redraw was requested.
   * @param gl
   * @param transformer
   */

  protected onDraw(drawOptions: google.maps.WebGLDrawOptions) {
    const {gl, transformer} = drawOptions;

    if (!this.scene || !this.renderer) {
      return;
    }

    // fix: this appears to be a bug in the maps-API. onDraw will
    //   continue to be called by the api after it has been removed
    //   from the map. We should remove this once fixed upstream.
    if (this.overlay.getMap() === null) {
      return;
    }

    this.camera.projectionMatrix.fromArray(
      transformer.fromLatLngAltitude(this.referencePoint)
    );

    const {width, height} = <HTMLCanvasElement>gl.canvas;
    this.viewportSize.set(width, height);
    this.renderer.setViewport(0, 0, width, height);

    if (this.update) {
      this.update();
    }

    this.renderer.render(this.scene, this.camera);
    this.renderer.resetState();
  }

  /**
   * Initializes the scene with basic lighting that mimics the lighting used for
   * the buildings on the map.
   *
   * At some point it might be possible to retrieve information about the actual lighting
   * used for the buildings (which is dependent on time-of-day) from the api, which
   * is why the light-setup is handled by the ThreejsOverlayView.
   */
  protected initScene(): Scene {
    const scene = new Scene();

    // create two three.js lights to illuminate the model (roughly approximates
    // the lighting of buildings in maps)
    const hemiLight = new HemisphereLight(0xffffff, 0x444444, 1);
    hemiLight.position.set(0, -0.2, 1).normalize();

    const dirLight = new DirectionalLight(0xffffff);
    dirLight.position.set(0, 10, 100);

    scene.add(hemiLight, dirLight);

    return scene;
  }

  /**
   * Creates the google.maps.WebGLOverlayView instance
   */
  protected initWebGLOverlayView(): google.maps.WebGLOverlayView {
    if (!google || !google.maps) {
      throw new Error(
        'Google Maps API not loaded. Please make sure to create the ' +
          'overlay after the API has been loaded.'
      );
    }

    if (!google.maps.WebGLOverlayView) {
      throw new Error(
        'WebGLOverlayView not found. Please make sure to load the ' +
          'beta-channel of the Google Maps API.'
      );
    }

    const overlay = new google.maps.WebGLOverlayView();

    overlay.onAdd = wrapExceptionLogger(() => {
      if (this.onAdd === null) return;
      this.onAdd();
    });

    overlay.onRemove = wrapExceptionLogger(() => {
      if (this.onRemove === null) return;
      this.onRemove();
    });

    overlay.onDraw = wrapExceptionLogger(this.onDraw.bind(this));

    overlay.onContextRestored = wrapExceptionLogger(
      this.onContextRestored.bind(this)
    );

    overlay.onContextLost = wrapExceptionLogger(this.onContextLost.bind(this));

    return overlay;
  }
}

// (hopefully) temporary solution to make sure exceptions wont be silently ignored.
function wrapExceptionLogger<T extends Function>(fn: T): T {
  return ((...args: any[]) => {
    try {
      return fn(...args);
    } catch (err) {
      console.error(err);
      throw err;
    }
  }) as any;
}

# ThreejsOverlayView for Google Maps

A wrapper for `google.maps.WebGLOverlayView` that takes care of the
integration between three.js and the Google Maps JavaScript API. It lets
you create Google Maps overlays directly with three.js.

<div>
  <img style="width: 100%" src="./examples/assets/readme-header.gif" />
</div>

We recommend that you first make yourself familiar with
[the official documentation][docs] for the WebGLOverlayView. The rest of the
documentation will assume that you know how to load the Google Maps API and
how to configure and create the map.

To see what can be done with this new API, have a look at the demos we built:

- [Feature Tour](https://goo.gle/maps-platform-webgl-tour)
- [Travel App Demo](https://goo.gle/maps-platform-webgl-travel-demo)

[docs]: https://developers.google.com/maps/documentation/javascript/webgl

## Installation

You can install this module via npm:

```sh
npm install @ubilabs/threejs-overlay-view
```

## Examples

We provide a set of examples to quickly get you going. Those can be found in
[`./examples`](./examples). They are also hosted on
[GitHub Pages](https://ubilabs.github.io/threejs-overlay-view):

- [Simple Cube](https://ubilabs.github.io/threejs-overlay-view/cube.html)
- [Wireframe Building](https://ubilabs.github.io/threejs-overlay-view/wireframe.html)
- [Animated Car](https://ubilabs.github.io/threejs-overlay-view/car.html)
- [Video Texture](https://ubilabs.github.io/threejs-overlay-view/video.html)

## Usage

Once you have loaded the Google Maps API, you first have to create a new
map. Here's what this typically looks like for a full page map view:

```js
const mapOptions = {
  mapId: YOUR_MAP_ID_HERE,
  disableDefaultUI: true,
  gestureHandling: 'greedy',

  center: {lat: 53.554486, lng: 10.007479},
  zoom: 19,
  heading: 324,
  tilt: 65
};

const map = new google.maps.Map(document.querySelector('#map'), mapOptions);
```

After that (or before - the order doesn't matter), you can create the
`ThreejsOverlayView`. The only parameter you need to specify here is the
reference point, which will become the origin of the coordinate system used
by your three.js scene.

```js
import ThreejsOverlayView from '@ubilabs/threejs-overlay-view';

// ...

const overlay = new ThreejsOverlayView({
  lat: 53.554486,
  lng: 10.007479
});
```

With both of those initialized, you can add your three.js objects to the
scene, and finally add the overlay to the map:

```js
import {BoxGeometry, Mesh, MeshBasicMaterial} from 'three';

// ...

const scene = overlay.getScene();
const box = new Mesh(
  new BoxGeometry(50, 50, 50),
  new MeshBasicMaterial({color: 0xff0000})
);
scene.add(box);

overlay.setMap(map);
```

And that's it. With this, you can already add any 3D object to the map.

Of course, there is a bit more to know about. In the following sections,
we'll talk about the world space coordinates and the relation to
geographic coordinates, about lifecycle hooks and implementing animated
content, and finally about raycasting and implementing interactive elements.

### Coordinate System and Georeferencing

The coordinate system that you see as world coordinates is a right-handed
coordinate system in z-up orientation. The y-axis is pointing true north,
and the x-axis is pointing east. The units are meters. So the point
`new Vector3(0, 50, 10)` would be 10 meters above ground and 50 meters to
the east of your specified reference point.

Now, we don't always want to use only meters in a map view, quite often we
have to deal with multiple points specified in geographic coordinates. For
this, the ThreejsOverlayView provides two utility functions to convert
between latitude/longitude and world space coordinates:

```js
const vector3 = overlay.latLngAltToVector3({lat, lng});
const {lat, lng, altitude} = overlay.vector3ToLatLngAlt(vector3);

// as usual in three.js, both methods also accept a target-object
// as the second parameter to prevent unnecessary object creation and
// garbage-collection overhead, for example:
overlay.latLngAltToVector3({lat, lng}, object3d.position);
overlay.vector3ToLatLngAlt(vec3, latLngAltObject);
```

This only works well if points are within a reasonable distance of each
other. At some point, the numeric precision of 32-bit float values in the
shaders will become a problem, and the precision of the position
computations will no longer work.

If coordinates are thousands of kilometers apart, you could either use
multiple overlay instances or update the reference point (and all objects
in your scene) depending on the current map-viewport using
`overlay.setReferencePoint({lat, lng})`.

### Lifecycle Hooks and Animations

Similar to the `WebGLOverlayView`, the `ThreejsOverlayView` also provides a
set of lifecycle hooks that you can define to react to certain events in
the overlays' lifecycle. There are three of them - all optional: `onAdd`,
`update`, and `onRemove`. They all are called without any parameters and
are not expected to have a return value.

- `onAdd()` can be used to do some final setup of your scene before it
  gets added to the map. Be aware that this happens in the rendering
  lifecycle of the map, so you shouldn't do expensive operations here.
- `update()` will be called immediately before each render of the map.
  Here you can update the state of your scene. This is mostly useful in
  situations where you want to run animations or update the interactive
  state of your scene.
- `onRemove()` is symmetrical to onAdd and will be called after the
  overlay has been removed from the map.

By default, the map uses the energy-efficient approach and only renders a
new frame when the camera parameters changed. If you want to run
animations or interactive content, you can manually trigger a full redraw
of the map including all overlays by calling `overlay.requestRedraw()`
whenever there is anything changed in your scene – or just at the end of
the `update`-callback if you have an animation running that has to update
on every frame:

```js
let animationRunning = true;

overlay.update = () => {
  // ...update your scene...

  if (animationRunning) {
    overlay.requestRedraw();
  }
};
```

### Raycasting and Interactions

If you want to add interactivity to any three.js content, you typically
have to implement raycasting. We took care of that for you, and the
ThreejsOverlayView provides a method `overlay.raycast()` for this. To make
use of this, you first have to keep track of mouse movements on the map:

```js
import {Vector2} from 'three';

// ...

const mapDiv = map.getDiv();
const mousePosition = new Vector2();

map.addListener('mousemove', ev => {
  const {domEvent} = ev;
  const {left, top, width, height} = mapDiv.getBoundingClientRect();

  const x = domEvent.clientX - left;
  const y = domEvent.clientY - top;

  mousePosition.x = 2 * (x / width) - 1;
  mousePosition.y = 1 - 2 * (y / height);

  // since the actual raycasting is happening in the update function,
  // we have to make sure that it will be called for the next frame.
  overlay.requestRedraw();
});
```

With the mouse position being always up to date, you can then use the
`raycast()` function in the update callback. In this example, we change the
color of the object under the cursor:

```js
const DEFAULT_COLOR = 0xffffff;
const HIGHLIGHT_COLOR = 0xff0000;

let highlightedObject = null;

overlay.update = () => {
  const intersections = overlay.raycast(mousePosition);
  if (highlightedObject) {
    highlightedObject.material.color.setHex(DEFAULT_COLOR);
  }

  if (intersections.length === 0) return;

  highlightedObject = intersections[0].object;
  highlightedObject.material.color.setHex(HIGHLIGHT_COLOR);
};
```

## API Reference

Described above is still not the complete picture, and there are some
details left out for readability reasons.

We plan to publish full API documentation at some point. Until then, please
refer to the TypeScript source code or declaration files as well as our
demos that contain a lot of comments.

## Contributing

We are always happy to accept contributions from outside collaborators. For
bugs or problems you encounter as well as questions, ideas and
feature requests, please head over to our [issue tracker][].

When reporting issues, please try to be as concise as possible and provide
a [reproducible example][] so we can quickly address the problem.

[issue tracker]: https://github.com/ubilabs/threejs-overlay-view/issues
[reproducible example]: https://stackoverflow.com/help/minimal-reproducible-example

### Setting up for Development and Running Examples Locally

If you want to contribute code to the project, excellent.

Setting up a local development environment is pretty straightforward and
just needs [Node.js](https://nodejs.org/) to be installed on your system.

Once you have cloned the repository, run

```sh
npm install
```

in the cloned directory to install all dependencies.

To run the examples, you will need to have an API-Key and MapId for
the Google Maps JavaScript API. It's easiest to store those in a file
`.env` in the project directory:

```sh
GOOGLE_MAPS_API_KEY='your API key here'
GOOGLE_MAPS_MAP_ID='your map ID'
```

Once you have that file in place, you can run

```sh
npm start
```

to start the dev server. This will start the parcel server on
http://localhost:1234 where you can access the examples (if port 1234 is
already in use, a different URL will be shown in the console).

### Running Tests

Tests are currently limited to checking for formatting and typescript errors.
They can be run with

```sh
npm run test
```

Please make sure that all tests are passing before opening a pull request.

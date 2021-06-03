# threejs-overlay-view Examples

This is a mostly standalone repository with some usage-examples of the
`ThreejsOverlayView`. Mostly here refers to the fact that it installs the
`@ubilabs/threejs-overlay-view` module from the parent-directory instead of
from npm.

Similar to the `./examples/jsm` directory found in three.js this will also act
as a place for extra functionality that could be useful in some use-cases but
not often enough to warrant being included in the main module.

## [cube.html](https://ubilabs.github.io/threejs-overlay-view/cube.html)

Basically our hello-world example, shows the basic functionality of adding
3d-objects to a map.

## [wireframe.html](https://ubilabs.github.io/threejs-overlay-view/wireframe.html)

Shows how you can highlight your own buildings by rendering just outside the Google Maps buildings.

## [video.html](https://ubilabs.github.io/threejs-overlay-view/video.html)

Import an HTML video into the 3D scene with the three.js VideoTexture class.

## [car.html](https://ubilabs.github.io/threejs-overlay-view/car.html)

This example shows how you can animate a simple gltf-object along a path
specified in lat/lng coordinates.

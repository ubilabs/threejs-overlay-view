import {Loader as MapsApiLoader} from '@googlemaps/js-api-loader';

const LOCAL_STORAGE_API_KEY = 'threejs-overlay-view-api-key';
const LOCAL_STORAGE_MAP_ID = 'threejs-overlay-view-map-id';

// fetch order: env > url params > local storage
export function getMapsApiOptions() {
  const storage = window.localStorage;
  const url = new URL(location.href);

  let apiKey = process.env.GOOGLE_MAPS_API_KEY;
  let mapId = process.env.GOOGLE_MAPS_MAP_ID;

  if (!apiKey || !mapId) {
    apiKey = url.searchParams.get('apiKey');
    mapId = url.searchParams.get('mapId');

    apiKey
      ? storage.setItem(LOCAL_STORAGE_API_KEY, apiKey)
      : (apiKey = storage.getItem(LOCAL_STORAGE_API_KEY));
    mapId
      ? storage.setItem(LOCAL_STORAGE_MAP_ID, mapId)
      : (mapId = storage.getItem(LOCAL_STORAGE_MAP_ID));
  }
  return apiKey && mapId ? {apiKey, mapId} : {};
}

export async function loadMapsApi(libraries = []) {
  const {apiKey, mapId} = getMapsApiOptions();

  // fixme:
  //  - nice to have: The error and UI should also contain information about
  //    requested libraries (e.g. places-api)
  //  - nice to have: replace alert with something ui-friendly

  if (!apiKey || !mapId) {
    alert(`
      Could not find apikey or mapId as URL parameters. 
      Add them like this to the URL: example.com?apiKey=XXXX&mapId=XXXX. 
      If you dont have an API key or map ID, visit the Google Maps documentation to find out on how to obtain them:
      https://developers.google.com/maps/documentation/javascript/webgl
    `);
  }

  const loader = new MapsApiLoader({
    version: 'beta',
    apiKey,
    libraries
  });

  await loader.load();
}

function webglIsSupported() {
  try {
    const canvas = document.createElement('canvas');
    return (
      !!window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch (e) {
    return false;
  }
}
function supportsStaticImport() {
  const script = document.createElement('script');
  return 'noModule' in script;
}

if (!supportsStaticImport()) {
  alert(
    'Your browser does not support modules. Try updating your browser or switch to a different one.'
  );
}

if (!webglIsSupported()) {
  alert(
    'Your browser does not support WebGL. Try updating your browser or switch to a different one.'
  );
}

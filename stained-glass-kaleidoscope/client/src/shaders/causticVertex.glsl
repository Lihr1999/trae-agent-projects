attribute vec2 aPhotonPosition;
attribute float aPhotonIntensity;
attribute float aPhotonWavelength;

varying float vIntensity;
varying float vWavelength;
varying vec2 vUv;

uniform float uPointSize;
uniform vec2 uResolution;

void main() {
  vUv = uv;
  vIntensity = aPhotonIntensity;
  vWavelength = aPhotonWavelength;
  
  vec4 mvPosition = modelViewMatrix * vec4(aPhotonPosition, 0.0, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = uPointSize * (300.0 / -mvPosition.z);
}

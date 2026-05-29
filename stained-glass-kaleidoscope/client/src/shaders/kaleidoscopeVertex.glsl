varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vNormal;

uniform float uTime;
uniform float uAnimationSpeed;

void main() {
  vUv = uv;
  vPosition = position;
  vNormal = normal;
  
  vec3 pos = position;
  float wave = sin(pos.x * 2.0 + uTime * uAnimationSpeed) * 0.01;
  pos += normal * wave;
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}

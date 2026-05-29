varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vNormal;

uniform float uTime;
uniform float uCausticIntensity;
uniform float uInterferenceStrength;
uniform int uMirrorCount;
uniform float uMirrorAngle;
uniform vec3 uGlassColor;
uniform float uRefractiveIndex;
uniform float uDispersionCoefficient;

#define PI 3.14159265359

vec2 kaleidoscope(vec2 uv, int segments, float offset) {
  float angle = atan(uv.y, uv.x);
  float radius = length(uv);
  
  float segmentAngle = 2.0 * PI / float(segments);
  float segment = floor(angle / segmentAngle);
  
  float normalizedAngle = mod(angle, segmentAngle) - segmentAngle * 0.5;
  bool isEven = mod(segment, 2.0) < 1.0;
  
  if (!isEven) {
    normalizedAngle = segmentAngle * 0.5 - mod(angle + segmentAngle * 0.5, segmentAngle);
  }
  
  return vec2(cos(normalizedAngle + offset), sin(normalizedAngle + offset)) * radius;
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float caustic(vec2 uv, float time) {
  float caustic = 0.0;
  
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    vec2 offset = vec2(
      sin(time * 0.5 + fi * 1.5) * 0.3,
      cos(time * 0.3 + fi * 2.0) * 0.3
    );
    
    float dist = length(uv - offset);
    caustic += exp(-dist * 10.0) * (0.5 + 0.5 * sin(time + fi));
  }
  
  return caustic * 0.2;
}

float interference(vec2 uv, float wavelength, float time) {
  float pattern = sin(uv.x * 100.0 / wavelength + time) * 
                  sin(uv.y * 100.0 / wavelength + time);
  return pattern * 0.5 + 0.5;
}

float fresnel(vec3 normal, vec3 viewDir, float ior) {
  float cosTheta = abs(dot(normal, viewDir));
  float r0 = pow((ior - 1.0) / (ior + 1.0), 2.0);
  return r0 + (1.0 - r0) * pow(1.0 - cosTheta, 5.0);
}

void main() {
  vec2 uv = vUv - 0.5;
  uv *= 2.0;
  
  float rotation = uTime * 0.2;
  float cosR = cos(rotation);
  float sinR = sin(rotation);
  uv = vec2(uv.x * cosR - uv.y * sinR, uv.x * sinR + uv.y * cosR);
  
  vec2 kaleidoUV = kaleidoscope(uv, uMirrorCount, uMirrorAngle);
  
  vec3 baseColor = uGlassColor;
  
  float dispersion = uDispersionCoefficient;
  vec3 redColor = baseColor * interference(kaleidoUV, 700.0, uTime * 2.0);
  vec3 greenColor = baseColor * interference(kaleidoUV, 550.0, uTime * 2.0 + dispersion);
  vec3 blueColor = baseColor * interference(kaleidoUV, 450.0, uTime * 2.0 + dispersion * 2.0);
  
  vec3 dispersedColor = vec3(redColor.r, greenColor.g, blueColor.b);
  
  float causticPattern = caustic(kaleidoUV, uTime) * uCausticIntensity;
  vec3 causticColor = hsv2rgb(vec3(mod(uTime * 0.1 + length(kaleidoUV), 0.7, 0.9)));
  
  float interferencePattern = interference(kaleidoUV, 500.0, uTime) * uInterferenceStrength;
  
  vec3 viewDir = normalize(vec3(0.0, 0.0, 1.0));
  float fresnelFactor = fresnel(vNormal, viewDir, uRefractiveIndex);
  
  vec3 finalColor = mix(dispersedColor, causticColor, causticPattern * 0.5);
  finalColor += interferencePattern * 0.2;
  finalColor = mix(finalColor, vec3(1.0), fresnelFactor * 0.3);
  
  float alpha = 0.85 - fresnelFactor * 0.15;
  
  float vignette = 1.0 - length(vUv - 0.5) * 0.8;
  finalColor *= vignette;
  
  gl_FragColor = vec4(finalColor, alpha);
}

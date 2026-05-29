varying float vIntensity;
varying float vWavelength;
varying vec2 vUv;

uniform float uCausticIntensity;

vec3 wavelengthToRGB(float wavelength) {
  float r, g, b;
  
  if (wavelength >= 380.0 && wavelength < 440.0) {
    r = -(wavelength - 440.0) / (440.0 - 380.0);
    g = 0.0;
    b = 1.0;
  } else if (wavelength >= 440.0 && wavelength < 490.0) {
    r = 0.0;
    g = (wavelength - 440.0) / (490.0 - 440.0);
    b = 1.0;
  } else if (wavelength >= 490.0 && wavelength < 510.0) {
    r = 0.0;
    g = 1.0;
    b = -(wavelength - 510.0) / (510.0 - 490.0);
  } else if (wavelength >= 510.0 && wavelength < 580.0) {
    r = (wavelength - 510.0) / (580.0 - 510.0);
    g = 1.0;
    b = 0.0;
  } else if (wavelength >= 580.0 && wavelength < 645.0) {
    r = 1.0;
    g = -(wavelength - 645.0) / (645.0 - 580.0);
    b = 0.0;
  } else if (wavelength >= 645.0 && wavelength <= 780.0) {
    r = 1.0;
    g = 0.0;
    b = 0.0;
  } else {
    r = 0.0;
    g = 0.0;
    b = 0.0;
  }
  
  return vec3(r, g, b);
}

void main() {
  vec2 center = vUv - 0.5;
  float dist = length(center);
  
  if (dist > 0.5) discard;
  
  float alpha = (1.0 - dist * 2.0) * vIntensity * uCausticIntensity;
  vec3 color = wavelengthToRGB(vWavelength);
  
  float glow = exp(-dist * 6.0);
  color *= glow;
  
  gl_FragColor = vec4(color, alpha);
}

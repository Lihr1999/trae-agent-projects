import { calculateCloudDensity, fbm } from './noise.js';

function normalize(v) {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  return [v[0] / len, v[1] / len, v[2] / len];
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function add(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function scale(v, s) {
  return [v[0] * s, v[1] * s, v[2] * s];
}

function getSunDirection(sunHeight, sunAzimuth) {
  const heightRad = (sunHeight * Math.PI) / 180;
  const azimuthRad = (sunAzimuth * Math.PI) / 180;
  return [
    Math.cos(heightRad) * Math.cos(azimuthRad),
    Math.sin(heightRad),
    Math.cos(heightRad) * Math.sin(azimuthRad)
  ];
}

function henyeyGreenstein(cosTheta, g) {
  const g2 = g * g;
  const denom = 1 + g2 - 2 * g * cosTheta;
  return (1 - g2) / (4 * Math.PI * Math.pow(denom, 1.5));
}

export function rayMarch(rayOrigin, rayDir, params, maxSteps = 64) {
  const { cloudHeight, cloudThickness, lightIntensity, scatterCoeff } = params;

  const cloudBottom = cloudHeight - (cloudThickness * 500) / 2;
  const cloudTop = cloudHeight + (cloudThickness * 500) / 2;

  const t1 = (cloudBottom - rayOrigin[1]) / rayDir[1];
  const t2 = (cloudTop - rayOrigin[1]) / rayDir[1];
  const tNear = Math.min(t1, t2);
  const tFar = Math.max(t1, t2);

  if (tFar < 0) {
    return {
      color: [0.1, 0.15, 0.3],
      density: 0,
      depth: 0,
      steps: 0
    };
  }

  const stepSize = (tFar - Math.max(tNear, 0)) / maxSteps;
  let t = Math.max(tNear, 0);

  let accumulatedDensity = 0;
  let accumulatedColor = [0, 0, 0];
  let transmittance = 1.0;
  const sunDir = getSunDirection(params.sunHeight, params.sunAzimuth);

  let steps = 0;

  for (let i = 0; i < maxSteps; i++) {
    if (t >= tFar || transmittance < 0.01) break;

    const pos = add(rayOrigin, scale(rayDir, t));
    const density = calculateCloudDensity(pos, params, performance.now() * 0.001);

    if (density > 0.01) {
      const lightSample = sampleLight(pos, sunDir, params);
      const phase = henyeyGreenstein(dot(rayDir, sunDir), 0.5);
      const scatterColor = [
        lightSample[0] * lightIntensity * phase,
        lightSample[1] * lightIntensity * phase,
        lightSample[2] * lightIntensity * phase
      ];

      const absorption = density * scatterCoeff * stepSize * 0.01;
      const scattering = density * stepSize * 0.01;

      accumulatedColor[0] += scatterColor[0] * transmittance * scattering;
      accumulatedColor[1] += scatterColor[1] * transmittance * scattering;
      accumulatedColor[2] += scatterColor[2] * transmittance * scattering;

      transmittance *= Math.exp(-absorption);
      accumulatedDensity += density * stepSize * 0.001;
    }

    t += stepSize;
    steps++;
  }

  const skyColor = getSkyColor(rayDir, params);
  const finalColor = [
    accumulatedColor[0] + skyColor[0] * transmittance,
    accumulatedColor[1] + skyColor[1] * transmittance,
    accumulatedColor[2] + skyColor[2] * transmittance
  ];

  return {
    color: finalColor,
    density: accumulatedDensity,
    depth: t,
    steps
  };
}

function sampleLight(position, sunDir, params) {
  const lightSteps = 8;
  const stepSize = 50;
  let transmittance = 1.0;

  for (let i = 0; i < lightSteps; i++) {
    const pos = add(position, scale(sunDir, i * stepSize));
    const density = calculateCloudDensity(pos, params, performance.now() * 0.001);
    transmittance *= Math.exp(-density * params.scatterCoeff * stepSize * 0.001);
    if (transmittance < 0.01) break;
  }

  const sunColor = getSunColor(params.sunHeight);
  return [
    sunColor[0] * transmittance,
    sunColor[1] * transmittance,
    sunColor[2] * transmittance
  ];
}

function getSkyColor(rayDir, params) {
  const height = Math.max(0, rayDir[1]);
  const sunHeight = params.sunHeight / 90;

  const skyTop = [0.1, 0.2, 0.5];
  const skyBottom = [0.6, 0.7, 0.9];

  if (sunHeight < 0.2) {
    const t = sunHeight / 0.2;
    skyBottom[0] = 0.9 * (1 - t) + 0.6 * t;
    skyBottom[1] = 0.4 * (1 - t) + 0.7 * t;
    skyBottom[2] = 0.3 * (1 - t) + 0.9 * t;
  }

  return [
    skyBottom[0] * (1 - height) + skyTop[0] * height,
    skyBottom[1] * (1 - height) + skyTop[1] * height,
    skyBottom[2] * (1 - height) + skyTop[2] * height
  ];
}

function getSunColor(sunHeight) {
  const t = sunHeight / 90;
  if (t < 0.2) {
    const sunriseT = t / 0.2;
    return [
      1.0,
      0.5 + 0.5 * sunriseT,
      0.3 + 0.7 * sunriseT
    ];
  }
  return [1.0, 0.98, 0.95];
}

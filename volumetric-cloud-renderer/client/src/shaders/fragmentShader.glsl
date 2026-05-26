precision highp float;

varying vec2 vUv;

uniform vec3 uCameraPos;
uniform vec3 uCameraDir;
uniform float uTime;
uniform vec2 uResolution;
uniform mat4 uInvProjectionMatrix;
uniform mat4 uInvViewMatrix;

uniform float uCloudDensity;
uniform float uCloudThickness;
uniform float uCloudCoverage;
uniform float uCloudHeight;
uniform float uLightIntensity;
uniform float uScatterCoeff;
uniform float uSunHeight;
uniform float uSunAzimuth;
uniform float uWindSpeed;
uniform float uWindDirection;
uniform float uParticleSpeed;
uniform int uSampleCount;
uniform float uRenderScale;
uniform float uTransitionProgress;
uniform bool uNoiseVisualization;
uniform float uFogDensity;

uniform vec3 uPreviousParams[8];
uniform vec3 uTargetParams[8];

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

float fbm(vec3 pos, int octaves) {
    float value = 0.0;
    float amplitude = 1.0;
    float frequency = 1.0;
    float maxValue = 0.0;

    for (int i = 0; i < 10; i++) {
        if (i >= octaves) break;
        value += amplitude * snoise(pos * frequency);
        maxValue += amplitude;
        frequency *= 2.0;
        amplitude *= 0.5;
    }

    return value / maxValue;
}

float remap(float value, float min1, float max1, float min2, float max2) {
    return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
}

vec3 getSunDirection() {
    float heightRad = radians(uSunHeight);
    float azimuthRad = radians(uSunAzimuth);
    return normalize(vec3(
        cos(heightRad) * cos(azimuthRad),
        sin(heightRad),
        cos(heightRad) * sin(azimuthRad)
    ));
}

float henyeyGreenstein(float cosTheta, float g) {
    float g2 = g * g;
    float denom = 1.0 + g2 - 2.0 * g * cosTheta;
    return (1.0 - g2) / (4.0 * 3.14159265 * pow(denom, 1.5));
}

float sampleCloudDensity(vec3 pos, float time) {
    float windRad = radians(uWindDirection);
    vec3 windOffset = vec3(
        cos(windRad) * uWindSpeed * 0.0001 * time,
        0.0,
        sin(windRad) * uWindSpeed * 0.0001 * time
    );

    vec3 samplePos = pos * 0.0008 + windOffset;

    float baseNoise = fbm(samplePos, 6);
    float detailNoise = fbm(samplePos * 3.5, 4);

    float density = baseNoise * 0.65 + detailNoise * 0.35;
    density = remap(density, -1.0, 1.0, 0.0, 1.0);

    float cloudBottom = uCloudHeight - (uCloudThickness * 400.0) * 0.5;
    float cloudTop = uCloudHeight + (uCloudThickness * 400.0) * 0.5;
    float heightFactor = 1.0 - abs(pos.y - uCloudHeight) / ((cloudTop - cloudBottom) * 0.5);
    heightFactor = smoothstep(0.0, 1.0, heightFactor);

    density *= heightFactor;
    density = max(0.0, density - (1.0 - uCloudCoverage));
    density *= uCloudDensity;

    return min(1.0, density);
}

vec3 sampleLight(vec3 pos, vec3 sunDir, float time) {
    const int lightSteps = 6;
    float stepSize = 80.0;
    float transmittance = 1.0;

    for (int i = 0; i < lightSteps; i++) {
        vec3 samplePos = pos + sunDir * float(i) * stepSize;
        float density = sampleCloudDensity(samplePos, time);
        transmittance *= exp(-density * uScatterCoeff * stepSize * 0.001);
        if (transmittance < 0.01) break;
    }

    float sunHeightNorm = uSunHeight / 90.0;
    vec3 sunColor;
    if (sunHeightNorm < 0.2) {
        float t = sunHeightNorm / 0.2;
        sunColor = vec3(
            1.0,
            0.5 + 0.4 * t,
            0.3 + 0.6 * t
        );
    } else {
        sunColor = vec3(1.0, 0.98, 0.95);
    }

    return sunColor * transmittance * uLightIntensity;
}

vec3 getSkyColor(vec3 rayDir) {
    float height = max(0.0, rayDir.y);
    float sunHeightNorm = uSunHeight / 90.0;

    vec3 skyTop = vec3(0.08, 0.15, 0.35);
    vec3 skyBottom = vec3(0.55, 0.65, 0.85);

    if (sunHeightNorm < 0.2) {
        float t = sunHeightNorm / 0.2;
        skyBottom = mix(vec3(0.9, 0.35, 0.25), vec3(0.55, 0.65, 0.85), t);
    }

    vec3 horizonColor = mix(skyBottom, skyTop, height);

    vec3 sunDir = getSunDirection();
    float sunDot = max(0.0, dot(rayDir, sunDir));
    vec3 sunGlow = vec3(1.0, 0.9, 0.7) * pow(sunDot, 50.0) * uLightIntensity * 0.5;
    vec3 sunDisc = vec3(1.0) * smoothstep(0.998, 0.9995, sunDot) * 2.0;

    return horizonColor + sunGlow + sunDisc;
}

vec3 getFogColor(vec3 rayDir, float distance) {
    float fogAmount = 1.0 - exp(-distance * uFogDensity * 0.0001);
    vec3 skyColor = getSkyColor(rayDir);
    return mix(vec3(0.0), skyColor, fogAmount);
}

void main() {
    vec2 uv = (vUv - 0.5) * 2.0;
    uv.x *= uResolution.x / uResolution.y;

    vec4 target = uInvProjectionMatrix * vec4(uv, 1.0, 1.0);
    vec3 rayDir = normalize((uInvViewMatrix * vec4(target.xyz, 0.0)).xyz);
    vec3 rayOrigin = uCameraPos;

    float time = uTime * 0.001;

    float cloudBottom = uCloudHeight - (uCloudThickness * 400.0) * 0.5;
    float cloudTop = uCloudHeight + (uCloudThickness * 400.0) * 0.5;

    float t1 = (cloudBottom - rayOrigin.y) / rayDir.y;
    float t2 = (cloudTop - rayOrigin.y) / rayDir.y;
    float tNear = min(t1, t2);
    float tFar = max(t1, t2);

    if (tFar < 0.0 || rayDir.y <= 0.001) {
        vec3 skyColor = getSkyColor(rayDir);
        gl_FragColor = vec4(skyColor, 1.0);
        return;
    }

    int actualSamples = uSampleCount;
    if (uNoiseVisualization) {
        actualSamples = 8;
    }

    float stepSize = (tFar - max(tNear, 0.0)) / float(actualSamples);
    float t = max(tNear, 0.0);

    vec3 accumulatedColor = vec3(0.0);
    float accumulatedDensity = 0.0;
    float transmittance = 1.0;
    vec3 sunDir = getSunDirection();
    float cosTheta = dot(rayDir, sunDir);
    float phase = henyeyGreenstein(cosTheta, 0.6);

    int steps = 0;
    float maxDensity = 0.0;

    for (int i = 0; i < 256; i++) {
        if (i >= actualSamples || t >= tFar || transmittance < 0.01) break;

        vec3 pos = rayOrigin + rayDir * t;
        float density = sampleCloudDensity(pos, time);
        maxDensity = max(maxDensity, density);

        if (uNoiseVisualization) {
            float noiseVal = fbm(pos * 0.002, 4);
            vec3 noiseColor = vec3(abs(noiseVal));
            accumulatedColor = mix(accumulatedColor, noiseColor, 0.5);
        } else if (density > 0.01) {
            vec3 lightSample = sampleLight(pos, sunDir, time);
            vec3 scatterColor = lightSample * phase;

            float absorption = density * uScatterCoeff * stepSize * 0.008;
            float scattering = density * stepSize * 0.01;

            accumulatedColor += scatterColor * transmittance * scattering;
            transmittance *= exp(-absorption);
            accumulatedDensity += density * stepSize * 0.001;
        }

        t += stepSize;
        steps++;
    }

    vec3 skyColor = getSkyColor(rayDir);
    vec3 fogColor = getFogColor(rayDir, t);

    vec3 finalColor = accumulatedColor + skyColor * transmittance;
    finalColor = mix(finalColor, fogColor, 0.1);

    if (uNoiseVisualization) {
        float banding = float(steps % 4) * 0.1;
        finalColor += vec3(banding);
    }

    if (uNoiseVisualization) {
        gl_FragColor = vec4(accumulatedColor, 1.0);
    } else {
        gl_FragColor = vec4(finalColor, 1.0);
    }
}

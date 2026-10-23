// GLSL sources as plain strings (no eval, no runtime fetch) — compatible with a strict CSP.
// Three.js ShaderMaterial on WebGL2: `attribute`/`varying`/`gl_FragColor` are mapped automatically.

const NOISE = /* glsl */ `
float hash13(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float vnoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash13(i + vec3(0.0, 0.0, 0.0)), hash13(i + vec3(1.0, 0.0, 0.0)), f.x),
        mix(hash13(i + vec3(0.0, 1.0, 0.0)), hash13(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
    mix(mix(hash13(i + vec3(0.0, 0.0, 1.0)), hash13(i + vec3(1.0, 0.0, 1.0)), f.x),
        mix(hash13(i + vec3(0.0, 1.0, 1.0)), hash13(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
    f.z);
}
vec3 flow(vec3 p) {
  return vec3(vnoise(p), vnoise(p + vec3(31.4, 7.1, 2.7)), vnoise(p + vec3(5.2, 47.3, 13.9))) * 2.0 - 1.0;
}
`;

export const particleVertex = /* glsl */ `
uniform float uTime;
uniform float uState;     // 0 kiwi -> 1 tunnel -> 2 agent network -> 3 kiwi again
uniform float uSize;
uniform float uPR;
uniform float uScatter;
uniform float uActive;    // highlighted agent index, -1 = none
uniform float uDim;
uniform mat3 uKiwiRot;
uniform vec3 uEnd;        // centre of the network / final kiwi
uniform vec3 uNodes[8];

attribute vec3 aTunnel;
attribute vec3 aNet;      // local offset around a node, or jitter along a link
attribute vec3 aColA;
attribute vec3 aColC;
attribute vec4 aRand;     // x,y,z random, w size
attribute vec4 aMeta;     // x link flag, y seed flag, z node A, w node B

varying vec3 vColor;
varying float vAlpha;
varying float vSeed;

${NOISE}

float stagger(float x) {
  return smoothstep(0.0, 1.0, clamp((x - aRand.z * 0.42) / 0.58, 0.0, 1.0));
}

void main() {
  // State A: kiwi slice (rotated as a whole), breathing slightly.
  vec3 kiwi = uKiwiRot * position;
  kiwi += flow(position * 1.4 + uTime * 0.12) * 0.03;

  // State B: data tunnel, slowly twisting.
  vec3 tunnel = aTunnel;
  float tw = uTime * 0.04 * (0.4 + aRand.y) + tunnel.z * 0.02;
  tunnel.xy = mat2(cos(tw), -sin(tw), sin(tw), cos(tw)) * tunnel.xy;

  // State C: agent network. Links stream particles from node A to node B.
  int ia = int(aMeta.z + 0.5);
  int ib = int(aMeta.w + 0.5);
  vec3 net;
  if (aMeta.x > 0.5) {
    float t = fract(aRand.x + uTime * (0.035 + 0.07 * aRand.y));
    net = mix(uNodes[ia], uNodes[ib], t) + aNet * (0.4 + 0.6 * sin(3.14159 * t));
  } else {
    net = uNodes[ia] + aNet * (1.0 + 0.08 * sin(uTime * 1.3 + aRand.x * 6.28));
  }

  vec3 endKiwi = uKiwiRot * position + uEnd;

  float s = uState;
  float k;
  vec3 p;
  vec3 col;
  float netW;
  if (s < 1.0) {
    k = stagger(s);
    p = mix(kiwi, tunnel, k);
    col = aColA;
    netW = 0.0;
  } else if (s < 2.0) {
    k = stagger(s - 1.0);
    p = mix(tunnel, net, k);
    col = mix(aColA, aColC, k);
    netW = k;
  } else {
    k = stagger(min(s - 2.0, 1.0));
    p = mix(net, endKiwi, k);
    col = mix(aColC, aColA, k);
    netW = 1.0 - k;
  }
  // Curl-like scatter in the middle of every morph.
  float bump = sin(3.14159 * k);
  p += flow(p * 0.55 + aRand.xyz * 4.0 + uTime * 0.08) * bump * uScatter;

  float act = 0.0;
  if (uActive > -0.5) {
    act = (abs(aMeta.z - uActive) < 0.5 || (aMeta.x > 0.5 && abs(aMeta.w - uActive) < 0.5)) ? 1.0 : 0.0;
  }
  act *= netW;
  col = mix(col, vec3(0.957, 0.447, 0.714), act);

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float seed = aMeta.y * (1.0 - netW);
  float size = aRand.w * uSize * (1.0 + act * 0.7) * (1.0 + seed * 0.9);
  gl_PointSize = clamp(size * uPR * (60.0 / -mv.z), 0.0, 48.0);
  gl_Position = projectionMatrix * mv;

  float fade = smoothstep(46.0, 6.0, -mv.z) * smoothstep(0.15, 1.6, -mv.z);
  vAlpha = fade * (1.0 - uDim) * (0.62 + 0.38 * act);
  vColor = col;
  vSeed = seed;
}
`;

export const particleFragment = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
varying float vSeed;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float a;
  if (vSeed > 0.5) {
    vec2 q = abs(c);
    a = 1.0 - smoothstep(0.34, 0.5, max(q.x, q.y));
  } else {
    float d = length(c);
    a = smoothstep(0.5, 0.0, d);
    a *= a;
  }
  if (a < 0.01) discard;
  gl_FragColor = vec4(vColor * a * vAlpha, a * vAlpha);
}
`;

// The pink core: displaced sphere with fresnel rim. It is the kiwi heart, then the orchestrator.
export const coreVertex = /* glsl */ `
uniform float uTime;
uniform float uPulse;
varying vec3 vN;
varying vec3 vView;
varying float vD;
${NOISE}
void main() {
  vec3 n = normalize(normal);
  float d = vnoise(position * 3.2 + vec3(0.0, uTime * 0.5, uTime * 0.3));
  d += 0.5 * vnoise(position * 7.0 - uTime * 0.4);
  vD = d;
  vec3 p = position + n * (d * 0.09 + uPulse * 0.04);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vN = normalize(normalMatrix * n);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;

export const coreFragment = /* glsl */ `
uniform float uOpacity;
varying vec3 vN;
varying vec3 vView;
varying float vD;
void main() {
  float fres = pow(1.0 - max(dot(vN, vView), 0.0), 2.2);
  vec3 deep = vec3(0.42, 0.06, 0.24);
  vec3 pink = vec3(0.957, 0.447, 0.714);
  vec3 col = mix(deep, pink, 0.35 + 0.45 * vD);
  col += pink * fres * 1.3;
  col += vec3(1.0, 0.85, 0.93) * pow(fres, 6.0) * 0.6;
  gl_FragColor = vec4(col * uOpacity, uOpacity);
}
`;

export const haloVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const haloFragment = /* glsl */ `
uniform float uOpacity;
uniform vec3 uColor;
varying vec2 vUv;
void main() {
  float d = length(vUv - 0.5) * 2.0;
  float g = exp(-d * d * 5.5) * (1.0 - smoothstep(0.75, 1.0, d));
  gl_FragColor = vec4(uColor * g * uOpacity, g * uOpacity);
}
`;

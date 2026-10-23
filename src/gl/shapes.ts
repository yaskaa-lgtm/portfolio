// Procedural geometry: everything is generated in code (no downloaded model).
import { EDGES } from "../data/agents";

export interface Cloud {
  count: number;
  kiwi: Float32Array;
  tunnel: Float32Array;
  net: Float32Array;
  colA: Float32Array;
  colC: Float32Array;
  rand: Float32Array;
  meta: Float32Array;
}

// Deterministic PRNG so every visit renders the same object.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hex = (h: number): [number, number, number] => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
const C = {
  skin: hex(0x0f5132),
  skinHi: hex(0x1f8a55),
  deep: hex(0x0b5d3b),
  mid: hex(0x10b981),
  bright: hex(0x34d399),
  pale: hex(0xa7f3d0),
  ivory: hex(0xf5f5f4),
  pink: hex(0xf472b6),
  link: hex(0x1fa874),
  node: hex(0xc9f7e3),
};
const mix3 = (a: number[], b: number[], t: number): [number, number, number] => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

export const KIWI_R = 1.7;
export const SEEDS = 18;
export const SEED_R = 0.6; // fraction of radius
const SEED_HALF = 0.075; // half side of a square seed (world units)

export function buildCloud(count: number): Cloud {
  const rnd = mulberry32(20261023);
  const kiwi = new Float32Array(count * 3);
  const tunnel = new Float32Array(count * 3);
  const net = new Float32Array(count * 3);
  const colA = new Float32Array(count * 3);
  const colC = new Float32Array(count * 3);
  const rand = new Float32Array(count * 4);
  const meta = new Float32Array(count * 4);

  const R = KIWI_R;
  const seedCenters: [number, number, number][] = [];
  for (let s = 0; s < SEEDS; s++) {
    const a = (s / SEEDS) * Math.PI * 2 + 0.09;
    seedCenters.push([Math.cos(a) * R * SEED_R, Math.sin(a) * R * SEED_R, a]);
  }
  const inSeed = (x: number, y: number) => {
    for (const [sx, sy, a] of seedCenters) {
      const dx = x - sx;
      const dy = y - sy;
      const u = dx * Math.cos(a) + dy * Math.sin(a);
      const v = -dx * Math.sin(a) + dy * Math.cos(a);
      if (Math.abs(u) < SEED_HALF * 1.25 && Math.abs(v) < SEED_HALF * 1.25) return true;
    }
    return false;
  };

  // Network allocation: nodes then links.
  const nodeShare = [0.08, 0.035, 0.035, 0.035, 0.035, 0.035, 0.035, 0.03];
  const nodeCounts = nodeShare.map((f) => Math.floor(f * count));
  const nodeTotal = nodeCounts.reduce((a, b) => a + b, 0);
  const perLink = Math.floor((count - nodeTotal) / EDGES.length);

  for (let i = 0; i < count; i++) {
    const r1 = rnd();
    const i3 = i * 3;
    const i4 = i * 4;
    let x = 0;
    let y = 0;
    let z = 0;
    let col: [number, number, number] = C.mid;
    let seed = 0;
    let size = 0.6 + rnd() * 0.7;

    // ---- State A: kiwi slice in the XY plane ----
    if (r1 < 0.055) {
      // square seeds ("bytes"), outlined
      const sc = seedCenters[Math.floor(rnd() * SEEDS)];
      const t = rnd() * 4;
      const side = Math.floor(t);
      const f = (t - side) * 2 - 1;
      let u = 0;
      let v = 0;
      if (side === 0) [u, v] = [f, -1];
      else if (side === 1) [u, v] = [1, f];
      else if (side === 2) [u, v] = [-f, 1];
      else [u, v] = [-1, -f];
      u *= SEED_HALF;
      v *= SEED_HALF;
      x = sc[0] + u * Math.cos(sc[2]) - v * Math.sin(sc[2]);
      y = sc[1] + u * Math.sin(sc[2]) + v * Math.cos(sc[2]);
      z = 0.05 + (rnd() - 0.5) * 0.02;
      col = C.ivory;
      seed = 1;
      size = 0.55 + rnd() * 0.25;
    } else if (r1 < 0.2) {
      // skin ring
      const a = rnd() * Math.PI * 2;
      const r = R * (0.93 + rnd() * 0.07);
      x = Math.cos(a) * r;
      y = Math.sin(a) * r;
      z = (rnd() - 0.5) * 0.22;
      col = mix3(C.skin, C.skinHi, rnd());
    } else if (r1 < 0.33) {
      // pale inner ring around the core
      const a = rnd() * Math.PI * 2;
      const r = R * (0.17 + Math.pow(rnd(), 0.8) * 0.15);
      x = Math.cos(a) * r;
      y = Math.sin(a) * r;
      z = 0.06 + (rnd() - 0.5) * 0.06;
      col = mix3(C.pale, C.ivory, rnd() * 0.4);
      size *= 0.85;
    } else if (r1 < 0.37) {
      // pink heart particles (the solid core mesh sits on top)
      const a = rnd() * Math.PI * 2;
      const r = R * 0.17 * Math.sqrt(rnd());
      x = Math.cos(a) * r;
      y = Math.sin(a) * r;
      z = 0.08 + (rnd() - 0.5) * 0.1;
      col = C.pink;
    } else {
      // flesh with radial fibres, leaving square holes where the seeds are
      let tries = 0;
      do {
        const a = rnd() * Math.PI * 2;
        const rr = 0.32 + rnd() * 0.61;
        x = Math.cos(a) * rr * R;
        y = Math.sin(a) * rr * R;
        tries++;
      } while (inSeed(x, y) && tries < 8);
      const rr = Math.hypot(x, y) / R;
      const a = Math.atan2(y, x);
      const fibre = 0.5 + 0.5 * Math.sin(a * 46 + Math.sin(a * 7) * 2.0);
      const dome = 0.12 * (1 - rr * rr);
      z = dome + (rnd() - 0.5) * 0.05;
      const base = mix3(C.deep, C.bright, Math.min(1, fibre * 0.7 + (1 - rr) * 0.5));
      col = mix3(base, C.mid, 0.25 * rnd());
    }
    kiwi[i3] = x;
    kiwi[i3 + 1] = y;
    kiwi[i3 + 2] = z;
    colA[i3] = col[0];
    colA[i3 + 1] = col[1];
    colA[i3 + 2] = col[2];

    // ---- State B: tunnel along -Z ----
    {
      const u = rnd();
      const tz = 3 - u * 46;
      const a = rnd() * Math.PI * 2;
      const rad = 2.5 + (rnd() - 0.5) * 0.9 + 0.35 * Math.sin(a * 3 + tz * 0.35);
      tunnel[i3] = Math.cos(a) * rad;
      tunnel[i3 + 1] = Math.sin(a) * rad;
      tunnel[i3 + 2] = tz;
    }

    // ---- State C: network ----
    let isLink = 0;
    let na = 0;
    let nb = 0;
    let off: [number, number, number];
    let cc: [number, number, number];
    if (i < nodeTotal) {
      let acc = 0;
      for (let n = 0; n < nodeCounts.length; n++) {
        acc += nodeCounts[n];
        if (i < acc) {
          na = n;
          break;
        }
      }
      nb = na;
      const radius = na === 0 ? 0.62 : 0.24;
      // points on a fuzzy shell
      const th = rnd() * Math.PI * 2;
      const ph = Math.acos(2 * rnd() - 1);
      const rr = radius * (0.75 + rnd() * 0.35);
      off = [Math.sin(ph) * Math.cos(th) * rr, Math.sin(ph) * Math.sin(th) * rr, Math.cos(ph) * rr];
      cc = na === 0 ? mix3(C.pink, C.ivory, rnd() * 0.25) : na === 7 ? mix3(C.mid, C.node, rnd() * 0.5) : mix3(C.bright, C.node, rnd() * 0.7);
    } else {
      isLink = 1;
      const e = Math.min(EDGES.length - 1, Math.floor((i - nodeTotal) / Math.max(1, perLink)));
      [na, nb] = EDGES[e];
      const j = 0.05;
      off = [(rnd() - 0.5) * j, (rnd() - 0.5) * j, (rnd() - 0.5) * j];
      cc = mix3(C.link, C.bright, rnd() * 0.5);
      size *= 0.8;
    }
    net[i3] = off[0];
    net[i3 + 1] = off[1];
    net[i3 + 2] = off[2];
    colC[i3] = cc[0];
    colC[i3 + 1] = cc[1];
    colC[i3 + 2] = cc[2];

    rand[i4] = rnd();
    rand[i4 + 1] = rnd();
    rand[i4 + 2] = rnd();
    rand[i4 + 3] = size;
    meta[i4] = isLink;
    meta[i4 + 1] = seed;
    meta[i4 + 2] = na;
    meta[i4 + 3] = nb;
  }

  return { count, kiwi, tunnel, net, colA, colC, rand, meta };
}

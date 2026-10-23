// WebGL stage: one particle cloud that morphs kiwi -> tunnel -> agent network -> kiwi, plus the pink core.
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Euler,
  IcosahedronGeometry,
  Matrix3,
  Matrix4,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  Scene,
  ShaderMaterial,
  Vector3,
  WebGLRenderer,
} from "three";
import { buildCloud } from "./shapes";
import { coreFragment, coreVertex, haloFragment, haloVertex, particleFragment, particleVertex } from "./shaders";

export interface Rig {
  state: number;
  cx: number;
  cy: number;
  cz: number;
  lx: number;
  ly: number;
  lz: number;
  kx: number;
  ky: number;
  dim: number;
  scatter: number;
}

export const END_Z = -36;
const NODE_COUNT = 8;

export class Stage {
  readonly renderer: WebGLRenderer;
  readonly camera: PerspectiveCamera;
  private scene = new Scene();
  private points: Points;
  private pMat: ShaderMaterial;
  private core: Mesh;
  private coreMat: ShaderMaterial;
  private halo: Mesh;
  private haloMat: ShaderMaterial;
  private nodes: Vector3[] = Array.from({ length: NODE_COUNT }, () => new Vector3());
  private tmp = new Vector3();
  private kiwiRot = new Matrix3();
  private m4 = new Matrix4();
  private euler = new Euler();
  private time = 0;
  private last = 0;
  private raf = 0;
  private running = false;
  private active = -1;
  private activeSmooth = 0;
  readonly rig: Rig = { state: 0, cx: 0, cy: 0, cz: 8, lx: 0, ly: 0, lz: 0, kx: 0, ky: 0, dim: 0, scatter: 0.9 };
  target: Rig = { ...this.rig };
  mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  onFrame: ((netWeight: number) => void) | null = null;

  constructor(canvas: HTMLCanvasElement, count: number) {
    this.renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
    this.renderer.setClearColor(new Color(0x0f1115), 1);
    this.camera = new PerspectiveCamera(45, 1, 0.1, 120);

    const cloud = buildCloud(count);
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(cloud.kiwi, 3));
    g.setAttribute("aTunnel", new BufferAttribute(cloud.tunnel, 3));
    g.setAttribute("aNet", new BufferAttribute(cloud.net, 3));
    g.setAttribute("aColA", new BufferAttribute(cloud.colA, 3));
    g.setAttribute("aColC", new BufferAttribute(cloud.colC, 3));
    g.setAttribute("aRand", new BufferAttribute(cloud.rand, 4));
    g.setAttribute("aMeta", new BufferAttribute(cloud.meta, 4));
    this.pMat = new ShaderMaterial({
      vertexShader: particleVertex,
      fragmentShader: particleFragment,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uState: { value: 0 },
        uSize: { value: 1 },
        uPR: { value: 1 },
        uScatter: { value: 0.9 },
        uActive: { value: -1 },
        uDim: { value: 0 },
        uKiwiRot: { value: this.kiwiRot },
        uEnd: { value: new Vector3(0, 0, END_Z) },
        uNodes: { value: this.nodes },
      },
    });
    this.points = new Points(g, this.pMat);
    this.points.frustumCulled = false;
    this.scene.add(this.points);

    this.coreMat = new ShaderMaterial({
      vertexShader: coreVertex,
      fragmentShader: coreFragment,
      transparent: true,
      uniforms: { uTime: { value: 0 }, uPulse: { value: 0 }, uOpacity: { value: 1 } },
    });
    this.core = new Mesh(new IcosahedronGeometry(0.29, 10), this.coreMat);
    this.scene.add(this.core);

    this.haloMat = new ShaderMaterial({
      vertexShader: haloVertex,
      fragmentShader: haloFragment,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: { uOpacity: { value: 0.55 }, uColor: { value: new Color(0xf472b6) } },
    });
    this.halo = new Mesh(new PlaneGeometry(2.6, 2.6), this.haloMat);
    this.scene.add(this.halo);

    this.resize();
    this.updateNodes(0);
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const pr = Math.min(window.devicePixelRatio || 1, w < 768 ? 2 : 1.6);
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.pMat.uniforms.uPR.value = pr;
    // keep the apparent particle size roughly constant across viewport heights
    this.pMat.uniforms.uSize.value = Math.max(0.75, Math.min(1.25, h / 900));
  }

  setActive(i: number) {
    this.active = i;
    this.pMat.uniforms.uActive.value = i;
  }

  /** Agent layout around the end point: a ring almost facing the camera, swaying a little in depth. */
  private updateNodes(t: number) {
    const c = this.nodes[0].set(0, 0, END_Z);
    const ring = 6;
    const yaw = Math.sin(t * 0.18) * 0.28;
    const tilt = -1.2;
    for (let i = 1; i <= ring; i++) {
      const a = Math.PI * 0.5 - ((i - 1) / ring) * Math.PI * 2;
      const r = 3.0;
      // ring in XZ, tilted towards the camera, then yawed
      let x = Math.cos(a) * r;
      let y = 0;
      let z = Math.sin(a) * r;
      const y2 = y * Math.cos(tilt) - z * Math.sin(tilt);
      const z2 = y * Math.sin(tilt) + z * Math.cos(tilt);
      y = y2;
      z = z2;
      const x3 = x * Math.cos(yaw) + z * Math.sin(yaw);
      const z3 = -x * Math.sin(yaw) + z * Math.cos(yaw);
      this.nodes[i].set(c.x + x3, c.y + y + Math.sin(t * 0.7 + i) * 0.06, c.z + z3);
    }
    // the scraper sits on an outer orbit, outside the production chain
    const sa = t * 0.12 + 0.6;
    this.nodes[7].set(c.x + 3.25 + Math.cos(sa) * 0.15, c.y - 2.95 + Math.sin(sa) * 0.12, c.z + 0.6);
  }

  /** Screen position (CSS px) of an agent node; z > 1 means behind the camera. */
  project(i: number, out: { x: number; y: number; z: number }) {
    this.tmp.copy(this.nodes[i]).project(this.camera);
    out.x = (this.tmp.x * 0.5 + 0.5) * window.innerWidth;
    out.y = (-this.tmp.y * 0.5 + 0.5) * window.innerHeight;
    out.z = this.tmp.z;
    return out;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      this.frame(now);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  frame(now: number) {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.time += dt;
    const t = this.time;

    // Damp current rig towards target (scroll already smoothed by Lenis).
    const k = 1 - Math.exp(-dt * 5);
    const r = this.rig;
    const tg = this.target;
    (Object.keys(r) as (keyof Rig)[]).forEach((key) => {
      r[key] += (tg[key] - r[key]) * k;
    });
    const m = this.mouse;
    m.sx += (m.x - m.sx) * (1 - Math.exp(-dt * 3));
    m.sy += (m.y - m.sy) * (1 - Math.exp(-dt * 3));

    this.updateNodes(t);

    // Kiwi orientation: scroll pose + slow spin + pointer tilt.
    this.euler.set(r.kx + m.sy * 0.18, r.ky + m.sx * 0.3, t * 0.06, "XYZ");
    this.m4.makeRotationFromEuler(this.euler);
    this.kiwiRot.setFromMatrix4(this.m4);

    const s = r.state;
    const u = this.pMat.uniforms;
    u.uTime.value = t;
    u.uState.value = s;
    u.uScatter.value = r.scatter;
    u.uDim.value = Math.min(0.9, Math.max(0, r.dim));

    // Camera with a light pointer parallax.
    this.camera.position.set(r.cx + m.sx * 0.25, r.cy - m.sy * 0.18, r.cz);
    this.camera.lookAt(r.lx, r.ly, r.lz);

    // Core: kiwi heart at the origin, gone in the tunnel, orchestrator at the end.
    let scale: number;
    if (s <= 1) {
      this.core.position.set(0, 0, 0);
      scale = 1 - smooth(0.05, 0.45, s);
    } else if (s <= 2) {
      this.core.position.set(0, 0, END_Z);
      scale = smooth(1.55, 2.0, s) * 1.55;
    } else {
      this.core.position.set(0, 0, END_Z);
      scale = 1.55 - 0.55 * Math.min(1, s - 2);
    }
    const coreActive = this.active === 0 && s > 1.5 && s < 2.5 ? 1 : 0;
    this.activeSmooth += (coreActive - this.activeSmooth) * k;
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.2);
    this.core.scale.setScalar(Math.max(0.0001, scale * (1 + this.activeSmooth * 0.12 * pulse)));
    this.core.visible = scale > 0.01;
    this.coreMat.uniforms.uTime.value = t;
    this.coreMat.uniforms.uPulse.value = pulse;
    this.coreMat.uniforms.uOpacity.value = 1 - Math.min(0.85, r.dim);
    this.halo.position.copy(this.core.position);
    this.halo.quaternion.copy(this.camera.quaternion);
    this.halo.scale.setScalar(Math.max(0.0001, scale * (1 + 0.06 * pulse)));
    this.halo.visible = this.core.visible;
    this.haloMat.uniforms.uOpacity.value = (0.5 + 0.25 * this.activeSmooth) * (1 - Math.min(0.85, r.dim));

    this.renderer.render(this.scene, this.camera);

    const netW = s < 1 ? 0 : s < 2 ? smooth(1.55, 1.95, s) : 1 - smooth(2.0, 2.35, s);
    this.onFrame?.(netW);
  }

  dispose() {
    this.stop();
    this.points.geometry.dispose();
    this.pMat.dispose();
    this.core.geometry.dispose();
    this.coreMat.dispose();
    this.halo.geometry.dispose();
    this.haloMat.dispose();
    this.renderer.dispose();
  }
}

function smooth(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

import "lenis/dist/lenis.css";
import "./styles.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { AGENTS, WALK } from "./data/agents";
import type { Rig, Stage } from "./gl/scene";

gsap.registerPlugin(ScrollTrigger);

const root = document.documentElement;
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
root.classList.add(reduced ? "reduced" : "anim");

const $ = <T extends Element = HTMLElement>(sel: string, ctx: ParentNode = document) => ctx.querySelector(sel) as T;
const $$ = <T extends Element = HTMLElement>(sel: string, ctx: ParentNode = document) => Array.from(ctx.querySelectorAll(sel)) as T[];

/* ---------------- Smooth scroll ---------------- */
let lenis: Lenis | null = null;
if (!reduced) {
  lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, anchors: false });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis?.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

// In-page links: smooth scroll + move focus to the target section (keyboard users).
$$<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const id = a.getAttribute("href")!.slice(1);
    const target = id ? document.getElementById(id) : null;
    if (!target) return;
    e.preventDefault();
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    if (lenis) lenis.scrollTo(target, { duration: 1.6 });
    else target.scrollIntoView({ behavior: "auto" });
    target.focus({ preventScroll: true });
    history.replaceState(null, "", `#${id}`);
  });
});

/* ---------------- Film grain (generated, no file) ---------------- */
(() => {
  const g = $(".grain");
  const c = document.createElement("canvas");
  c.width = c.height = 180;
  const ctx = c.getContext("2d");
  if (!ctx || !g) return;
  const img = ctx.createImageData(180, 180);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  g.style.backgroundImage = `url(${c.toDataURL("image/png")})`;
})();

/* ---------------- Custom cursor (fine pointers only) ---------------- */
if (!reduced && window.matchMedia("(pointer: fine)").matches) {
  root.classList.add("has-cursor");
  const ring = $(".cursor__ring");
  const dot = $(".cursor__dot");
  const rx = gsap.quickTo(ring, "x", { duration: 0.45, ease: "expo.out" });
  const ry = gsap.quickTo(ring, "y", { duration: 0.45, ease: "expo.out" });
  const dx = gsap.quickTo(dot, "x", { duration: 0.08 });
  const dy = gsap.quickTo(dot, "y", { duration: 0.08 });
  window.addEventListener("pointermove", (e) => {
    rx(e.clientX);
    ry(e.clientY);
    dx(e.clientX);
    dy(e.clientY);
  });
  document.addEventListener("pointerover", (e) => {
    const hit = (e.target as Element).closest("a, button, video");
    root.classList.toggle("cursor-hover", !!hit);
  });
}

/* ---------------- Split headings into masked words ---------------- */
function splitWords(el: Element) {
  const walk = (node: Node) => {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const parts = (child.textContent ?? "").split(/( +)/);
        const frag = document.createDocumentFragment();
        parts.forEach((p) => {
          if (!p) return;
          if (/^ +$/.test(p)) {
            frag.appendChild(document.createTextNode(" "));
            return;
          }
          const w = document.createElement("span");
          w.className = "w";
          const inner = document.createElement("span");
          inner.className = "w__in";
          inner.textContent = p;
          w.appendChild(inner);
          frag.appendChild(w);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        walk(child);
      }
    });
  };
  walk(el);
}

if (!reduced) {
  $$(".split").forEach((el) => {
    splitWords(el);
    gsap.from($$(".w__in", el), {
      yPercent: 115,
      duration: 1.1,
      ease: "expo.out",
      stagger: 0.035,
      scrollTrigger: { trigger: el, start: "top 85%", once: true },
    });
  });
  $$(".reveal").forEach((el) => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: "expo.out",
      scrollTrigger: { trigger: el, start: "top 92%", once: true },
    });
  });
  // Hero entrance
  document.fonts.ready.then(() => {
    gsap.from(".hero__title .line__in", { yPercent: 115, duration: 1.4, ease: "expo.out", stagger: 0.09, delay: 0.15 });
    gsap.from(".kicker span", { opacity: 0, y: 12, duration: 0.8, stagger: 0.06, ease: "expo.out" });
  });
}

/* ---------------- Section counter + active nav ---------------- */
const counterNow = $(".counter__now");
$$<HTMLElement>("main > section").forEach((sec) => {
  ScrollTrigger.create({
    trigger: sec,
    start: "top 55%",
    end: "bottom 55%",
    onToggle: (self) => {
      if (!self.isActive) return;
      counterNow.textContent = sec.dataset.index ?? "01";
      $$(".nav a").forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === `#${sec.id}`));
    },
  });
});

/* ---------------- Projects: full-screen chapters ---------------- */
const projects = $("#projets");
const panels = $$(".panel", projects);
const mm = gsap.matchMedia();
mm.add(
  {
    stack: "(min-width: 900px) and (min-height: 560px) and (prefers-reduced-motion: no-preference)",
    flow: "(max-width: 899px), (max-height: 559px)",
  },
  (ctx) => {
    const { stack, flow } = ctx.conditions as { stack: boolean; flow: boolean };
    if (stack) {
      projects.classList.add("is-stack");
      projects.style.setProperty("--panels", String(panels.length));
      gsap.set(panels.slice(1), { clipPath: "inset(100% 0% 0% 0%)" });
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: ".projects__track", start: "top top", end: "bottom bottom", scrub: 0.6 },
      });
      tl.to({}, { duration: 0.35 });
      panels.forEach((p, i) => {
        if (i === 0) return;
        const prev = panels[i - 1];
        const at = tl.duration();
        tl.to(p, { clipPath: "inset(0% 0% 0% 0%)", duration: 1, ease: "power2.inOut" }, at);
        tl.to($(".panel__grid", prev), { yPercent: -8, scale: 0.95, opacity: 0, duration: 0.55, ease: "power2.in" }, at);
        tl.from($(".panel__grid", p), { yPercent: 14, duration: 1, ease: "power3.out" }, at);
        tl.to({}, { duration: 0.55 });
      });
      return () => projects.classList.remove("is-stack");
    }
    if (flow && !reduced) {
      panels.forEach((p) => {
        gsap.from($(".panel__grid", p), {
          y: 50,
          opacity: 0,
          duration: 1,
          ease: "expo.out",
          scrollTrigger: { trigger: p, start: "top 80%", once: true },
        });
      });
    }
    return undefined;
  },
);

/* ---------------- Voice waveform (deterministic speech-like envelope) ---------------- */
(() => {
  const wave = $(".wave");
  if (!wave) return;
  const bars: HTMLElement[] = [];
  const N = window.innerWidth < 600 ? 48 : 84;
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const heights: number[] = [];
  for (let i = 0; i < N; i++) {
    const gap = i % 17 === 16 || i % 29 === 28; // pauses between sentences
    const b = document.createElement("i");
    if (gap) b.className = "is-gap";
    const env = Math.sin((i / N) * Math.PI * 6) * 0.25 + 0.55;
    heights.push(gap ? 0.06 : Math.max(0.12, Math.min(1, env + (rnd() - 0.5) * 0.7)));
    wave.appendChild(b);
    bars.push(b);
  }
  bars.forEach((b, i) => gsap.set(b, { scaleY: heights[i] }));
  if (reduced) return;
  const anim = gsap.to(bars, {
    scaleY: (i: number) => (bars[i].classList.contains("is-gap") ? 0.06 : 0.12 + rnd() * 0.88),
    duration: 0.5,
    ease: "sine.inOut",
    stagger: { each: 0.02, repeat: -1, yoyo: true },
    paused: true,
  });
  ScrollTrigger.create({ trigger: wave, start: "top bottom", end: "bottom top", onToggle: (s) => (s.isActive ? anim.play() : anim.pause()) });
})();

/* ---------------- Lazy videos ---------------- */
const videos = $$<HTMLVideoElement>("video.clip");
if (reduced) videos.forEach((v) => (v.controls = true));
const vio = new IntersectionObserver(
  (entries) => {
    entries.forEach((en) => {
      const v = en.target as HTMLVideoElement;
      if (en.isIntersecting) {
        if (!v.src && v.dataset.src) v.src = v.dataset.src;
        if (!reduced) v.play().catch(() => undefined);
      } else if (!v.paused) {
        v.pause();
      }
    });
  },
  { rootMargin: "200px 0px" },
);
videos.forEach((v) => vio.observe(v));

/* ---------------- Agents UI ---------------- */
const agentsSec = $("#agents");
const list = $(".nodes", agentsSec);
const detail = {
  phase: $(".detail__phase", agentsSec),
  name: $(".detail__name", agentsSec),
  role: $(".detail__role", agentsSec),
  model: $(".detail__model", agentsSec),
  out: $(".detail__out", agentsSec),
};
const items: HTMLLIElement[] = [];
const buttons: HTMLButtonElement[] = [];
let stage: Stage | null = null;
let current = -1;

AGENTS.forEach((a, i) => {
  const li = document.createElement("li");
  const b = document.createElement("button");
  b.type = "button";
  b.className = i === 0 ? "node node--core" : "node";
  b.setAttribute("aria-pressed", "false");
  const name = document.createElement("span");
  name.textContent = a.name;
  const phase = document.createElement("span");
  phase.className = "node__phase";
  phase.textContent = a.phase;
  b.append(name, phase);
  b.addEventListener("click", () => select(i));
  b.addEventListener("focus", () => select(i));
  li.appendChild(b);
  list.appendChild(li);
  items.push(li);
  buttons.push(b);
});

function select(i: number) {
  if (i === current) return;
  current = i;
  const a = AGENTS[i];
  buttons.forEach((b, j) => b.setAttribute("aria-pressed", String(j === i)));
  detail.phase.textContent = a.phase;
  detail.name.textContent = a.name;
  detail.role.textContent = a.role;
  detail.model.textContent = a.model;
  detail.out.textContent = a.out;
  stage?.setActive(i);
  if (!reduced) gsap.fromTo([detail.name, detail.role], { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5, ease: "expo.out", stagger: 0.05 });
}
select(WALK[0]);

/* ---------------- WebGL ---------------- */
function webglOK() {
  try {
    const c = document.createElement("canvas");
    return !!c.getContext("webgl2");
  } catch {
    return false;
  }
}

interface KF {
  y: number;
  r: Rig;
}

function docTop(el: Element) {
  return el.getBoundingClientRect().top + window.scrollY;
}

function buildKeyframes(): KF[] {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const wide = vw >= 900;
  const asp = vw / vh;
  const tanH = Math.tan((45 / 2) * (Math.PI / 180));
  const kiwiD = Math.max(7, 2.25 / (tanH * Math.min(asp, 1.5)));
  const netD = Math.max(13, 4.3 / (tanH * Math.min(asp, 1.75)));
  const E = -36;
  const side = wide ? -2.0 : 0;
  const netSide = wide ? -2.5 : 0;
  const heroY = wide ? 0 : -1.15;

  const about = docTop($("#apropos"));
  const proj = docTop($("#projets"));
  const track = $(".projects__track");
  const trackTop = docTop(track);
  const trackEnd = trackTop + track.offsetHeight - vh;
  const ag = docTop(agentsSec);
  const agEnd = ag + agentsSec.offsetHeight - vh;
  const tools = docTop($("#outils"));
  const end = Math.max(tools + 10, document.documentElement.scrollHeight - vh);

  const R = (o: Partial<Rig>): Rig => ({ state: 0, cx: 0, cy: 0, cz: kiwiD, lx: 0, ly: 0, lz: 0, kx: 0, ky: 0, dim: 0, scatter: 0.9, ...o });

  // Narrow screens: fit the kiwi (visual radius ~2 units) in the free band between the header and the first text
  // line, instead of behind the text. Returns camera distance + vertical offset (camera below = object higher).
  const HDR = 76;
  const VIS_R = 1.75;
  const fitBand = (bandBottom: number) => {
    const band = bandBottom - HDR;
    const rpx = Math.min(band / 2 - 8, vw * 0.36);
    if (rpx < 60) return null; // no room: keep the default framing, dimmed
    const d = (VIS_R * (vh / 2)) / (rpx * tanH);
    const yc = HDR + band / 2;
    return { d, off: ((vh / 2 - yc) * d * tanH) / (vh / 2) };
  };
  const vpTop = (sel: string, scroll: number) => docTop($(sel)) - scroll;
  const heroFit = wide ? null : fitBand(vpTop(".hero .kicker", 0));
  const endFit = wide ? null : fitBand(vpTop(".contact .label", end));
  const hero = heroFit
    ? R({ cz: heroFit.d, cy: -heroFit.off, ly: -heroFit.off, kx: -0.12, ky: 0.18, dim: 0 })
    : R({ cx: side, cy: heroY, lx: side, ly: heroY, kx: -0.12, ky: 0.18, dim: wide ? 0 : 0.5 });
  const fin = wide
    ? R({ state: 3, cx: -2.6, cy: -0.9, cz: E + kiwiD * 1.3, lx: -2.6, ly: -0.9, lz: E, kx: -0.1, ky: -0.2, dim: 0 })
    : endFit
      ? R({ state: 3, cy: -endFit.off, cz: E + endFit.d, ly: -endFit.off, lz: E, kx: -0.1, ky: -0.2, dim: 0 })
      : R({ state: 3, cy: -1.7, cz: E + kiwiD * 1.3, ly: -1.7, lz: E, kx: -0.1, ky: -0.2, dim: 0.6 });
  return [
    { y: 0, r: hero },
    { y: about - vh * 0.1, r: R({ cx: wide ? -2.3 : 0, cy: 0.2, cz: kiwiD * 0.95, lx: wide ? -2.3 : 0, kx: 0.95, ky: -0.55, dim: wide ? 0.05 : 0.72 }) },
    { y: proj, r: R({ cx: wide ? -2.3 : 0, cz: kiwiD * 0.95, lx: wide ? -2.3 : 0, kx: 0.35, ky: 0.15, dim: wide ? 0.15 : 0.72 }) },
    { y: trackTop, r: R({ state: 1, cz: 2, lz: -12, dim: 0.25, scatter: 1.4 }) },
    { y: (trackTop + trackEnd) / 2, r: R({ state: 1, cx: 0.5, cy: 0.3, cz: -12, lx: -0.4, lz: -26, dim: 0.25 }) },
    { y: trackEnd, r: R({ state: 1, cz: -22, lz: -34, dim: 0.2, scatter: 1.2 }) },
    { y: ag - vh * 0.05, r: R({ state: 2, cx: netSide, cy: 0.6, cz: E + netD, lx: netSide, lz: E, dim: 0, scatter: 1.2 }) },
    { y: agEnd, r: R({ state: 2, cx: netSide - 0.4, cy: 1.4, cz: E + netD, lx: netSide, lz: E, dim: 0 }) },
    { y: tools, r: R({ state: 2, cx: 0, cy: 5, cz: E + netD + 5, lx: 0, ly: -1, lz: E, dim: 0.62 }) },
    { y: end, r: fin },
  ];
}

function sample(kfs: KF[], y: number, out: Rig) {
  let i = 0;
  while (i < kfs.length - 2 && y > kfs[i + 1].y) i++;
  const a = kfs[i];
  const b = kfs[i + 1];
  let t = b.y > a.y ? (y - a.y) / (b.y - a.y) : 1;
  t = Math.min(1, Math.max(0, t));
  t = t * t * (3 - 2 * t);
  (Object.keys(out) as (keyof Rig)[]).forEach((k) => {
    out[k] = a.r[k] + (b.r[k] - a.r[k]) * t;
  });
  return out;
}

async function initGL() {
  if (reduced || !webglOK()) {
    if (!reduced) root.classList.add("no-webgl");
    return;
  }
  const canvas = $<HTMLCanvasElement>("canvas.gl");
  const { Stage } = await import("./gl/scene");
  const small = window.innerWidth < 768;
  const weak = (navigator.hardwareConcurrency || 8) <= 4;
  const count = small || weak ? 12000 : 26000;
  let st: Stage;
  try {
    st = new Stage(canvas, count);
  } catch {
    root.classList.add("no-webgl");
    return;
  }
  stage = st;
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    st.stop();
    root.classList.add("no-webgl");
  });

  // Agents: sticky 3D stage with projected labels.
  agentsSec.classList.add("is-live");
  items.forEach((li) => (li.style.visibility = "hidden"));
  st.setActive(current);

  let kfs = buildKeyframes();
  const stageEl = $(".agents__stage", agentsSec);
  const prog = $(".agents__progress span", agentsSec);
  const pos = { x: 0, y: 0, z: 0 };
  let labelsOn = false;

  const apply = () => {
    sample(kfs, window.scrollY, st.target);
  };
  ScrollTrigger.addEventListener("refresh", () => {
    kfs = buildKeyframes();
    apply();
  });
  window.addEventListener("scroll", apply, { passive: true });
  lenis?.on("scroll", apply);
  apply();
  Object.assign(st.rig, st.target);

  ScrollTrigger.create({
    trigger: agentsSec,
    start: "top top",
    end: "bottom bottom",
    onUpdate: (self) => {
      const step = Math.min(WALK.length - 1, Math.floor(self.progress * WALK.length * 0.999));
      if (self.progress > 0 && self.progress < 1) select(WALK[step]);
      gsap.set(prog, { scaleX: self.progress });
    },
  });

  // Label sizes (measured lazily) so labels can be clamped inside the viewport, below the header.
  let sizes: { w: number; h: number }[] = [];
  const detailEl = $(".detail", agentsSec);
  // Text blocks the labels must not cover (heading, hint, detail card), stored relative to the sticky stage.
  type Box = { l: number; t: number; r: number; b: number };
  let avoid: Box[] = [];
  const measure = () => {
    sizes = buttons.map((b) => ({ w: b.offsetWidth, h: b.offsetHeight }));
    const st0 = stageEl.getBoundingClientRect();
    avoid = $$(".agents__head .label, .agents__head .h2, .agents__hint, .detail", agentsSec)
      .map((el) => {
        // Text blocks: use the real extent of the glyphs (a big heading can overflow its max-width box).
        if (el.classList.contains("detail")) return el.getBoundingClientRect();
        const rg = document.createRange();
        rg.selectNodeContents(el);
        return rg.getBoundingClientRect();
      })
      .filter((r) => r.width > 0 && r.height > 0)
      .map((r) => ({ l: r.left - st0.left, t: r.top - st0.top, r: r.right - st0.left, b: r.bottom - st0.top }));
  };
  ScrollTrigger.addEventListener("refresh", measure);

  st.onFrame = (netW) => {
    const on = netW > 0.02;
    if (!on && !labelsOn) return;
    labelsOn = on;
    if (!sizes.length || !sizes[0].w) measure();
    const top = stageEl.getBoundingClientRect().top;
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const m = vw < 768 ? 8 : 16;
    const minY = 76 + 6;
    const narrow = vw < 900;
    const maxY = narrow ? detailEl.getBoundingClientRect().top - 6 : vh - m;
    // Obstacles in viewport coordinates: static text blocks, then each label already placed this frame.
    const boxes = avoid.map((a) => ({ l: a.l, r: a.r, t: a.t + top, b: a.b + top }));
    const gap = 8;
    items.forEach((li, i) => {
      st.project(i, pos);
      const { w, h } = sizes[i] || { w: 0, h: 0 };
      let lx = pos.x - w / 2;
      let ly = i === 0 ? pos.y + 30 : pos.y - h - 16;
      lx = Math.min(Math.max(lx, m), vw - w - m);
      ly = Math.min(Math.max(ly, minY), maxY - h);
      const hits = (x: number, y: number) => boxes.filter((a) => x < a.r && x + w > a.l && y < a.b && y + h > a.t);
      const fits = (x: number, y: number) => x >= m && x + w <= vw - m && y >= minY && y + h <= maxY;
      // Push the label out of what it covers, along the shortest free direction (a few passes).
      for (let pass = 0; pass < 4; pass++) {
        const hit = hits(lx, ly);
        if (!hit.length) break;
        const a = hit[0];
        const cands = [
          { x: a.r + gap, y: ly },
          { x: a.l - gap - w, y: ly },
          { x: lx, y: a.b + gap },
          { x: lx, y: a.t - gap - h },
        ]
          .filter((c) => fits(c.x, c.y))
          .map((c) => ({ ...c, cost: Math.abs(c.x - lx) + Math.abs(c.y - ly) + hits(c.x, c.y).length * 1000 }))
          .sort((p, q) => p.cost - q.cost);
        if (!cands.length) break;
        lx = cands[0].x;
        ly = cands[0].y;
      }
      const shown = netW > 0.3 && pos.z < 1;
      if (shown) boxes.push({ l: lx - 4, r: lx + w + 4, t: ly - 4, b: ly + h + 4 });
      li.style.transform = `translate3d(${lx.toFixed(1)}px, ${(ly - top).toFixed(1)}px, 0)`;
      li.style.opacity = String(Math.max(0, (netW - 0.3) / 0.7));
      li.style.visibility = shown ? "visible" : "hidden";
    });
  };

  window.addEventListener("pointermove", (e) => {
    st.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    st.mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
  });
  let rt = 0;
  window.addEventListener("resize", () => {
    clearTimeout(rt);
    rt = window.setTimeout(() => {
      st.resize();
      ScrollTrigger.refresh();
    }, 120);
  });
  document.addEventListener("visibilitychange", () => (document.hidden ? st.stop() : st.start()));
  st.start();
  ScrollTrigger.refresh();
}

initGL();

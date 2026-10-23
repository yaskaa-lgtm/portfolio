// Visual + console check: serves dist/ with `vite preview` (in-process), drives chrome-headless-shell over CDP,
// screenshots every section at 4 viewports, collects console errors / CSP violations, checks that every visible
// 3D agent label stays inside the viewport and below the header.
// Usage: node scripts/shoot.mjs [--only=1440x900] [--variant=motion|reduced|nowebgl]
// Everything is started and stopped inside this process (no leftover server).
import { preview } from "vite";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { homedir } from "node:os";

const ROOT = resolve(import.meta.dirname, "..");
const OUT = join(ROOT, "shots");
mkdirSync(OUT, { recursive: true });
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const variant = args.variant ?? "motion";

const CH_BASE = join(homedir(), ".cache/hyperframes/chrome/chrome-headless-shell");
const CHROME = join(CH_BASE, readdirSync(CH_BASE)[0], "chrome-headless-shell-win64/chrome-headless-shell.exe");
const PORT = 4174;
const DBG = 9334;

const VIEWPORTS = [
  { w: 390, h: 844, mobile: true },
  { w: 768, h: 1024, mobile: true },
  { w: 1440, h: 900, mobile: false },
  { w: 1920, h: 1080, mobile: false },
].filter((v) => !args.only || args.only.split(",").includes(`${v.w}x${v.h}`));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = await preview({ root: ROOT, logLevel: "silent", preview: { port: PORT, strictPort: true, host: "127.0.0.1" } });
const chrome = spawn(
  CHROME,
  [
    `--remote-debugging-port=${DBG}`,
    `--user-data-dir=${join(ROOT, "shots", ".chrome-profile")}`,
    "--no-first-run",
    "--hide-scrollbars",
    "--autoplay-policy=no-user-gesture-required",
    "--enable-unsafe-swiftshader",
    "--use-angle=swiftshader",
    "about:blank",
  ],
  { stdio: "ignore" },
);

const report = { variant, viewports: [] };
try {
  let ver;
  for (let i = 0; i < 50; i++) {
    try {
      ver = await (await fetch(`http://127.0.0.1:${DBG}/json/version`)).json();
      break;
    } catch {
      await sleep(200);
    }
  }
  const ws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  let id = 0;
  const pending = new Map();
  const listeners = [];
  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result);
    } else if (msg.method) listeners.forEach((l) => l(msg));
  });
  const send = (method, params = {}, sessionId) =>
    new Promise((res, rej) => {
      const m = { id: ++id, method, params };
      if (sessionId) m.sessionId = sessionId;
      const timer = setTimeout(() => {
        pending.delete(m.id);
        rej(new Error(`CDP timeout: ${method}`));
      }, 30000);
      pending.set(m.id, { res: (v) => (clearTimeout(timer), res(v)), rej: (e) => (clearTimeout(timer), rej(e)) });
      ws.send(JSON.stringify(m));
    });
  const evaluate = async (s, expr) => (await s("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })).result.value;

  for (const vp of VIEWPORTS) {
    const { targetId } = await send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
    const s = (m, p) => send(m, p, sessionId);
    const logs = [];
    listeners.push((msg) => {
      if (msg.sessionId !== sessionId) return;
      if (msg.method === "Runtime.consoleAPICalled" && ["error", "warning", "assert"].includes(msg.params.type))
        logs.push(`${msg.params.type}: ${msg.params.args.map((a) => a.value ?? a.description).join(" ")}`);
      if (msg.method === "Runtime.exceptionThrown") logs.push(`exception: ${msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text}`);
      if (msg.method === "Log.entryAdded" && ["error", "warning"].includes(msg.params.entry.level))
        logs.push(`log/${msg.params.entry.source}: ${msg.params.entry.text} ${msg.params.entry.url ?? ""}`);
    });
    await s("Runtime.enable");
    await s("Log.enable");
    await s("Page.enable");
    let pre = `document.addEventListener('securitypolicyviolation', e => console.error('CSP-VIOLATION', e.violatedDirective, e.blockedURI, e.sourceFile, e.lineNumber));`;
    if (variant === "nowebgl")
      pre += `const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(t, ...a){ if (/webgl/i.test(t)) return null; return g.call(this, t, ...a); };`;
    await s("Page.addScriptToEvaluateOnNewDocument", { source: pre });
    await s("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: variant === "reduced" ? "reduce" : "no-preference" }] });
    await s("Emulation.setDeviceMetricsOverride", { width: vp.w, height: vp.h, deviceScaleFactor: 1, mobile: vp.mobile });
    await s("Emulation.setTouchEmulationEnabled", { enabled: vp.mobile });
    await s("Page.navigate", { url: `http://127.0.0.1:${PORT}/index.html` });
    for (let i = 0; i < 80; i++) {
      if ((await evaluate(s, "document.readyState")) === "complete") break;
      await sleep(100);
    }
    await sleep(3000);
    const state = await evaluate(s, `({ cls: document.documentElement.className, live: document.querySelector('#agents').classList.contains('is-live'), stack: document.querySelector('#projets').classList.contains('is-stack') })`);
    const positions = await evaluate(
      s,
      `(() => { const H = innerHeight; const top = (sel, dy = 0) => Math.round(document.querySelector(sel).getBoundingClientRect().top + scrollY + dy);
        const out = { '01-hero': 0, '02-about': top('#apropos', -H * 0.05), '03-projets': top('#projets') };
        const track = document.querySelector('.projects__track');
        const tTop = top('.projects__track'); const tLen = track.offsetHeight - H;
        if (document.querySelector('#projets').classList.contains('is-stack')) {
          const T = 0.35 + 4 * 1.55; const at = [0.2, 0.35 + 1.27, 0.35 + 1.55 + 1.27, 0.35 + 3.1 + 1.27, 0.35 + 4.65 + 1.27];
          at.forEach((t, i) => (out['04-p' + (i + 1)] = Math.round(tTop + tLen * (t / T))));
        } else [1, 2, 3, 4, 5].forEach((i) => (out['04-p' + i] = top('.panel--' + i, -20)));
        const ag = document.querySelector('#agents');
        if (ag.classList.contains('is-live')) { const aT = top('#agents'); const aL = ag.offsetHeight - H; [0.02, 0.2, 0.4, 0.6, 0.8, 0.97].forEach((p, i) => (out['05-agents' + i] = Math.round(aT + aL * p))); }
        else { out['05-agents0'] = top('#agents'); out['05-agents1'] = top('.nodes', -H * 0.2); }
        out['06-outils'] = top('#outils'); out['07-outils2'] = top('.tools__cols', -H * 0.3);
        out['08-contact'] = top('#contact'); out['09-end'] = document.documentElement.scrollHeight - H;
        return out; })()`,
    );
    const shots = [];
    const labelIssues = [];
    for (const [name, y] of Object.entries(positions)) {
      await evaluate(s, `window.scrollTo(0, ${y}); true`);
      await sleep(1600);
      const { data } = await s("Page.captureScreenshot", { format: "png" });
      const file = join(OUT, `${variant}-${vp.w}x${vp.h}-${name}.png`);
      writeFileSync(file, Buffer.from(data, "base64"));
      shots.push(file);
      if (name.startsWith("05-agents")) {
        const bad = await evaluate(
          s,
          `(() => { const W = document.documentElement.clientWidth, H = innerHeight; const hdr = document.querySelector('.top').getBoundingClientRect().bottom; const out = [];
            const vis = [...document.querySelectorAll('.nodes li')].filter(li => getComputedStyle(li).visibility === 'visible' && +getComputedStyle(li).opacity > 0.05);
            const rects = vis.map(li => [li.textContent.trim().slice(0, 14), li.firstElementChild.getBoundingClientRect()]);
            rects.forEach(([n, r]) => { if (r.left < 0 || r.right > W || r.top < hdr || r.bottom > H) out.push(n + ' out (' + [r.left, r.top, r.right, r.bottom].map(Math.round) + ')'); });
            const det = document.querySelector('.detail').getBoundingClientRect();
            const texts = [...document.querySelectorAll('.agents__head .label, .agents__head .h2, .agents__hint')].map(el => { const rg = document.createRange(); rg.selectNodeContents(el); return [el.className, rg.getBoundingClientRect()]; }).filter(([, r]) => r.width > 0);
            const ov = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
            rects.forEach(([n, r]) => { if (ov(r, det)) out.push(n + ' overlaps detail'); texts.forEach(([c, t]) => { if (ov(r, t)) out.push(n + ' overlaps ' + c); }); });
            for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) if (ov(rects[i][1], rects[j][1])) out.push(rects[i][0] + ' overlaps ' + rects[j][0]);
            return out; })()`,
        );
        if (bad.length) labelIssues.push(`${name}: ${bad.join("; ")}`);
      }
    }
    const issues = await evaluate(
      s,
      `(() => { const out = []; const W = document.documentElement.clientWidth;
        if (document.documentElement.scrollWidth > W + 1) out.push('horizontal overflow: ' + document.documentElement.scrollWidth + ' > ' + W);
        document.querySelectorAll('h1,h2,h3,p,a,dd,td,li').forEach(el => {
          if (el.closest('.nodes')) return;
          const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') return;
          if (el.scrollWidth > el.clientWidth + 2 && cs.overflow !== 'visible') out.push('clipped: ' + el.tagName + ' ' + el.textContent.trim().slice(0, 40));
          const r = el.getBoundingClientRect(); if (r.width > 0 && (r.right > W + 1 || r.left < -1)) out.push('beyond edge: ' + el.tagName + ' ' + el.textContent.trim().slice(0, 40) + ' (' + Math.round(r.left) + '..' + Math.round(r.right) + ')');
        });
        return out; })()`,
    );
    await evaluate(s, "window.scrollTo(0, 0); true");
    await sleep(600);
    const fps = await evaluate(
      s,
      `new Promise(r => { let n = 0; const t0 = performance.now(); let y = 0; const f = () => { n++; y += 6; window.scrollTo(0, y); if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(Math.round(n / ((performance.now() - t0) / 1000))); }; requestAnimationFrame(f); })`,
    );
    const net = await evaluate(s, `[...new Set(performance.getEntriesByType('resource').map(r => new URL(r.name).origin))]`);
    report.viewports.push({ viewport: `${vp.w}x${vp.h}`, state, fps, origins: net, issues, labelIssues, logs: [...new Set(logs)], shots: shots.length });
    console.error(`[shoot] ${variant} ${vp.w}x${vp.h} done`);
    await send("Target.closeTarget", { targetId });
  }
  ws.close();
} finally {
  chrome.kill();
  server.httpServer.closeAllConnections?.();
  await Promise.race([server.close(), sleep(3000)]);
}
writeFileSync(join(OUT, `report-${variant}-${args.only ?? "all"}.json`), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 1));
process.exit(0);

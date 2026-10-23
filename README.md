# Portfolio Captox (KIWIBYTE)

Site 100 % statique : Vite + TypeScript, Three.js avec shaders GLSL écrits à la main, GSAP ScrollTrigger, Lenis.
Pas de CDN, pas de police distante, CSP stricte (voir `SECURITY-CHECK.md`). Charte : `DESIGN.md`.

## Développer
```bash
npm ci
npm run dev        # http://localhost:5174
```

## Construire
```bash
npm run build      # tsc --noEmit puis vite build -> dist/
npm run preview    # sert dist/ sur http://127.0.0.1:4174 (Ctrl+C pour arrêter)
npm audit          # doit afficher 0 vulnérabilité
```
`dist/` contient tout le site (chemins relatifs, `base: "./"`), sans sourcemaps, avec `.nojekyll` et `.well-known/security.txt`.

## Contrôles
```bash
node scripts/shoot.mjs                    # 4 tailles, mode animé : captures + console/CSP + étiquettes 3D
node scripts/shoot.mjs --variant=reduced  # prefers-reduced-motion
node scripts/shoot.mjs --variant=nowebgl  # repli sans WebGL
python scripts/topng.py "shots/*.png" --sheet shots/png/planche.png   # vrais PNG + planche
```
Le script démarre et arrête lui-même le serveur de preview et Chrome headless (chrome-headless-shell de HyperFrames, dans `~/.cache/hyperframes`). Rapports : `shots/report-*.json`.

## Déployer sur GitHub Pages
Option A, la plus simple (branche `gh-pages`) :
```bash
npm run build
git subtree push --prefix dist origin gh-pages   # nécessite de retirer dist/ du .gitignore sur une branche dédiée
```
Option B, recommandée (GitHub Actions, sans committer `dist/`) : créer `.github/workflows/pages.yml` :
```yaml
name: pages
on: { push: { branches: [main] } }
permissions: { contents: read, pages: write, id-token: write }
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: { name: github-pages }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci && npm audit --audit-level=high && npm run build
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
      - uses: actions/deploy-pages@v4
```
Puis, dans le dépôt : Settings → Pages → Source : « GitHub Actions ». Le site fonctionne dans un sous-dossier (`https://<user>.github.io/<repo>/`) grâce aux chemins relatifs.
Aucun dépôt distant n'a été créé : à faire avec l'accord de Captox.

# SECURITY-CHECK — portfolio Captox

Date : 2026-10-23. Build vérifié : `dist/` (Vite 8.3.5).

| Exigence | Résultat | Preuve |
|---|---|---|
| Site 100 % statique | OK | `dist/` = HTML + JS/CSS + images/vidéos/police locales. Aucun appel réseau dans le code (`connect-src 'self'`). |
| CSP stricte par balise meta | OK | `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self'; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'`. Pas de `unsafe-inline` ni `unsafe-eval`. `blob:` retiré (inutilisé). `data:` en img-src seulement pour le grain généré par canvas. |
| Aucun script/style inline | OK | `dist/index.html` : un seul `<script type="module" src>` et un `<link rel="stylesheet">` ; aucun attribut `style=` ni `on*=`. Les styles posés par JS passent par CSSOM (autorisé par la CSP). |
| Test CSP en navigateur | OK, 0 violation | `scripts/shoot.mjs` écoute `securitypolicyviolation` + console : 3 variantes (animé, mouvement réduit, sans WebGL) x 4 tailles = 12 sessions, `logs: []` partout (`shots/report-*-all.json`). |
| Aucun CDN, script ou police tiers | OK | Origines réellement chargées (Performance API) : uniquement `http://127.0.0.1:4174`. Montserrat auto-hébergée (WOFF2), licence OFL jointe. |
| Aucune donnée perso ni secret | OK | grep sur `dist/ src/ public/ index.html scripts/` : aucun chemin `C:\Users` / `D:\`, nom d'utilisateur système, clé API, token, webhook, e-mail. Seuls « Captox » (pseudo public) et « Hermes Agent » (nom d'outil) apparaissent. Les scripts de test résolvent Chrome via `os.homedir()`, sans chemin en dur. |
| Liens externes | OK | 4 `target="_blank"`, tous `rel="noopener noreferrer"`. `<meta name="referrer" content="no-referrer">`. |
| npm audit | OK | `npm audit` : `found 0 vulnerabilities`. |
| security.txt | OK | `public/.well-known/security.txt` (contact GitHub, Expires 2027-10-23), copié dans `dist/.well-known/`. `.nojekyll` ajouté pour que GitHub Pages serve `.well-known`. |
| Pas de sourcemaps | OK | `sourcemap: false` ; aucun `.map` dans `dist/assets`, 0 `sourceMappingURL`. |
| Secrets hors Git | OK | `.gitignore` : `.env`, `.env.*`, `node_modules/`, `dist/`, `shots/`. |

Limite : GitHub Pages ne permet pas d'en-têtes HTTP personnalisés (HSTS, X-Frame-Options, `frame-ancestors` ignoré en meta). Le site n'a ni formulaire ni session : risque de clickjacking jugé négligeable.

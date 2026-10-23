# VISUAL-CHECK — portfolio Captox

Date : 2026-10-23. Outil : `node scripts/shoot.mjs [--variant=motion|reduced|nowebgl] [--only=WxH]`
(Chrome headless, rendu WebGL logiciel SwiftShader). Les captures sont converties en vrai PNG par `python scripts/topng.py`
(Pillow) avant tout examen, dans `shots/png/` (dossier ignoré par Git).

## Captures examinées
18 positions par taille : hero, à propos, intro projets, 5 panneaux projets, 6 étapes de la section agents, outils (x2), contact, fin.

- `sheet-1440-agents.png` : état initial (défaut à corriger)
- `sheet-{390x844,768x1024,1440x900,1920x1080}-{a,b}.png` : toutes les sections, mode animé
- `motion-1440x900-03-projets.png`, `motion-390x844-03-projets.png` : avant/après correction du titre Projets
- `sheet-390x844-fix.png`, `sheet-768x1024-fix.png` : kiwi mobile/tablette après correction
- `motion-768x1024-01-hero.png` (zoom légende), `motion-768x1024-05-agents0.png` (zoom étiquettes)
- `all-motion-1920x1080.png`, `all-motion-768x1024.png` : passe finale
- `all-reduced-390x844.png` : prefers-reduced-motion
- `all-nowebgl-1440x900.png` : repli sans WebGL

## Défauts trouvés et corrections
1. **Étiquettes 3D (section agents)** : coupées par les bords et chevauchant la navigation, le titre, le texte d'aide, la carte de détail ou d'autres étiquettes (1440x900 : Référenceur sur le titre, Tony sur Narrateur ; 768x1024 : Veille sur le titre ; 390x844 : Tony sur Développeur).
   Correction (`src/main.ts`, `st.onFrame`) : chaque étiquette est contenue dans la fenêtre (marge 8/16 px, sous la barre de 76 px, au-dessus de la carte sur écran étroit), puis écartée des blocs de texte mesurés par `Range` (emprise réelle des glyphes) et des étiquettes déjà placées, dans la direction libre la plus proche.
   Contrôle automatique ajouté (`labelIssues`) : 0 problème aux 4 tailles x 6 positions.
2. **Titre « Projets » (1440)** : le kiwi recouvrait le titre ; « : » isolé en début de ligne. Correction : kiwi décalé à gauche et atténué ; `obsession :` insécable (`.nobr`).
3. **Hero et fin (390, 768)** : le kiwi passait derrière le titre. Correction : sur écran étroit, la caméra cadre le kiwi dans la bande libre entre la navigation et le texte (`fitBand`) ; atténuation plus forte sur « À propos » et « Projets ».

## Résultats automatiques (build final)
| Variante | 390x844 | 768x1024 | 1440x900 | 1920x1080 |
|---|---|---|---|---|
| Animé : débordement / texte coupé / étiquettes / console | 0/0/0/0 | 0/0/0/0 | 0/0/0/0 | 0/0/0/0 |
| Mouvement réduit (classe `reduced`, pas de 3D ni de Lenis) | 0 problème | 0 | 0 | 0 |
| Sans WebGL (classe `no-webgl`, image du kiwi en repli) | 0 problème | 0 | 0 | 0 |

FPS mesurés pendant le défilement (headless, GPU logiciel, indicatif) : 57 à 60 ; une mesure à 44 sur 768x1024 lors d'un passage précédent.
Limite : les mesures viennent du rendu logiciel headless, pas d'un vrai GPU ni d'un téléphone. À confirmer sur un appareil réel.

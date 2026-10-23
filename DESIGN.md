---
version: alpha
name: Captox — Noyau
description: Portfolio sombre et cinématique. Une tranche de kiwi en particules dont le cœur rose devient l'orchestrateur d'un réseau d'agents.
colors:
  primary: "#34D399"
  secondary: "#F472B6"
  neutral: "#0F1115"
  ink: "#F5F5F4"
  muted: "#A3A3A0"
  card-green: "#16211D"
  card-pink: "#261522"
  line: "#2A2E35"
typography:
  display:
    fontFamily: Montserrat
    fontSize: 9rem
    fontWeight: 800
    lineHeight: 0.86
    letterSpacing: "-0.045em"
  h2:
    fontFamily: Montserrat
    fontSize: 4.5rem
    fontWeight: 800
    lineHeight: 0.92
    letterSpacing: "-0.035em"
  h3:
    fontFamily: Montserrat
    fontSize: 1.5rem
    fontWeight: 800
    lineHeight: 1.1
  body-md:
    fontFamily: Montserrat
    fontSize: 1.0625rem
    fontWeight: 500
    lineHeight: 1.6
  label:
    fontFamily: ui-monospace
    fontSize: 0.75rem
    fontWeight: 500
    letterSpacing: "0.08em"
rounded:
  none: 0px
  sm: 4px
  pill: 999px
spacing:
  xs: 8px
  sm: 16px
  md: 32px
  lg: 64px
  xl: 128px
components:
  button-link:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: 16px
  button-link-hover:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral}"
  panel-green:
    backgroundColor: "{colors.card-green}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
  panel-pink:
    backgroundColor: "{colors.card-pink}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
  accent-word:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.secondary}"
  tag:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
  caption:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.muted}"
  divider:
    backgroundColor: "{colors.line}"
    textColor: "{colors.ink}"
---

## Overview

Surface : **Decide / Learn** (un portfolio qui doit convaincre), donc un hero est légitime, mais chaque section porte UNE idée.
Fil narratif visuel : l'emblème KIWIBYTE (tranche de kiwi, graines carrées = « bytes », cœur rose) est reconstruit en
particules WebGL. Au scroll, la tranche se défait en couloir de données (projets), puis en réseau d'agents dont le cœur rose
est l'orchestrateur (Tony). À la fin, tout se referme en kiwi. Un seul objet 3D, qui change de forme : pas de décor gratuit.

## Colors

- **Charbon #0F1115** : fond unique de tout le site. Jamais de passage au clair.
- **Ivoire #F5F5F4** : texte. **Gris #A3A3A0** : texte secondaire (contraste 7,6:1 sur charbon).
- **Vert #34D399** : structure (liens entre agents, numéros, étiquettes, focus clavier).
- **Rose #F472B6** : un seul élément d'attention par écran (le cœur 3D, un mot du titre, l'agent sélectionné).
- **Cartes #16211D / #261522** : panneaux de preuve (vert = fonctionnement, rose = limite / garde-fou).
- Néon (halo) : réservé au cœur rose et à l'agent actif. Rien d'autre ne brille.

## Typography

Montserrat variable auto-hébergée (sous-ensemble latin/français, WOFF2 ~32 Ko), poids 800 pour les titres, 500 pour le texte.
Titres très serrés (interlignage 0,86), énormes, coupés en lignes volontaires. Étiquettes techniques en monospace système
(ui-monospace / Consolas) : aucun téléchargement, rendu « terminal ». Pas d'Inter, pas d'emoji.

## Layout

Grille 12 colonnes, marges latérales clamp(20px, 6vw, 120px). Composition asymétrique : texte sur 5-6 colonnes, l'objet 3D
occupe l'autre moitié. Mobile-first : une colonne, 3D derrière le texte avec voile sombre.
Projets : chapitres plein écran empilés (position sticky) ; le suivant entre par un volet (clip-path) piloté par le scroll.

## Elevation & Depth

Pas d'ombre portée ni de glassmorphism. La profondeur vient de la 3D (brouillard exponentiel, taille de point selon la
distance) et d'un grain animé très léger (4 % d'opacité) au-dessus de tout.

## Shapes

Angles quasi droits (4 px). Les seules formes rondes : boutons-liens en pilule et les nœuds d'agents.
Filets de 1 px #2A2E35 pour structurer, numéros d'index en contour.

## Components

- `button-link` : pilule, bordure 1 px ivoire, passe en vert plein au survol/focus.
- `panel-green` / `panel-pink` : preuve technique (fichier, règle, commande), texte en monospace pour les noms de fichiers.
- `accent-word` : un mot rose par titre au maximum.
- `tag` : étiquette verte en monospace majuscules (phase, modèle).
- Curseur custom (anneau 28 px + point) sur pointeur fin uniquement ; masqué au tactile et en mouvement réduit.

## Do's and Don'ts

Mouvements : scrub au scroll (Lenis + ScrollTrigger), entrées 0,6-0,9 s en `expo.out`, rien qui boucle sans raison
sauf la respiration lente du nuage de particules. `prefers-reduced-motion` : pas de Lenis, pas de scrub, 3D figée.

- Faire : chiffres et affirmations tirés des fichiers du projet (README, TRAME, scripts), noms de fichiers réels.
- Faire : une couleur d'accent forte par écran ; le rose désigne ce qu'il faut retenir.
- Ne pas faire : dégradé violet/bleu, grille de cartes identiques, glassmorphism, icône au-dessus de chaque titre.
- Ne pas faire : « révolutionnaire », « boostez », faux témoignages, faux logos clients, chiffres inventés.
- Ne pas faire : CDN, police distante, style ou script inline (CSP stricte).

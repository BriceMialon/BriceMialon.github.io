# Brice Mialon · Portfolio

**Site en ligne : [bricemialon.github.io](https://bricemialon.github.io/)**

Portfolio personnel pensé comme le complément d'un CV : il ne répète pas mes expériences professionnelles, il montre ce qu'un CV ne peut pas transmettre. Qui je suis, comment je fonctionne en équipe, et ce qui compte pour moi, en images et en vidéos.

Étudiant en Master CREMS (IAE Lille), je recherche un stage en conseil en stratégie, management et transformation IA, d'avril à août 2027.

## Choix techniques

Le site est fait main en HTML, CSS et JavaScript natifs, sans framework, sans dépendance de build. Une seule bibliothèque externe : [Lenis](https://github.com/darkroomengineering/lenis) pour l'inertie de défilement, chargée depuis un CDN avec contrôle d'intégrité (SRI).

Performance :

- Façades vidéo : aucun iframe YouTube ne se charge avant le premier rendu. Chaque vidéo d'arrière-plan ne devient un vrai player que lorsque sa section approche du viewport.
- Filet de sécurité vidéo : si une vidéo d'arrière-plan ne démarre pas (réseau restreint, embed en erreur), un watchdog fond l'iframe et laisse apparaître une image poster à la place d'un écran noir.
- Images servies en WebP avec chargement différé, vidéos courtes auto-hébergées en MP4 avec posters.
- `content-visibility: auto` sur les chapitres hors écran, préconnexions DNS, cache-busting versionné.

Accessibilité :

- `prefers-reduced-motion` respecté partout : préloader, curseur personnalisé, sections cinématiques et animations se désactivent proprement, le contenu reste intégralement lisible.
- Textes alternatifs descriptifs, aria-labels sur les contrôles, `aria-expanded` sur le menu mobile, lightbox en `role="dialog"` avec gestion du focus.

Sécurité et SEO :

- Content Security Policy stricte en meta, protection anti-clickjacking, `rel="noopener"` systématique.
- Données structurées schema.org (Person, WebSite), Open Graph, sitemap, robots.txt, canonical.

## Structure du dépôt

```
index.html          Page unique du site
style.css           Styles (design tokens en tête de fichier)
script.js           Interactions et couche cinématique
assets/img/         Images WebP et posters
assets/video/       Vidéos MP4 auto-hébergées
assets/docs/        CV et lettre de recommandation (PDF)
robots.txt, sitemap.xml
```

## Développement local

Aucune installation nécessaire :

```
python3 -m http.server 8000
```

Puis ouvrir http://localhost:8000.

## Méthode

Conçu et itéré en pilotant des assistants IA, du design au code, puis relu, testé et assemblé ligne par ligne. Ce dépôt fait partie de la démonstration : la transformation par l'IA, appliquée à mon propre projet.

## Contact

Bricemialon.pro@gmail.com · [LinkedIn](https://www.linkedin.com/in/brice-mialon/)

Contenus (photos, vidéos, textes) : tous droits réservés. Code librement réutilisable.

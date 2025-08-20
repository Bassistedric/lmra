# LMRA – Mobile (PWA)

Checklist LMRA installable et hors-ligne.

## Fichiers
- `index.html` – application React (via CDN)
- `sw.js` – service worker (cache offline)
- `manifest.webmanifest` – manifest PWA
- `icon-192.png`, `icon-512.png` – icônes
- `.nojekyll` – désactive Jekyll sur GitHub Pages

## Déploiement GitHub Pages
1) Créez un dépôt (ex: `lmra-pwa`) et uploadez tous les fichiers à la racine.
2) Settings → Pages → *Build and deployment* → **Deploy from a branch**.
   - Branch: `main` (ou `master`), Folder: `/ (root)`.
3) Ouvrez l'URL publiée et ajoutez-la à l'écran d'accueil sur mobile.

## Mise à jour
Remplacez les fichiers et validez un nouveau commit → GitHub Pages redéploie.

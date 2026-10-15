# Arkos — Prime Build Co. · GitHub Pages–ready website

Plain HTML, CSS and vanilla JavaScript (with jQuery 3.7 and Bootstrap 5.3 CSS as the only libraries). No frameworks, no server, no build step required — this folder is the whole website.

## Publish to GitHub Pages
1. Push this folder to a GitHub repository (it must sit at the repo root).
2. In the repo: **Settings → Pages → Build and deployment → Source: "Deploy from a branch" → main / (root)**.
3. Your site goes live at `https://<username>.github.io/<repo-name>/` (all links are relative, so it works in subpaths too).

A blank `.nojekyll` file is included on purpose — it stops GitHub Pages from running Jekyll processing.

## Maintaining the site
- `index.html` — all sections and content. Search for `TODO: Change text` / `TODO: Change image` / `TODO: Price selector` comments and edit what they mark.
- `styles.css` — the whole design (colors live in the `:root` variables at the top).
- `app.js` — behavior: currency selector, live exchange rates, estimator, portfolio filter + lightbox, contact form (opens the visitor's email app).
  - The contact email is set in `CONTACT_EMAIL` in `app.js`.
  - Fallback exchange rates (used when the live service can't be reached) are in `RATES` in `app.js`. Live rates refresh daily from open.er-api.com.
- `assets/img/` — WebP images in three widths (480 / 960 / 1600). `assets/favicon.svg` is the tab icon / logo mark.
- `vendor/` — jQuery, Bootstrap CSS and the small Lenis smooth-scroll helper.

## Optional minified build
`node build.js` creates a `dist/` copy with minified HTML/CSS (comments, including the TODOs, are stripped). Serve `dist/` instead if you want the smaller files — but edit only the source files, never `dist/`.

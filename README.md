# Skullforge Library — GitHub Pages Repository

This folder is intended to become the public GitHub repository used by GitHub Pages.

## Contents

- `index.html` — static site entry point
- `css/style.css` — site styling
- `js/app.js` — loads and searches the JSON catalog
- `data/releases.json` — one record per monthly/candidate release post
- `data/models.json` — model names, tags, and release relationships
- `images/` — release images you intentionally choose to publish

## Initialize the repository

From this folder:

```bash
git init
git branch -M main
git add .
git commit -m "Initial Skullforge Library"
```

Create an empty repository on GitHub, then add its remote. Example:

```bash
git remote add origin https://github.com/YOUR-USERNAME/Skullforge-Library.git
git push -u origin main
```

## Enable GitHub Pages

In the GitHub repository:

1. Open **Settings**.
2. Open **Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select `main` and `/ (root)`.
5. Save.

GitHub will publish this folder as a static site.

## Data schema

### releases.json

```json
{
  "id": "unique-release-id",
  "release_month": "2026-08",
  "title": "August 2026 Release",
  "post_url": "https://www.patreon.com/posts/...",
  "post_date": "2026-08-01T12:00:00+00:00",
  "image": "images/2026/2026-08-release.jpg",
  "source": "patreon-local-scrape"
}
```

### models.json

```json
{
  "id": "unique-model-id",
  "name": "Curated display name",
  "name_raw": "Text originally detected",
  "release_id": "unique-release-id",
  "tags": ["jedi", "character"],
  "notes": "Optional notes"
}
```

The starter scraper does not yet OCR model names from the monthly image. That is deliberate: once we see the actual images produced by your Patreon session, we can tune OCR/image processing against the real layout instead of guessing.

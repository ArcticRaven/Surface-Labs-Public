# Surface Labs: public site

Marketing site + Starlight docs for Surface Labs (Astro 7, Cloudflare).

## Deploying

- **Never run `wrangler deploy` locally.** The live site deploys from GitHub
  on push to `main`. To ship anything: commit and push. That is the deploy.
- Test locally with `npm run dev` (or `npm run build && npm run preview`).
  The user reviews on localhost before anything is pushed.

## Layout

- `src/content/docs/`: Starlight docs. `npm run build` also emits the in-app
  docs bundle to `dist/docs/app/` via `scripts/build-app-docs.mjs`; authoring
  rules for it are in `scripts/APP_DOCS_AUTHORING.md`.
- `src/assets/screenshots/`: landing gallery only, square material renders,
  auto-globbed by `src/components/Gallery.astro`. UI screenshots for docs go
  in `src/assets/docs/`, blog images in `src/assets/blog/`, untracked
  full-res originals in `src/assets/originals/`.
- `src/docs-sidebar.mjs`: single source of truth for docs navigation, the
  app manifest's categories, and article ids (ids are permanent; the build
  fails if a published id disappears, see `app-docs-ids.json`).
- `src/content/announcements/` + `src/content/changelog/` + blog posts with
  `announce: true`: the in-app News feed. `npm run build` emits it to
  `dist/app/` via `scripts/build-comms.mjs`, deliberately beside the docs
  bundle rather than inside it so the two cannot invalidate each other.
  Authoring rules in `scripts/COMMS_AUTHORING.md`; `npm run preview:comms`
  shows what the app would actually render from the built feed.

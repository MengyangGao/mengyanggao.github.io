# Mengyang Gao's Personal Website

Astro + TypeScript personal website. Clone it, install dependencies, and edit `content/`.

Node.js 24 or newer is required; `.nvmrc` is the shared local/CI version source.

## Quick Start

```bash
npm ci
ASTRO_TELEMETRY_DISABLED=1 npm run dev -- --host
```

Open `http://127.0.0.1:4321`.

The root homepage defaults to English. The Chinese homepage entry is `/zh`; after a visitor uses the language switcher, that choice is saved locally and follows them across later pages.

The canonical production domain is `https://gaomengyang.com`. The GitHub Pages subdomain `https://mengyanggao.github.io` remains as the Pages host and redirects visitors to the same path on the custom domain.

## Content Layout

- `content/home/home.md`: homepage profile, multilingual Markdown introduction, layout, links, and selected work
- `content/pages/pages.json`: shared labels, SEO copy, comments, and section-page copy
- `content/blog/<slug>/index.md`: blog posts; one directory per URL slug
- `content/blog/<slug>/assets/*`: assets owned by one blog post
- `content/assets/*`: reusable profile and contact assets

Generated outputs are not meant to be edited by hand:

- `src/data/link-metadata.json`
- `public/assets/images/repos/*`
- `public/assets/images/portfolio/*`

## What To Edit

- Update `content/home/home.md` when you change profile data, the introduction, navigation, homepage sections, social links, footer data, or selected work. In `selectedWork`, `href` is the only required field; titles, categories, descriptions, images, and stats are resolved from existing page and metadata data. Optional `resources` render research-style `[code]`, `[video]`, and `[paper]` links.
- Update `content/pages/pages.json` when you change labels, SEO, comments, or shared copy
- Update `content/blog/<slug>/index.md` for blog content

If you fork the repo, also check `content/home/home.md` for `footer.ownerUrl`, `footer.sourceCodeUrl`, social links, and link targets, and `content/pages/pages.json` for `comments.repoId` and `comments.categoryId`.

## Useful Commands

```bash
npm run dev
npm run build
npm run preview
npm run check
npm test
npm run verify
npm run validate:content
npm run validate:metadata
npm run fetch:metadata
```

- `dev`: sync authored assets and start the site
- `build`: sync assets, validate content and metadata, then build production output
- `preview`: create a fresh production build, then preview it
- `check`: run content validation, metadata validation, and `astro check`
- `test`: build the site and run Node-based route, feed, asset, and language smoke tests
- `verify`: run the full CI gate once: sync, validate, type-check, build, and test
- `validate:content`: validate homepage Markdown, JSON configuration, blog slugs, frontmatter, local images, and selected-work references
- `validate:metadata`: validate the generated metadata bundle
- `fetch:metadata`: refresh GitHub/Bilibili metadata and generated preview images

## Environment

- `PUBLIC_SITE_URL` overrides the canonical site URL for Astro and sitemap generation
- `PUBLIC_PLAUSIBLE_DOMAIN`, `PUBLIC_PLAUSIBLE_SCRIPT`, `PUBLIC_UMAMI_SCRIPT_URL`, and `PUBLIC_UMAMI_WEBSITE_ID` are optional analytics overrides
- `SITE_CONTENT_DIR` can point at an external content checkout if you want to keep site data in another folder or repo

For local development, `PUBLIC_SITE_URL` defaults to `http://localhost:4321`, so you do not need a `.env` file just to run the site. Production builds default to `https://gaomengyang.com`. Copy `.env.example` only if you want to override the defaults.

## Deploy

1. Push to `main`.
2. In GitHub, set `Settings -> Pages -> Source` to `GitHub Actions`.
3. Set `PUBLIC_SITE_URL` to the published site URL in GitHub Actions if you deploy anywhere other than `https://gaomengyang.com`.

## Notes

- Astro reads Markdown directly from `content/blog`; no generated Markdown copy is involved
- `npm run prepare:content` only synchronizes authored static assets and runs automatically through the higher-level commands
- The metadata refresh workflow depends on `content/home/home.md`, its metadata schema, and the metadata scripts
- `npm run fetch:metadata` uses the link targets in `content/home/home.md` plus any external URLs listed in selected work
- `content/home/home.md` owns the social link list and the external target list, so those URLs do not need separate files
- The old `content/about`, `content/home/about`, `content/site`, and `content/targets` folders are no longer used after the move

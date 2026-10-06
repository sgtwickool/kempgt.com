# gregkemp.dev

My personal website, built with [Astro](https://astro.build/) and
[Tailwind CSS](https://tailwindcss.com/).

## Develop

```bash
npm install
npm run dev      # local dev server with hot reload
npm run build    # production build to dist/
npm run preview  # serve the production build locally
```

## Design

The site is styled like a risograph print. The page stays calm (paper and
ink), and the colour lives in generative prints that sit beside each piece of
work. Every print is drawn from a small piece of maths tied to its subject:
tokamak flux surfaces, a climbing topo map, a customs classification tree, a
day's labour allocation, and so on.

- Prints use three inks: `line` (fluorescent pink), `strong` (blue) and `glow`
  (yellow). They overprint with `mix-blend-mode: multiply` on light paper and
  `screen` on dark paper.
- All the art is computed at build time in `src/lib/art.ts` and ships as
  inline SVG, so it adds no client-side JavaScript.
- Colour tokens live in `src/styles/global.css`. Dark mode swaps the token
  values, so components only use the token names (`bg-paper`, `text-ink`,
  `text-ink-strong`, ...).
- Type: Archivo (variable width) for headings and UI, Source Serif 4 for text.

## Structure

```
public/                    Static files served as-is (CV, profile photo, favicon, CNAME).
src/lib/art.ts             Generators for the hero poster and every print.
src/components/            Header, footer, theme toggle, poster hero, prints,
                           section headings and the contact form.
src/layouts/               BaseLayout (head, shared SVG filters, theme script) and BlogPost.
src/pages/index.astro      The homepage, including all of its copy.
src/pages/404.astro        Not-found page.
src/pages/_blog/           The blog, currently switched off (see below).
src/content/blog/          Blog posts as markdown with frontmatter.
```

To add a print, write a generator in `src/lib/art.ts`, add it to the object
returned by `buildPrints()`, and use it with `<Print name="..." />`.

## The blog

The blog is switched off for now. Astro doesn't build anything under a page
folder that starts with `_`, so `src/pages/_blog/` and the posts in
`src/content/blog/` are kept but not published. To publish it again, rename
`src/pages/_blog` to `src/pages/blog` and add a Blog link to `SiteHeader.astro`.

Post frontmatter:

```yaml
---
title: "Post title"
date: 2026-06-01
summary: "One-line summary for the listing and meta description."
tags: [ml, maths]
math: true   # set true to load KaTeX CSS for $...$ and $$...$$ maths
draft: false # set true to hide from the listing and build
---
```

Maths uses LaTeX syntax: inline `$x^2$`, display `$$ ... $$`. Code blocks get
syntax highlighting via Shiki in both themes.

## Deployment

Pushes to `master` trigger `.github/workflows/deploy.yml`, which builds the site
and deploys it to GitHub Pages. The custom domain is gregkemp.dev, set in the
repository's Pages settings and mirrored in `public/CNAME`.

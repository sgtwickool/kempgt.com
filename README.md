# kempgt.com

My personal website and blog, built with [Astro](https://astro.build/).

## Develop

```bash
npm install
npm run dev      # local dev server with hot reload
npm run build    # production build to dist/
npm run preview  # serve the production build locally
```

## Structure

```
public/                Static assets served as-is (CSS, JS, images, CV, CNAME).
src/layouts/           BaseLayout (head/nav/footer) and BlogPost layout.
src/pages/             index.astro (homepage), blog/ (listing + posts).
src/content/blog/      Blog posts as markdown with frontmatter.
src/content.config.ts  Blog collection schema.
astro.config.mjs       Site config, including remark-math + rehype-katex for maths.
```

The homepage markup and `assets/css/style.css` are the existing hand-built
design. The blog reuses the same design system (colours, navbar, footer) and
adds an editorial reading layer (Newsreader serif for prose).

## Writing a blog post

Add a markdown file to `src/content/blog/`. The filename becomes the URL slug
(`my-post.md` -> `/blog/my-post`). Frontmatter:

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
syntax highlighting via Shiki automatically.

## Deployment

Pushes to `master` trigger `.github/workflows/deploy.yml`, which builds the site
and deploys to GitHub Pages. The custom domain is set via `public/CNAME`.

> One-time setup: in the repo's **Settings -> Pages**, set the build source to
> **GitHub Actions** (not "Deploy from a branch"). The old setup served the repo
> root directly; Astro builds to `dist/`, so the Actions workflow is required.

// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import icon from "astro-icon";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

// gregkemp.dev is served from the apex domain via the public/CNAME file,
// so the site is the bare domain with no base path.
export default defineConfig({
  site: "https://gregkemp.dev",
  // Only bundle the icons the site actually uses.
  integrations: [icon({ include: { lucide: ["menu", "x", "moon", "sun"] } })],
  vite: {
    plugins: [tailwindcss()],
  },
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
    shikiConfig: {
      // Both themes are emitted as CSS variables; global.css picks one
      // based on the active colour theme.
      themes: { light: "github-light", dark: "github-dark" },
      defaultColor: false,
      wrap: true,
    },
  },
});

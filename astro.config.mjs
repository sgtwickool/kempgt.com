// @ts-check
import { defineConfig } from "astro/config";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

// kempgt.com is served from the apex domain via the public/CNAME file,
// so the site is the bare domain with no base path.
export default defineConfig({
  site: "https://kempgt.com",
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
    shikiConfig: {
      theme: "github-dark",
      wrap: true,
    },
  },
});

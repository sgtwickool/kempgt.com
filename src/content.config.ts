import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    author: z.string().default("Gregory Kemp"),
    tags: z.array(z.string()).default([]),
    summary: z.string(),
    /** Set true on posts that use maths so KaTeX CSS loads. */
    math: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };

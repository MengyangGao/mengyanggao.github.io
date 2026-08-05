import path from 'node:path';
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const repoRoot = process.cwd();
const contentRoot = path.resolve(repoRoot, process.env.SITE_CONTENT_DIR || 'content');

const toLoaderBase = (...segments: string[]) => {
  return path.join(contentRoot, ...segments).replace(/\\/g, '/');
};

const blog = defineCollection({
  loader: glob({ pattern: '*/index.md', base: toLoaderBase('blog') }),
  schema: z.object({
    title_en: z.string(),
    title_zh: z.string(),
    summary: z.string().optional(),
    url: z.url().optional(),
    publish_date: z.coerce.date(),
    modify_date: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    cover_image: z.string().optional(),
    draft: z.boolean().default(false)
  })
});

export const collections = { blog };

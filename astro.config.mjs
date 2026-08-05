import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import remarkFigureCaptions from './src/lib/remark-figure-captions.mjs';

const site = process.env.PUBLIC_SITE_URL || (process.env.NODE_ENV === 'production'
  ? 'https://gaomengyang.com'
  : 'http://localhost:4321');

export default defineConfig({
  site,
  output: 'static',
  compressHTML: true,
  trailingSlash: 'ignore',
  integrations: [sitemap()],
  markdown: {
    processor: unified({ remarkPlugins: [remarkFigureCaptions] })
  }
});

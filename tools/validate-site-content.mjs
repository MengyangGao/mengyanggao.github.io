import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateContentJsonBundle } from '../src/lib/content-schema.js';
import { parseHomeMarkdown } from '../src/lib/home-content-source.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentRoot = path.resolve(repoRoot, process.env.SITE_CONTENT_DIR || 'content');

async function readJson(relativePath) {
  const filePath = path.join(contentRoot, relativePath);
  const raw = await readFile(filePath, 'utf-8');
  return JSON.parse(raw);
}

function readFrontmatterValue(markdown, key) {
  const frontmatter = markdown.match(/^---\s*\n([\s\S]*?)\n---(?:\s*\n|$)/)?.[1] || '';
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  return String(match?.[1] || '').trim().replace(/^(['"])(.*)\1$/, '$2');
}

async function assertFile(filePath, message) {
  try {
    await access(filePath);
  } catch {
    throw new Error(`${message}: ${path.relative(repoRoot, filePath)}`);
  }
}

async function validateBlogTree(home) {
  const blogRoot = path.join(contentRoot, 'blog');
  const entries = await readdir(blogRoot, { withFileTypes: true });
  const allSlugs = new Set();
  const publishedSlugs = new Set();

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      throw new Error(`content/blog may only contain article directories: ${entry.name}`);
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.name)) {
      throw new Error(`Invalid blog slug: ${entry.name}`);
    }

    const articleDir = path.join(blogRoot, entry.name);
    const articleFile = path.join(articleDir, 'index.md');
    await assertFile(articleFile, 'Missing blog index');
    const markdown = await readFile(articleFile, 'utf8');

    for (const key of ['title_en', 'title_zh', 'publish_date']) {
      if (!readFrontmatterValue(markdown, key)) {
        throw new Error(`Blog post ${entry.name} is missing frontmatter.${key}`);
      }
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(readFrontmatterValue(markdown, 'publish_date'))) {
      throw new Error(`Blog post ${entry.name} must use YYYY-MM-DD for frontmatter.publish_date`);
    }
    const draftValue = readFrontmatterValue(markdown, 'draft');
    if (draftValue && !['true', 'false'].includes(draftValue)) {
      throw new Error(`Blog post ${entry.name} has invalid frontmatter.draft; use true or false`);
    }

    for (const match of markdown.matchAll(/!\[[^\]]*]\(([^)]+)\)/g)) {
      const target = String(match[1] || '').trim().split(/\s+["']/)[0];
      if (!target || /^(?:[a-z]+:)?\/\//i.test(target) || target.startsWith('/') || target.startsWith('data:')) continue;
      const filePath = path.resolve(articleDir, decodeURI(target));
      if (!filePath.startsWith(`${articleDir}${path.sep}`)) {
        throw new Error(`Blog image escapes its article directory: ${entry.name}/${target}`);
      }
      await assertFile(filePath, `Missing blog image referenced by ${entry.name}`);
    }

    const coverImage = readFrontmatterValue(markdown, 'cover_image');
    if (coverImage?.startsWith(`/blog/${entry.name}/`)) {
      await assertFile(path.join(contentRoot, coverImage.replace(/^\/blog\//, 'blog/')), `Missing cover image for ${entry.name}`);
    }

    const nestedDirectories = (await readdir(articleDir, { withFileTypes: true }))
      .filter((item) => item.isDirectory() && item.name !== 'assets');
    if (nestedDirectories.length > 0) {
      throw new Error(`Nested blog content is not supported: ${entry.name}/${nestedDirectories[0].name}`);
    }
    allSlugs.add(entry.name);
    if (draftValue !== 'true') publishedSlugs.add(entry.name);
  }

  for (const item of home.selectedWork) {
    const match = item.href.match(/^\/blog\/([^/]+)\/?$/);
    if (match && !allSlugs.has(match[1])) {
      throw new Error(`selectedWork references missing blog post: ${item.href}`);
    }
    if (match && !publishedSlugs.has(match[1])) {
      throw new Error(`selectedWork cannot reference a draft blog post: ${item.href}`);
    }
  }

  return { total: allSlugs.size, published: publishedSlugs.size };
}

try {
  const bundle = validateContentJsonBundle({
    home: parseHomeMarkdown(
      await readFile(path.join(contentRoot, 'home', 'home.md'), 'utf8'),
      path.join('content', 'home', 'home.md')
    ),
    pages: await readJson(path.join('pages', 'pages.json')),
  });
  const blogCount = await validateBlogTree(bundle.home);
  console.log(`Content validation passed: ${contentRoot} (${blogCount.published}/${blogCount.total} published blog posts)`);
} catch (error) {
  console.error(`Content validation failed: ${error.message}`);
  process.exit(1);
}

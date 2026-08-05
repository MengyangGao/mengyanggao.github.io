import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { parseHomeMarkdown } from '../src/lib/home-content-source.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentRoot = path.resolve(repoRoot, process.env.SITE_CONTENT_DIR || 'content');
const distRoot = path.join(repoRoot, 'dist');
const coreRoutes = [
  'index.html',
  'zh/index.html',
  'blog/index.html',
  'robotics/index.html',
  'software/index.html',
  'music/index.html',
  'archives/index.html',
  'contact/wechat/index.html',
  '404.html',
  'robots.txt',
  'rss.xml',
  'sitemap-index.xml',
];

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function readFrontmatterValue(markdown, key) {
  const frontmatter = markdown.match(/^---\s*\n([\s\S]*?)\n---(?:\s*\n|$)/)?.[1] || '';
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  return String(match?.[1] || '').trim().replace(/^(['"])(.*)\1$/, '$2');
}

function htmlTextCandidates(value) {
  return [
    value,
    value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'),
  ];
}

async function getBlogState() {
  const entries = await readdir(path.join(contentRoot, 'blog'), { withFileTypes: true });
  const posts = await Promise.all(entries.filter((entry) => entry.isDirectory()).map(async (entry) => {
    const source = await readFile(path.join(contentRoot, 'blog', entry.name, 'index.md'), 'utf8');
    const draft = readFrontmatterValue(source, 'draft') === 'true';
    return { slug: entry.name, draft };
  }));
  return {
    published: posts.filter((post) => !post.draft).map((post) => post.slug).sort(),
    drafts: posts.filter((post) => post.draft).map((post) => post.slug).sort(),
  };
}

async function resolveDistPath(urlPath, sourceHtml) {
  const baseUrl = new URL(sourceHtml, 'https://local.test/');
  const pathname = decodeURI(new URL(urlPath, baseUrl).pathname);
  const relative = pathname.replace(/^\/+/, '');
  const candidates = pathname === '/'
    ? ['index.html']
    : pathname.endsWith('/')
      ? [path.join(relative, 'index.html')]
      : [relative, `${relative}.html`, path.join(relative, 'index.html')];

  for (const candidate of candidates) {
    const filePath = path.join(distRoot, candidate);
    if (await exists(filePath)) return filePath;
  }
  return null;
}

test('all authored blog posts have generated pages', async () => {
  const { published: slugs } = await getBlogState();
  assert.ok(slugs.length > 0, 'at least one blog post is required');
  const homeContent = parseHomeMarkdown(
    await readFile(path.join(contentRoot, 'home', 'home.md'), 'utf8'),
    path.join('content', 'home', 'home.md')
  );
  const selectedBlogSlugs = new Set(
    homeContent.selectedWork
      .map((item) => String(item.href || '').match(/^\/blog\/([^/]+)\/?$/)?.[1])
      .filter(Boolean)
  );
  const homepage = await readFile(path.join(distRoot, 'index.html'), 'utf8');
  const generatedSlugs = [];
  for (const entry of await readdir(path.join(distRoot, 'blog'), { withFileTypes: true })) {
    if (entry.isDirectory() && await exists(path.join(distRoot, 'blog', entry.name, 'index.html'))) {
      generatedSlugs.push(entry.name);
    }
  }
  generatedSlugs.sort();
  assert.deepEqual(generatedSlugs, slugs);

  for (const slug of slugs) {
    const source = await readFile(path.join(contentRoot, 'blog', slug, 'index.md'), 'utf8');
    const title = readFrontmatterValue(source, 'title_zh');
    const publishDate = readFrontmatterValue(source, 'publish_date');
    assert.ok(title, `${slug} should have a Chinese title`);
    assert.match(publishDate, /^\d{4}-\d{2}-\d{2}$/, `${slug} should have an ISO publish date`);

    const outputPath = path.join(distRoot, 'blog', slug, 'index.html');
    const html = await readFile(outputPath, 'utf8');
    assert.match(html, new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    if (selectedBlogSlugs.has(slug)) {
      assert.ok(homepage.includes(`Released: ${publishDate}`), `${slug} should keep its ISO release date on the homepage`);
    }
  }
});

test('homepage Markdown drives profile copy and research resource links', async () => {
  const source = await readFile(path.join(contentRoot, 'home', 'home.md'), 'utf8');
  const homeContent = parseHomeMarkdown(source, path.join('content', 'home', 'home.md'));
  const homepage = await readFile(path.join(distRoot, 'index.html'), 'utf8');

  assert.equal(homeContent.profile.avatar, 'profile/avatar.png');
  assert.ok(homeContent.about.en.includes('research interest is robot intelligence'));
  assert.ok(homeContent.about.zhHans.includes('研究兴趣是机器人智能'));
  assert.ok(homeContent.about.zhHant.includes('研究興趣是機器人智能'));
  assert.ok(homeContent.about.en.includes('served as a technical advisor'));
  assert.ok(homeContent.about.zhHans.includes('的技术顾问'));
  assert.ok(homeContent.about.zhHant.includes('的技術顧問'));

  const handExoskeleton = homeContent.selectedWork.find(
    (item) => item.href === 'https://github.com/MengyangGao/hand_exoskeleton'
  );
  assert.deepEqual(Object.keys(handExoskeleton?.resources || {}), ['code', 'video', 'paper']);
  for (const label of ['code', 'video', 'paper']) {
    assert.ok(homepage.includes(`>${label}</a>]`), `homepage is missing [${label}]`);
  }
  const handTitleIndex = homepage.indexOf('MengyangGao/hand_exoskeleton');
  const handCard = homepage.slice(
    homepage.lastIndexOf('<article', handTitleIndex),
    homepage.indexOf('</article>', handTitleIndex)
  );
  assert.ok(
    handCard.indexOf('plain-media-resources') < handCard.indexOf('plain-media-stats'),
    'research resources should appear before repository stats'
  );
  assert.ok(homepage.includes('/assets/content/profile/avatar.png'));
});

test('stable routes and discovery feeds cover every blog post', async () => {
  for (const route of coreRoutes) {
    assert.ok(await exists(path.join(distRoot, route)), `missing dist/${route}`);
  }

  const { published: slugs, drafts } = await getBlogState();
  const blogIndex = await readFile(path.join(distRoot, 'blog', 'index.html'), 'utf8');
  const rss = await readFile(path.join(distRoot, 'rss.xml'), 'utf8');
  const sitemapFiles = (await readdir(distRoot)).filter((name) => /^sitemap.*\.xml$/.test(name));
  const sitemap = (await Promise.all(sitemapFiles.map((name) => readFile(path.join(distRoot, name), 'utf8')))).join('\n');

  for (const slug of slugs) {
    const route = `/blog/${slug}/`;
    assert.ok(blogIndex.includes(route), `${route} missing from blog index`);
    assert.ok(rss.includes(route), `${route} missing from RSS`);
    assert.ok(sitemap.includes(route), `${route} missing from sitemap`);
  }
  for (const slug of drafts) {
    const route = `/blog/${slug}/`;
    assert.ok(!(await exists(path.join(distRoot, 'blog', slug, 'index.html'))), `${route} draft generated a page`);
    assert.ok(!blogIndex.includes(route), `${route} draft leaked into blog index`);
    assert.ok(!rss.includes(route), `${route} draft leaked into RSS`);
    assert.ok(!sitemap.includes(route), `${route} draft leaked into sitemap`);
  }
});

test('generated local links and assets resolve inside dist', async () => {
  const files = await readdir(distRoot, { recursive: true });
  const htmlFiles = files.filter((name) => name.endsWith('.html'));
  const missing = [];

  for (const name of htmlFiles) {
    const html = await readFile(path.join(distRoot, name), 'utf8');
    for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
      const target = match[1];
      if (!target || target.startsWith('#') || target.startsWith('//') || /^[a-z][a-z\d+.-]*:/i.test(target)) continue;
      if (!(await resolveDistPath(target, name))) missing.push(`${name} -> ${target}`);
    }
  }

  assert.deepEqual(missing, []);
});

test('every page keeps all three language variants', async () => {
  const files = await readdir(distRoot, { recursive: true });
  const htmlFiles = files.filter((name) => name.endsWith('.html') && name !== '404.html');

  for (const name of htmlFiles) {
    const html = await readFile(path.join(distRoot, name), 'utf8');
    for (const marker of ['lang-en', 'lang-zh-hans', 'lang-zh-hant']) {
      assert.ok(html.includes(marker), `${name} is missing ${marker}`);
    }
  }
});

test('localized section copy is present in generated pages', async () => {
  const pages = JSON.parse(await readFile(path.join(contentRoot, 'pages', 'pages.json'), 'utf8'));
  const sections = [
    ['blog/index.html', pages.blogIndex],
    ['robotics/index.html', pages.roboticsIndex],
    ['software/index.html', pages.softwareIndex],
    ['music/index.html', pages.musicIndex],
    ['archives/index.html', pages.archivesIndex],
  ];

  for (const [output, copy] of sections) {
    const html = await readFile(path.join(distRoot, output), 'utf8');
    for (const field of ['heroTitle', 'heroDescription']) {
      for (const language of ['en', 'zhHans', 'zhHant']) {
        const value = String(copy[field]?.[language] || '');
        if (value) {
          assert.ok(htmlTextCandidates(value).some((candidate) => html.includes(candidate)), `${output} is missing ${field}.${language}`);
        }
      }
    }
  }
});

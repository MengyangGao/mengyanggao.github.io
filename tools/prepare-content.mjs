import { access, cp, mkdir, readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const contentDir = path.resolve(repoRoot, process.env.SITE_CONTENT_DIR || 'content');
const assetSourceDir = path.join(contentDir, 'assets');
const assetTargetDir = path.join(repoRoot, 'public', 'assets', 'content');
const blogSourceDir = path.join(contentDir, 'blog');
const blogPublicDir = path.join(repoRoot, 'public', 'blog');

const requiredFiles = [
  ['home', 'home.md'],
  ['pages', 'pages.json'],
];

async function isDirectory(directory) {
  try {
    return (await stat(directory)).isDirectory();
  } catch {
    return false;
  }
}

async function removeMacOsJunkFiles(directory) {
  if (!(await isDirectory(directory))) return;

  const entries = await readdir(directory, { withFileTypes: true });
  await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await removeMacOsJunkFiles(target);
    } else if (entry.name === '.DS_Store') {
      await rm(target, { force: true });
    }
  }));
}

async function replaceDirectory(source, target) {
  await rm(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  if (!(await isDirectory(source))) return false;

  await mkdir(path.dirname(target), { recursive: true });
  await cp(source, target, { recursive: true });
  await removeMacOsJunkFiles(target);
  return true;
}

async function ensureRequiredFiles() {
  await Promise.all(requiredFiles.map((segments) => access(path.join(contentDir, ...segments))));
}

async function syncBlogAssets() {
  await rm(blogPublicDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  if (!(await isDirectory(blogSourceDir))) return 0;

  const entries = await readdir(blogSourceDir, { withFileTypes: true });
  let copied = 0;

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const source = path.join(blogSourceDir, entry.name, 'assets');
    const target = path.join(blogPublicDir, entry.name, 'assets');
    if (await replaceDirectory(source, target)) copied += 1;
  }

  return copied;
}

async function main() {
  await ensureRequiredFiles();
  const [copiedAssets, blogAssetCopies] = await Promise.all([
    replaceDirectory(assetSourceDir, assetTargetDir),
    syncBlogAssets(),
  ]);

  console.log(`Prepared content assets from ${path.relative(repoRoot, contentDir) || '.'}`);
  console.log(`Asset sync: ${copiedAssets ? 'copied content/assets -> public/assets/content' : 'no content/assets directory found'}`);
  console.log(`Blog asset sync: ${blogAssetCopies ? `copied ${blogAssetCopies} blog asset directories -> public/blog/*/assets` : 'no blog asset directories found'}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

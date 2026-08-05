import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import { setTimeout as sleep } from 'node:timers/promises';
import { parseHomeMarkdown } from '../src/lib/home-content-source.js';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
const CONTENT_DIR = process.env.SITE_CONTENT_DIR || 'content';

const OUTPUT_PATH = 'src/data/link-metadata.json';
const HOME_CONFIG_PATH = `${CONTENT_DIR}/home/home.md`;
const PUBLIC_IMAGE_ROOT = 'public/assets/images';
const REQUEST_TIMEOUT_MS = 15_000;
const REQUEST_MAX_RETRIES = 3;

const DEFAULT_TARGETS = {
  sections: {
    robotics: ['https://github.com/MengyangGao/hand_exoskeleton'],
    software: ['https://github.com/MengyangGao/gzic.online'],
    music: ['https://www.bilibili.com/video/BV1ZXqfYwEed/'],
  },
};

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
let configuredRepoBuckets = {
  robotics: new Set(),
  software: new Set(),
};
const fetchStatuses = [];
let cachedHomeConfig = null;

function normalizeTargetsConfig(raw) {
  const config = raw && typeof raw === 'object' ? raw : {};
  const sections = config.sections && typeof config.sections === 'object' ? config.sections : {};
  const normalizedSections = {};
  for (const [key, value] of Object.entries(sections)) {
    normalizedSections[key] = Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
  }
  for (const [key, fallback] of Object.entries(DEFAULT_TARGETS.sections)) {
    if (!Array.isArray(normalizedSections[key]) || normalizedSections[key].length === 0) {
      normalizedSections[key] = [...fallback];
    }
  }
  return { sections: normalizedSections };
}

async function loadHomeConfig() {
  if (cachedHomeConfig) return cachedHomeConfig;

  try {
    const text = await readFile(HOME_CONFIG_PATH, 'utf-8');
    const parsed = parseHomeMarkdown(text, HOME_CONFIG_PATH);
    cachedHomeConfig = {
      ...parsed,
      linkTargets: normalizeTargetsConfig(parsed.linkTargets),
      selectedWork: Array.isArray(parsed.selectedWork) ? parsed.selectedWork : [],
    };
  } catch (error) {
    console.warn(`[warn] home config fallback (${HOME_CONFIG_PATH}): ${error.message}`);
    cachedHomeConfig = {
      linkTargets: normalizeTargetsConfig(DEFAULT_TARGETS),
      selectedWork: [],
    };
  }

  return cachedHomeConfig;
}

async function loadTargetsConfig() {
  const home = await loadHomeConfig();
  return normalizeTargetsConfig(home.linkTargets);
}

async function fetchWithRetry(url, options = {}) {
  let lastError = null;

  for (let attempt = 1; attempt <= REQUEST_MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok && RETRYABLE_STATUS.has(response.status) && attempt < REQUEST_MAX_RETRIES) {
        const waitMs = 350 * 2 ** (attempt - 1);
        await sleep(waitMs);
        continue;
      }

      return response;
    } catch (error) {
      clearTimeout(timer);
      lastError = error;
      if (attempt >= REQUEST_MAX_RETRIES) break;
      const waitMs = 350 * 2 ** (attempt - 1);
      await sleep(waitMs);
    }
  }

  throw lastError || new Error(`Request failed: ${url}`);
}

async function fetchJson(url, extraHeaders = {}) {
  const headers = {
    Accept: 'application/json',
    'User-Agent': UA,
    ...extraHeaders,
  };

  if (url.includes('api.github.com')) {
    headers['X-GitHub-Api-Version'] = '2022-11-28';
    if (GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
    }
  }

  const res = await fetchWithRetry(url, {
    headers,
  });

  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${url}`);
  }

  return {
    data: await res.json(),
    headers: res.headers,
  };
}

async function fetchText(url) {
  const res = await fetchWithRetry(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': UA,
    },
  });

  return {
    ok: res.ok,
    status: res.status,
    text: await res.text(),
  };
}

async function downloadBinary(url) {
  const res = await fetchWithRetry(url, {
    headers: {
      'User-Agent': UA,
    },
  });
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${url}`);
  }
  const buffer = await res.arrayBuffer();
  return Buffer.from(buffer);
}

async function downloadBinaryWithMeta(url) {
  const res = await fetchWithRetry(url, {
    headers: {
      'User-Agent': UA,
    },
  });
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${url}`);
  }
  const buffer = await res.arrayBuffer();
  return {
    buffer: Buffer.from(buffer),
    contentType: res.headers.get('content-type') || '',
  };
}

function extractGithubRepoFromUrl(url) {
  const raw = String(url || '').trim();
  const match = raw.match(/^https?:\/\/github\.com\/([^/\s]+\/[^/\s?#]+?)(?:\.git)?\/?$/i);
  return match ? match[1] : null;
}

function extractBvidFromUrl(url) {
  const raw = String(url || '').trim();
  const match = raw.match(/BV[0-9A-Za-z]+/);
  return match ? match[0] : null;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function topLanguages(languageMap, limit = 4) {
  const entries = Object.entries(languageMap || {});
  return entries
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([lang]) => lang);
}

function languageStats(languageMap, limit = 4) {
  const entries = Object.entries(languageMap || {}).filter(([, value]) => Number(value) > 0);
  const total = entries.reduce((sum, [, value]) => sum + Number(value), 0);
  if (!total) return [];
  return entries
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, limit)
    .map(([name, bytes]) => ({
      name,
      bytes: Number(bytes),
      ratio: Number(((Number(bytes) / total) * 100).toFixed(1)),
    }));
}

function classifyRepo(repoSummary) {
  if (repoSummary.full_name && configuredRepoBuckets.robotics.has(repoSummary.full_name)) {
    return 'robotics';
  }
  if (repoSummary.full_name && configuredRepoBuckets.software.has(repoSummary.full_name)) {
    return 'software';
  }
  return 'software';
}

function buildRepoSummary(repo) {
  return {
    ...repo,
    bucket: classifyRepo(repo),
  };
}

function buildRepoBuckets(repoSummaries) {
  const buckets = {
    robotics: {
      count: 0,
      total_stars: 0,
      recent: [],
    },
    software: {
      count: 0,
      total_stars: 0,
      recent: [],
    },
  };

  for (const repo of repoSummaries) {
    const bucketName = repo.bucket || 'software';
    const bucket = buckets[bucketName] || buckets.software;
    bucket.count += 1;
    bucket.total_stars += repo.stars || 0;
    bucket.recent.push(repo);
  }

  for (const bucket of Object.values(buckets)) {
    bucket.recent.sort((a, b) => {
      const aTs = new Date(a.pushed_at || a.updated_at || 0).getTime();
      const bTs = new Date(b.pushed_at || b.updated_at || 0).getTime();
      return bTs - aTs;
    });
    bucket.recent = bucket.recent.slice(0, 20);
  }

  return buckets;
}

async function readExistingOutput() {
  try {
    const text = await readFile(OUTPUT_PATH, 'utf-8');
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function withFallback(label, fn, fallbackValue) {
  try {
    const value = await fn();
    fetchStatuses.push({ label, status: 'ok' });
    return value;
  } catch (error) {
    fetchStatuses.push({ label, status: 'fallback', reason: error.message });
    console.warn(`[warn] ${label}: ${error.message}`);
    return fallbackValue;
  }
}

function flattenBucketRepos(github = {}) {
  const buckets = github?.buckets || {};
  return [buckets?.robotics?.recent || [], buckets?.software?.recent || []].flat().filter(Boolean);
}

function getBucketChanges(previousRepos = [], currentRepos = []) {
  const previousMap = new Map(
    (previousRepos || []).map((repo) => [repo.full_name, `${repo.bucket || ''}`])
  );

  return (currentRepos || [])
    .filter((repo) => repo?.full_name)
    .map((repo) => {
      const before = previousMap.get(repo.full_name) || null;
      const after = `${repo.bucket || ''}`;
      return before && before !== after ? `${repo.full_name}: ${before} -> ${after}` : null;
    })
    .filter(Boolean);
}

async function writeGithubStepSummary(output, previous) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) return;

  const statusRows = fetchStatuses
    .map((item) => `| ${item.label} | ${item.status} | ${item.reason || '-'} |`)
    .join('\n');
  const previousRepos = flattenBucketRepos(previous?.github || {});
  const currentRepos = flattenBucketRepos(output.github || {});
  const bucketChanges = getBucketChanges(previousRepos, currentRepos);

  const lines = [
    '## Metadata Refresh Summary',
    '',
    `- Generated at: ${output.generated_at}`,
    `- GitHub repos tracked: ${currentRepos.length}`,
    `- Robotics repos: ${output.github.buckets?.robotics?.count || 0}`,
    `- Software repos: ${output.github.buckets?.software?.count || 0}`,
    `- Featured Bilibili videos: ${(output.bilibili.featured_videos || []).length}`,
    '',
    '### Source Status',
    '',
    '| Source | Result | Detail |',
    '| --- | --- | --- |',
    statusRows || '| - | - | - |',
    '',
    '### Repo Bucket Changes',
    '',
  ];

  if (bucketChanges.length) {
    lines.push(...bucketChanges.map((item) => `- ${item}`));
  } else {
    lines.push('- No repo bucket changes.');
  }

  await writeFile(summaryPath, `${lines.join('\n')}\n`);
}

async function mapWithConcurrency(items, worker, concurrency = 4) {
  const results = new Array(items.length);
  let cursor = 0;

  async function runWorker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker());
  await Promise.all(workers);
  return results;
}

async function getGithubRepo(fullName) {
  const repo = (await fetchJson(`https://api.github.com/repos/${fullName}`)).data;
  const languages = (await fetchJson(`https://api.github.com/repos/${fullName}/languages`)).data;

  return {
    url: repo.html_url,
    full_name: repo.full_name,
    description: repo.description,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    created_at: repo.created_at,
    updated_at: repo.updated_at,
    pushed_at: repo.pushed_at,
    homepage: repo.homepage,
    topics: repo.topics || [],
    top_languages: topLanguages(languages),
    language_stats: languageStats(languages),
  };
}

function selectRepoDetail(repo) {
  if (!repo) return null;
  return {
    url: repo.url,
    full_name: repo.full_name,
    description: repo.description,
    stars: repo.stars,
    forks: repo.forks,
    created_at: repo.created_at,
    updated_at: repo.updated_at,
    pushed_at: repo.pushed_at,
    homepage: repo.homepage,
    topics: repo.topics || [],
    top_languages: repo.top_languages || [],
    language_stats: repo.language_stats || [],
  };
}

function selectVideoInfo(video) {
  if (!video) return null;
  return {
    url: video.url,
    bvid: video.bvid,
    title: video.title,
    description: video.description,
    cover_image: video.cover_image,
    pubdate: video.pubdate,
    stat: video.stat
      ? {
          view: video.stat.view,
          like: video.stat.like,
          reply: video.stat.reply,
          favorite: video.stat.favorite,
          coin: video.stat.coin,
          share: video.stat.share,
        }
      : null,
  };
}

async function getBilibiliVideo(bvid) {
  const api = `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`;
  const result = (await fetchJson(api)).data;
  const info = result.data;

  return {
    url: `https://www.bilibili.com/video/${bvid}/`,
    bvid,
    title: info.title,
    description: info.desc,
    cover_image: info.pic || null,
    pubdate: info.pubdate,
    stat: {
      view: info.stat?.view || 0,
      like: info.stat?.like || 0,
      reply: info.stat?.reply || 0,
      favorite: info.stat?.favorite || 0,
      coin: info.stat?.coin || 0,
      share: info.stat?.share || 0,
    },
  };
}

async function fetchBilibiliSeries(bvids, previousList = []) {
  const previousById = new Map((previousList || []).map((item) => [item.bvid, item]));
  const videos = [];

  for (const bvid of bvids) {
    const video = selectVideoInfo(
      await withFallback(
        `bilibili series video ${bvid}`,
        () => getBilibiliVideo(bvid),
        previousById.get(bvid) || null
      )
    );
    if (video) {
      videos.push(video);
    }
  }

  return videos;
}

async function downloadBilibiliCoverImages(videos) {
  await mkdir(`${PUBLIC_IMAGE_ROOT}/portfolio`, { recursive: true });

  const coverMap = {};
  for (let i = 0; i < videos.length; i += 1) {
    const video = videos[i];
    if (!video?.cover_image) continue;

    const path = `${PUBLIC_IMAGE_ROOT}/portfolio/bilibili-series-${String(i + 1).padStart(2, '0')}.jpg`;
    try {
      const content = await downloadBinary(video.cover_image.replace(/^http:\/\//, 'https://'));
      await writeFile(path, content);
      coverMap[video.bvid] = path.replace(/^public/, '');
    } catch (error) {
      console.warn(`[warn] bilibili cover ${video.bvid}: ${error.message}`);
    }
  }

  return coverMap;
}

async function downloadPrimaryBilibiliCover(video, previousPath = null) {
  if (!video?.cover_image) {
    return previousPath || null;
  }

  await mkdir(`${PUBLIC_IMAGE_ROOT}/portfolio`, { recursive: true });
  const path = `${PUBLIC_IMAGE_ROOT}/portfolio/bilibili-primary.jpg`;

  try {
    const content = await downloadBinary(String(video.cover_image).replace(/^http:\/\//, 'https://'));
    await writeFile(path, content);
    return path.replace(/^public/, '');
  } catch (error) {
    console.warn(`[warn] bilibili primary cover: ${error.message}`);
    return previousPath || null;
  }
}

function extractReadmeExcerpt(markdown, max = 220) {
  const text = String(markdown || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/__([^_\n]+)__/g, '$1')
    .replace(/_([^_\n]+)_/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/\r/g, '');

  const paragraph = text
    .split(/\n{2,}/)
    .map((line) => line.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .find((line) => line.length >= 35) || null;

  if (!paragraph) return null;
  if (paragraph.length <= max) return paragraph;
  return `${paragraph.slice(0, max - 1)}…`;
}

function resolveReadmeImageUrl(raw, downloadUrl, fullName) {
  if (!raw) return null;
  const clean = String(raw).trim().replace(/^<|>$/g, '').split(/\s+/)[0];
  if (!clean) return null;

  if (/^https?:\/\//i.test(clean)) return clean;
  if (clean.startsWith('//')) return `https:${clean}`;

  const basePrefix = downloadUrl ? downloadUrl.replace(/[^/]*$/, '') : null;
  if (basePrefix) {
    const normalized = clean.startsWith('/') ? `.${clean}` : clean;
    try {
      return new URL(normalized, basePrefix).toString();
    } catch {
      // keep fallback below
    }
  }

  return `https://raw.githubusercontent.com/${fullName}/HEAD/${clean.replace(/^\/+/, '')}`;
}

function extractReadmeImage(markdown, downloadUrl, fullName) {
  const match = String(markdown || '').match(/!\[[^\]]*]\(([^)\n]+)\)/);
  if (!match?.[1]) return null;
  return resolveReadmeImageUrl(match[1], downloadUrl, fullName);
}

function extensionFromContentType(contentType) {
  const type = String(contentType || '').toLowerCase();
  if (type.includes('image/png')) return 'png';
  if (type.includes('image/jpeg')) return 'jpg';
  if (type.includes('image/webp')) return 'webp';
  if (type.includes('image/gif')) return 'gif';
  if (type.includes('image/svg')) return 'svg';
  return null;
}

function extensionFromUrl(url) {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    const match = pathname.match(/\.([a-z0-9]+)$/);
    if (!match?.[1]) return null;
    const ext = match[1];
    if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) {
      return ext === 'jpeg' ? 'jpg' : ext;
    }
  } catch {
    return null;
  }
  return null;
}

function isMirrorableRepoPreview(url, contentType = '') {
  const ext = extensionFromContentType(contentType) || extensionFromUrl(url);
  return ext ? ext !== 'svg' : true;
}

async function mirrorRepoPreviewImages(repoSummaries, previousSummaries = []) {
  await mkdir(`${PUBLIC_IMAGE_ROOT}/repos`, { recursive: true });

  const previousMap = new Map((previousSummaries || []).map((repo) => [repo.full_name, repo]));
  const mirrored = new Map();

  const candidates = (repoSummaries || [])
    .filter((repo) => repo?.full_name && repo?.readme_image)
    .sort((a, b) => {
      const aTs = new Date(a.pushed_at || a.updated_at || 0).getTime();
      const bTs = new Date(b.pushed_at || b.updated_at || 0).getTime();
      return bTs - aTs;
    })
    .slice(0, 30);

  await mapWithConcurrency(candidates, async (repo) => {
    const previousRepo = previousMap.get(repo.full_name) || null;
    const fallbackLocal =
      previousRepo?.readme_image_local && !String(previousRepo.readme_image_local).toLowerCase().endsWith('.svg')
        ? previousRepo.readme_image_local
        : null;
    try {
      const { buffer, contentType } = await downloadBinaryWithMeta(repo.readme_image);
      if (!isMirrorableRepoPreview(repo.readme_image, contentType)) {
        mirrored.set(repo.full_name, null);
        return;
      }
      const ext = extensionFromContentType(contentType) || extensionFromUrl(repo.readme_image) || 'png';
      const safeName = repo.full_name.replace('/', '__');
      const path = `${PUBLIC_IMAGE_ROOT}/repos/${safeName}.${ext}`;
      await writeFile(path, buffer);
      mirrored.set(repo.full_name, path.replace(/^public/, ''));
    } catch (error) {
      console.warn(`[warn] repo preview ${repo.full_name}: ${error.message}`);
      if (fallbackLocal) {
        mirrored.set(repo.full_name, fallbackLocal);
      }
    }
  });

  return repoSummaries.map((repo) => {
    if (!repo?.full_name) return repo;
    const previousLocal = previousMap.get(repo.full_name)?.readme_image_local || null;
    const safePreviousLocal = previousLocal && !String(previousLocal).toLowerCase().endsWith('.svg') ? previousLocal : null;
    const local = mirrored.has(repo.full_name) ? mirrored.get(repo.full_name) : safePreviousLocal;
    return {
      ...repo,
      readme_image_local: local || null,
    };
  });
}

async function pruneRepoPreviewImages(repoSummaries) {
  const repoDir = `${PUBLIC_IMAGE_ROOT}/repos`;
  const keep = new Set(
    (repoSummaries || [])
      .map((repo) => String(repo?.readme_image_local || '').replace(/^\/assets\/images\/repos\//, ''))
      .filter(Boolean)
  );

  let files = [];
  try {
    files = await readdir(repoDir);
  } catch {
    return;
  }

  await Promise.all(
    files
      .filter((file) => !keep.has(file))
      .map((file) => unlink(`${repoDir}/${file}`).catch(() => {}))
  );
}

async function getGithubReadmeInfo(fullName) {
  const res = await fetchJson(`https://api.github.com/repos/${fullName}/readme`);
  const info = res.data;

  let markdown = '';
  if (info.encoding === 'base64' && info.content) {
    markdown = Buffer.from(info.content, 'base64').toString('utf-8');
  } else if (info.download_url) {
    const rawPage = await fetchText(info.download_url);
    markdown = rawPage.text || '';
  }

  const excerpt = extractReadmeExcerpt(markdown);
  const image = extractReadmeImage(markdown, info.download_url || null, fullName);

  return {
    excerpt,
    image,
  };
}

async function enrichRepoSummariesWithReadme(repoSummaries, previousSummaries = []) {
  const previousMap = new Map((previousSummaries || []).map((repo) => [repo.full_name, repo]));
  const targetsForReadme = (repoSummaries || [])
    .filter((repo) => repo?.full_name)
    .sort((a, b) => {
      const aTs = new Date(a.pushed_at || a.updated_at || 0).getTime();
      const bTs = new Date(b.pushed_at || b.updated_at || 0).getTime();
      return bTs - aTs;
    })
    .slice(0, 40);

  const targetSet = new Set(targetsForReadme.map((repo) => repo.full_name));

  const enrichedMap = new Map();
  await mapWithConcurrency(targetsForReadme, async (repo) => {
    const previousRepo = previousMap.get(repo.full_name) || null;
    const fallbackImage = previousRepo?.readme_image || `https://opengraph.githubassets.com/1/${repo.full_name}`;
    const readme = await withFallback(
      `github readme ${repo.full_name}`,
      () => getGithubReadmeInfo(repo.full_name),
      {
        excerpt: previousRepo?.readme_excerpt || null,
        image: fallbackImage,
      }
    );

    enrichedMap.set(repo.full_name, {
      readme_excerpt: repo.description || readme?.excerpt || previousRepo?.readme_excerpt || null,
      readme_image: readme?.image || fallbackImage,
    });
  });

  return repoSummaries.map((repo) => {
    if (!repo?.full_name || !targetSet.has(repo.full_name)) {
      return repo;
    }
    const extra = enrichedMap.get(repo.full_name);
    return extra ? { ...repo, ...extra } : repo;
  });
}

async function main() {
  const targets = await loadTargetsConfig();
  const home = await loadHomeConfig();
  const previous = await readExistingOutput();

  const roboticsSectionUrls = Array.isArray(targets.sections?.robotics) ? targets.sections.robotics : [];
  const softwareSectionUrls = Array.isArray(targets.sections?.software) ? targets.sections.software : [];
  const musicSectionUrls = Array.isArray(targets.sections?.music) ? targets.sections.music : [];
  const homepageExternalUrls = unique(
    (Array.isArray(home.selectedWork) ? home.selectedWork : [])
      .map((item) => String(item?.href || '').trim())
      .filter((href) => /^https?:\/\//i.test(href))
  );

  const githubRepos = unique(
    [...roboticsSectionUrls, ...softwareSectionUrls, ...musicSectionUrls, ...homepageExternalUrls]
      .map((item) => extractGithubRepoFromUrl(item))
  );
  configuredRepoBuckets = {
    robotics: new Set(unique(roboticsSectionUrls.map((item) => extractGithubRepoFromUrl(item)))),
    software: new Set(unique(softwareSectionUrls.map((item) => extractGithubRepoFromUrl(item)))),
  };

  const bilibiliFeaturedBvids = unique(
    [...roboticsSectionUrls, ...homepageExternalUrls].map((item) => extractBvidFromUrl(item))
  );
  const bilibiliVideoBvid = unique(
    [...musicSectionUrls, ...homepageExternalUrls].map((item) => extractBvidFromUrl(item))
  )[0] || '';

  const output = {
    generated_at: new Date().toISOString(),
    github: {
      repos: {},
      buckets: {
        robotics: { count: 0, total_stars: 0, recent: [] },
        software: { count: 0, total_stars: 0, recent: [] },
      },
    },
    bilibili: {
      video: null,
      video_cover_local: null,
      featured_videos: [],
      featured_cover_images: {},
    },
  };
  const previousRepoSummaries = flattenBucketRepos(previous?.github || {});

  const chosenRepos = await mapWithConcurrency(githubRepos, async (fullName) => {
    const detail = selectRepoDetail(
      await withFallback(
        `github repo ${fullName}`,
        () => getGithubRepo(fullName),
        previous?.github?.repos?.[fullName] || null
      )
    );
    output.github.repos[fullName] = detail;

    if (!detail) {
      const fallbackSummary = previousRepoSummaries.find((repo) => repo?.full_name === fullName);
      return fallbackSummary || null;
    }

    return buildRepoSummary({
      url: detail.url,
      full_name: detail.full_name,
      name: detail.full_name?.split('/')[1] || fullName.split('/')[1] || fullName,
      description: detail.description,
      stars: detail.stars,
      forks: detail.forks,
      language: detail.top_languages?.[0] || null,
      topics: detail.topics || [],
      created_at: detail.created_at,
      updated_at: detail.updated_at,
      pushed_at: detail.pushed_at,
      homepage: detail.homepage || '',
      top_languages: detail.top_languages || [],
      language_stats: detail.language_stats || []
    });
  });

  const targetRepos = chosenRepos.filter(Boolean);
  const enrichedRepos = await enrichRepoSummariesWithReadme(targetRepos, previousRepoSummaries);
  const mirroredRepos = await mirrorRepoPreviewImages(enrichedRepos, previousRepoSummaries);
  await pruneRepoPreviewImages(mirroredRepos);

  output.github.buckets = buildRepoBuckets(mirroredRepos);

  output.bilibili.video = selectVideoInfo(
    bilibiliVideoBvid
      ? await withFallback(
          'bilibili video',
          () => getBilibiliVideo(bilibiliVideoBvid),
          previous?.bilibili?.video || null
        )
      : null
  );

  output.bilibili.featured_videos = await fetchBilibiliSeries(
    bilibiliFeaturedBvids,
    previous?.bilibili?.featured_videos || []
  );
  output.bilibili.featured_cover_images = await downloadBilibiliCoverImages(output.bilibili.featured_videos);
  output.bilibili.video_cover_local = await downloadPrimaryBilibiliCover(
    output.bilibili.video,
    previous?.bilibili?.video_cover_local || null
  );

  await writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2));
  await writeGithubStepSummary(output, previous);
  console.log(`Wrote ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

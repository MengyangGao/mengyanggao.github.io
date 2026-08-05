import { readFileSync } from 'node:fs';
import path from 'node:path';
import { validateContentJsonBundle } from './content-schema.js';
import { readHomeMarkdownFile } from './home-content-source.js';

export type SiteProfile = {
  name: LocalizedText;
  location: LocalizedText;
  email: string;
  avatar: string;
};

export type SiteFooter = {
  signature: LocalizedText;
  copyrightYear: number;
  ownerUrl: string;
  sourceCodeLabel: LocalizedText;
  sourceCodeUrl: string;
};

export type SiteSeo = {
  defaultDescription: string;
  homeDescription: string;
  blogDescription: string;
  roboticsDescription: string;
  softwareDescription: string;
  musicDescription: string;
  archivesDescription: string;
  wechatDescription: string;
};

export type SitePages = {
  seo: SiteSeo;
  comments: SiteComments & {
    title: LocalizedText;
    hint: LocalizedText;
  };
  blogIndex: {
    heroTitle: LocalizedText;
    heroDescription: LocalizedText;
  };
  blogPost: {
    publishedAtLabel: LocalizedText;
    modifiedAtLabel: LocalizedText;
    alsoAtLabel: LocalizedText;
    readTime: LocalizedText;
  };
  roboticsIndex: {
    heroTitle: LocalizedText;
    heroDescription: LocalizedText;
    itemsTitle: LocalizedText;
  };
  softwareIndex: {
    heroTitle: LocalizedText;
    heroDescription: LocalizedText;
    itemsTitle: LocalizedText;
  };
  musicIndex: {
    heroTitle: LocalizedText;
    heroDescription: LocalizedText;
    itemsTitle: LocalizedText;
  };
  archivesIndex: {
    heroTitle: LocalizedText;
    heroDescription: LocalizedText;
  };
  contact: {
    wechatTitle: LocalizedText;
    wechatAlt: LocalizedText;
  };
};

export type SiteComments = {
  enabled: boolean;
  provider: 'giscus';
  repo: string;
  repoId: string;
  category: string;
  categoryId: string;
  mapping: 'pathname' | 'url' | 'title' | 'og:title' | 'specific';
  term?: string;
  strict: '0' | '1';
  reactionsEnabled: '0' | '1';
  emitMetadata: '0' | '1';
  inputPosition: 'top' | 'bottom';
  lang: string;
  themeLight: string;
  themeDark: string;
};

export type SiteContent = {
  siteName: string;
  profile: SiteProfile;
  interests: {
    en: string[];
    zhHans: string[];
    zhHant: string[];
  };
  contact: {
    wechatQr: string;
  };
  footer: SiteFooter;
  seo: SiteSeo;
  comments: SiteComments;
  socialLinks: SocialLink[];
  linkTargets: {
    sections: Record<string, string[]>;
  };
  pages: SitePages;
};

export type SocialLink = {
  id: string;
  label: string;
  href: string;
};

export type HomeContent = {
  about: {
    en: string;
    zhHans: string;
    zhHant: string;
  };
  interestsTitle: LocalizedText;
  selectedWorkTitle: LocalizedText;
  sectionOrder: Array<'blog' | 'robotics' | 'software' | 'music'>;
  navigation: Array<{
    key: 'home' | 'blog' | 'robotics' | 'software' | 'music' | 'archives';
    href: string;
    labels: {
      en: string;
      zhHans: string;
      zhHant: string;
    };
    external?: boolean;
  }>;
  socialRows: string[][];
  selectedWork: Array<{
    tag: LocalizedText | null;
    title: LocalizedText | null;
    href: string;
    external: boolean;
    resources: Array<{
      label: string;
      href: string;
    }>;
  }>;
};

export type LocalizedText = {
  en: string;
  zhHans: string;
  zhHant: string;
};

const CONTENT_DIR = path.resolve(process.cwd(), process.env.SITE_CONTENT_DIR || 'content');
const CONTENT_ASSET_PREFIX = '/assets/content';
type ValidatedContentBundle = ReturnType<typeof validateContentJsonBundle>;

let cachedBundle: ValidatedContentBundle | null = null;
let cachedSiteContent: SiteContent | null = null;
let cachedHomeContent: HomeContent | null = null;

const sitePath = (...segments: string[]) => path.join(CONTENT_DIR, ...segments);

function readJsonFile<T>(...segments: string[]): T {
  const filePath = sitePath(...segments);
  return JSON.parse(readFileSync(filePath, 'utf-8')) as T;
}

function loadValidatedBundle() {
  return validateContentJsonBundle({
    home: readHomeMarkdownFile(sitePath('home', 'home.md')),
    pages: readJsonFile('pages', 'pages.json'),
  });
}

function getValidatedBundle() {
  if (!cachedBundle) {
    cachedBundle = loadValidatedBundle();
  }
  return cachedBundle;
}

function trimOrEmpty(value?: string | null) {
  return String(value || '').trim();
}

function normalizeLocalizedText(value: unknown, fallback = ''): LocalizedText {
  if (typeof value === 'string') {
    const text = trimOrEmpty(value) || fallback;
    return {
      en: text,
      zhHans: text,
      zhHant: text,
    };
  }

  const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const en = trimOrEmpty(record.en as string | null | undefined);
  const legacyZh = trimOrEmpty(record.zh as string | null | undefined);
  const zhHans = trimOrEmpty(record.zhHans as string | null | undefined) || legacyZh;
  const zhHant = trimOrEmpty(record.zhHant as string | null | undefined) || legacyZh;
  const resolvedEn = en || zhHans || zhHant || fallback;
  const resolvedZhHans = zhHans || zhHant || en || fallback;
  const resolvedZhHant = zhHant || zhHans || en || fallback;
  return {
    en: resolvedEn,
    zhHans: resolvedZhHans,
    zhHant: resolvedZhHant,
  };
}

function normalizeParagraphList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || '').trim()).filter(Boolean);
}

function deriveSiteName(nameEn: string, nameZh: string) {
  if (nameEn && nameZh && nameEn !== nameZh) return `${nameEn} ${nameZh}`;
  return nameEn || nameZh || '';
}

function normalizeNavigationHref(href: string) {
  if (/^https?:\/\//i.test(href)) return href;
  const trimmed = href.replace(/^\/+|\/+$/g, '');
  return trimmed ? `/${trimmed}/` : '';
}

export function resolveContentAssetPath(value?: string | null) {
  if (!value) return null;
  if (/^(https?:)?\/\//i.test(value) || value.startsWith('/')) {
    return value;
  }
  return `${CONTENT_ASSET_PREFIX}/${String(value).replace(/^\/+/, '')}`;
}

export function getSiteContent(): SiteContent {
  if (cachedSiteContent) return cachedSiteContent;

  const { home, pages } = getValidatedBundle();
  const nameEn = trimOrEmpty(home.profile?.name?.en);
  const nameZhHans = trimOrEmpty(home.profile?.name?.zhHans);
  const nameZhHant = trimOrEmpty(home.profile?.name?.zhHant);
  const siteName = deriveSiteName(nameEn, nameZhHans || nameZhHant);
  cachedSiteContent = {
    siteName,
    profile: {
      ...home.profile,
      name: {
        en: nameEn,
        zhHans: nameZhHans,
        zhHant: nameZhHant,
      },
      location: {
        en: trimOrEmpty(home.profile?.location?.en) || 'Hong Kong',
        zhHans: trimOrEmpty(home.profile?.location?.zhHans) || '中国香港',
        zhHant: trimOrEmpty(home.profile?.location?.zhHant) || '中國香港',
      },
      avatar: resolveContentAssetPath(home.profile.avatar) || home.profile.avatar,
    },
    contact: {
      wechatQr: resolveContentAssetPath(home.contact.wechatQr) || '',
    },
    interests: {
      en: normalizeParagraphList(home.interests?.en),
      zhHans: normalizeParagraphList(home.interests?.zhHans),
      zhHant: normalizeParagraphList(home.interests?.zhHant),
    },
    footer: {
      signature: normalizeLocalizedText(home.footer.signature),
      copyrightYear: home.footer.copyrightYear,
      ownerUrl: home.footer.ownerUrl,
      sourceCodeLabel: normalizeLocalizedText(home.footer.sourceCodeLabel),
      sourceCodeUrl: home.footer.sourceCodeUrl,
    },
    comments: {
      enabled: Boolean(pages.comments?.enabled),
      provider: 'giscus',
      repo: trimOrEmpty(pages.comments?.repo),
      repoId: trimOrEmpty(pages.comments?.repoId),
      category: trimOrEmpty(pages.comments?.category) || 'General',
      categoryId: trimOrEmpty(pages.comments?.categoryId),
      mapping: (trimOrEmpty(pages.comments?.mapping) as SiteComments['mapping']) || 'pathname',
      term: trimOrEmpty(pages.comments?.term),
      strict: trimOrEmpty(pages.comments?.strict) === '1' ? '1' : '0',
      reactionsEnabled: trimOrEmpty(pages.comments?.reactionsEnabled) === '0' ? '0' : '1',
      emitMetadata: trimOrEmpty(pages.comments?.emitMetadata) === '1' ? '1' : '0',
      inputPosition: trimOrEmpty(pages.comments?.inputPosition) === 'bottom' ? 'bottom' : 'top',
      lang: trimOrEmpty(pages.comments?.lang) || 'zh-CN',
      themeLight: trimOrEmpty(pages.comments?.themeLight) || 'light',
      themeDark: trimOrEmpty(pages.comments?.themeDark) || 'dark',
    },
    seo: pages.seo,
    socialLinks: Array.isArray(home.socialLinks)
      ? home.socialLinks.filter(
          (item) =>
            Boolean(String(item.id || '').trim()) &&
            Boolean(String(item.label || '').trim()) &&
            Boolean(String(item.href || '').trim())
        )
      : [],
    linkTargets: {
      sections: home.linkTargets?.sections || {},
    },
    pages,
  };
  return cachedSiteContent;
}

export function getSocialLinks(): SocialLink[] {
  return getSiteContent().socialLinks;
}

export function getHomeContent(): HomeContent {
  if (cachedHomeContent) return cachedHomeContent;

  const { home } = getValidatedBundle();
  const allowed = new Set(['blog', 'robotics', 'software', 'music']);
  const builtinMap = {
    home: { key: 'home', href: '/', labels: { en: 'Home', zhHans: '主页', zhHant: '主頁' } },
    blog: { key: 'blog', href: '/blog/', labels: { en: 'Blog', zhHans: '博客', zhHant: '博客' } },
    robotics: { key: 'robotics', href: '/robotics/', labels: { en: 'Robotics', zhHans: '机器人', zhHant: '機器人' } },
    software: { key: 'software', href: '/software/', labels: { en: 'Software', zhHans: '软件', zhHant: '軟體' } },
    music: { key: 'music', href: '/music/', labels: { en: 'Music', zhHans: '音乐', zhHant: '音樂' } },
    archives: { key: 'archives', href: '/archives/', labels: { en: 'Archives', zhHans: '归档', zhHant: '歸檔' } }
  } as const;
  const normalizedSections = (home.sectionOrder || []).filter(
    (item): item is HomeContent['sectionOrder'][number] => allowed.has(item)
  );
  const fallbackNavigation = [
    builtinMap.home,
    ...normalizedSections.map((item) => builtinMap[item]),
    builtinMap.archives
  ];
  const normalizedNavigation: HomeContent['navigation'] = Array.isArray(home.navigation)
    ? home.navigation
        .map((item) => {
          const key = String(item?.key || '').trim();
          const href = normalizeNavigationHref(String(item?.href || '').trim());
          const labels = normalizeLocalizedText(item?.labels);
          if (!key || !href || !labels.en || !labels.zhHans || !labels.zhHant) return null;
          return {
            key,
            href,
            labels,
            external: /^https?:\/\//i.test(href)
          };
        })
        .filter(Boolean) as HomeContent['navigation']
    : [];
  const normalizedSelectedWork: HomeContent['selectedWork'] = Array.isArray(home.selectedWork)
    ? home.selectedWork
        .map((item) => {
          const href = normalizeNavigationHref(String(item?.href || '').trim());
          const tag = item?.tag ? normalizeLocalizedText(item.tag) : null;
          const title = item?.title ? normalizeLocalizedText(item.title) : null;
          if (!href) return null;
          return {
            href,
            tag,
            title,
            external: /^https?:\/\//i.test(href),
            resources: Object.entries(item.resources || {})
              .map(([label, resourceHref]) => ({
                label: String(label).trim(),
                href: String(resourceHref || '').trim(),
              }))
              .filter((resource) => resource.label && resource.href),
          };
        })
        .filter((item): item is HomeContent['selectedWork'][number] => Boolean(item))
    : [];
  cachedHomeContent = {
    ...home,
    about: {
      en: trimOrEmpty(home.about?.en),
      zhHans: trimOrEmpty(home.about?.zhHans),
      zhHant: trimOrEmpty(home.about?.zhHant),
    },
    interestsTitle: normalizeLocalizedText(home.interestsTitle),
    selectedWorkTitle: normalizeLocalizedText(home.selectedWorkTitle),
    sectionOrder: normalizedSections,
    navigation: normalizedNavigation.length ? normalizedNavigation : fallbackNavigation,
    socialRows: (home.socialRows || []).map((row) => row.filter(Boolean)).filter((row) => row.length > 0),
    selectedWork: normalizedSelectedWork,
  };
  return cachedHomeContent;
}

export function getTargetSectionUrls(section: string) {
  const targets = getSiteContent().linkTargets;
  const raw = targets.sections?.[section];
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => String(item).trim()).filter(Boolean);
}

export function getEnabledSections() {
  return getHomeContent().sectionOrder;
}

export function getSocialRows() {
  const home = getHomeContent();
  const socials = getSocialLinks();
  const socialMap = new Map(socials.map((item) => [item.id, item]));
  const configuredRows = home.socialRows
    .map((row) => row.map((id) => socialMap.get(id)).filter((item): item is SocialLink => Boolean(item)))
    .filter((row) => row.length > 0);
  if (configuredRows.length > 0) return configuredRows;

  const fallbackRows: SocialLink[][] = [];
  for (let i = 0; i < socials.length; i += 3) {
    fallbackRows.push(socials.slice(i, i + 3));
  }
  return fallbackRows;
}

export function getSameAsLinks() {
  return getSocialLinks()
    .map((item) => item.href)
    .filter((href) => href.startsWith('http'));
}

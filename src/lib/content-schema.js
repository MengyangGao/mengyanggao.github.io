import { z } from 'zod';

const normalizeLocalizedInput = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const record = { ...value };
  if (record.zh && !record.zhHans) record.zhHans = record.zh;
  if (record.zh && !record.zhHant) record.zhHant = record.zh;
  delete record.zh;
  return record;
};

const localizedRequired = z.preprocess(normalizeLocalizedInput, z.object({
  en: z.string().trim().min(1),
  zhHans: z.string().trim().min(1),
  zhHant: z.string().trim().min(1),
}));

const localizedOptional = z.preprocess(normalizeLocalizedInput, z.object({
  en: z.string().trim().optional().default(''),
  zhHans: z.string().trim().optional().default(''),
  zhHant: z.string().trim().optional().default(''),
}));

const localizedText = localizedRequired;
const localizedMarkdown = z.preprocess(normalizeLocalizedInput, z.object({
  en: z.string().trim().min(1),
  zhHans: z.string().trim().min(1),
  zhHant: z.string().trim().min(1),
}).strict());

const localizedTextValue = z.union([
  localizedRequired,
  z.string().trim().min(1),
]);

const sectionKey = z.enum(['blog', 'robotics', 'software', 'music']);
const navigationKey = z.enum(['home', 'blog', 'robotics', 'software', 'music', 'archives']);
const navigationRoutes = {
  home: '/',
  blog: '/blog/',
  robotics: '/robotics/',
  software: '/software/',
  music: '/music/',
  archives: '/archives/',
};

const absoluteOrRootPath = z.string().trim().refine((value) => /^https?:\/\//i.test(value) || value.startsWith('/'), {
  message: 'Must be an absolute URL or root-relative path',
});

const contentAssetOrUrl = z.string().trim().refine((value) => {
  return !value || /^(https?:)?\/\//i.test(value) || value.startsWith('/') || !value.startsWith('..');
}, {
  message: 'Must be a content asset path, absolute URL, or root-relative path',
});

export const socialLinksJsonSchema = z.array(z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
  href: absoluteOrRootPath,
}).strict());

export const linkTargetsJsonSchema = z.object({
  sections: z.record(z.string().trim().min(1), z.array(z.string().trim().pipe(z.url())).default([])).default({}),
}).strict();

const commentsJsonSchema = z.object({
  enabled: z.boolean().default(false),
  provider: z.literal('giscus').default('giscus'),
  repo: z.string().trim().optional().default(''),
  repoId: z.string().trim().optional().default(''),
  category: z.string().trim().optional().default('General'),
  categoryId: z.string().trim().optional().default(''),
  mapping: z.enum(['pathname', 'url', 'title', 'og:title', 'specific']).default('pathname'),
  term: z.string().trim().optional().default(''),
  strict: z.enum(['0', '1']).default('0'),
  reactionsEnabled: z.enum(['0', '1']).default('1'),
  emitMetadata: z.enum(['0', '1']).default('0'),
  inputPosition: z.enum(['top', 'bottom']).default('top'),
  lang: z.string().trim().optional().default('zh-CN'),
  themeLight: z.string().trim().optional().default('light'),
  themeDark: z.string().trim().optional().default('dark'),
  title: localizedText,
  hint: localizedText,
}).strict();

const pagesJsonSchema = z.object({
  seo: z.object({
    defaultDescription: z.string().trim().min(1),
    homeDescription: z.string().trim().min(1),
    blogDescription: z.string().trim().min(1),
    roboticsDescription: z.string().trim().min(1),
    softwareDescription: z.string().trim().min(1),
    musicDescription: z.string().trim().min(1),
    archivesDescription: z.string().trim().min(1),
    wechatDescription: z.string().trim().min(1),
  }).strict(),
  comments: commentsJsonSchema,
  blogIndex: z.object({
    heroTitle: localizedText,
    heroDescription: localizedText,
  }).strict(),
  blogPost: z.object({
    publishedAtLabel: localizedText,
    modifiedAtLabel: localizedText,
    alsoAtLabel: localizedText,
    readTime: localizedText,
  }).strict(),
  roboticsIndex: z.object({
    heroTitle: localizedText,
    heroDescription: localizedText,
    itemsTitle: localizedText,
  }).strict(),
  softwareIndex: z.object({
    heroTitle: localizedText,
    heroDescription: localizedText,
    itemsTitle: localizedText,
  }).strict(),
  musicIndex: z.object({
    heroTitle: localizedText,
    heroDescription: localizedText,
    itemsTitle: localizedText,
  }).strict(),
  archivesIndex: z.object({
    heroTitle: localizedText,
    heroDescription: localizedOptional,
  }).strict(),
  contact: z.object({
    wechatTitle: localizedText,
    wechatAlt: localizedText,
  }).strict(),
}).strict();

export const homeJsonSchema = z.object({
  profile: z.object({
    name: localizedRequired,
    location: localizedOptional.optional().default({}),
    email: z.string().trim().pipe(z.email()),
    avatar: contentAssetOrUrl.optional().default(''),
  }),
  interests: z.object({
    en: z.array(z.string().trim().min(1)).default([]),
    zhHans: z.array(z.string().trim().min(1)).default([]),
    zhHant: z.array(z.string().trim().min(1)).default([]),
  }).optional().default({}),
  about: localizedMarkdown,
  interestsTitle: localizedText,
  selectedWorkTitle: localizedText,
  contact: z.object({
    wechatQr: z.string().trim().optional().default(''),
  }).optional().default({}),
  footer: z.object({
    signature: localizedTextValue,
    copyrightYear: z.coerce.number().int().min(2000).max(2100),
    ownerUrl: absoluteOrRootPath,
    sourceCodeLabel: localizedTextValue,
    sourceCodeUrl: absoluteOrRootPath,
  }),
  socialLinks: socialLinksJsonSchema.default([]),
  linkTargets: linkTargetsJsonSchema.default({}),
  sectionOrder: z.array(sectionKey).default([]),
  navigation: z.array(z.object({
    key: navigationKey,
    href: absoluteOrRootPath.or(z.string().trim().regex(/^\/.*\/?$/, 'Must be an internal path or absolute URL')),
    labels: localizedRequired,
    external: z.boolean().optional(),
  }).strict()).default([]),
  socialRows: z.array(z.array(z.string().trim().min(1))).default([]),
  selectedWork: z.array(z.object({
    tag: localizedTextValue.optional(),
    title: localizedTextValue.optional(),
    href: absoluteOrRootPath.or(z.string().trim().regex(/^\/.*\/?$/, 'Must be an internal path or absolute URL')),
    resources: z.record(z.string().trim().min(1), absoluteOrRootPath).optional().default({}),
  }).strict()).default([]),
}).strict();

export function validateContentJsonBundle(bundle) {
  const home = homeJsonSchema.parse(bundle.home);
  const pages = pagesJsonSchema.parse(bundle.pages);

  const socialIds = new Set();
  for (const item of home.socialLinks) {
    if (socialIds.has(item.id)) {
      throw new Error(`Duplicate social id: ${item.id}`);
    }
    socialIds.add(item.id);
  }

  const sectionIds = new Set();
  for (const id of home.sectionOrder) {
    if (sectionIds.has(id)) {
      throw new Error(`Duplicate home section id: ${id}`);
    }
    sectionIds.add(id);
  }

  const navKeys = new Set();
  const navHrefs = new Set();
  for (const item of home.navigation) {
    if (navKeys.has(item.key)) {
      throw new Error(`Duplicate navigation key: ${item.key}`);
    }
    navKeys.add(item.key);
    if (navHrefs.has(item.href)) {
      throw new Error(`Duplicate navigation href: ${item.href}`);
    }
    navHrefs.add(item.href);
    if (!item.external && item.href !== navigationRoutes[item.key]) {
      throw new Error(`navigation.${item.key} must point to ${navigationRoutes[item.key]}`);
    }
  }

  for (const id of home.sectionOrder) {
    if (!navKeys.has(id)) {
      throw new Error(`sectionOrder references missing navigation key: ${id}`);
    }
  }

  for (const row of home.socialRows) {
    for (const id of row) {
      if (!socialIds.has(id)) {
        throw new Error(`socialRows references unknown social id: ${id}`);
      }
    }
  }

  const selectedWorkHrefs = new Set();
  for (const item of home.selectedWork) {
    if (!String(item.href || '').trim()) {
      throw new Error('selectedWork item must include href');
    }
    if (selectedWorkHrefs.has(item.href)) {
      throw new Error(`Duplicate selectedWork href: ${item.href}`);
    }
    selectedWorkHrefs.add(item.href);
  }

  const allowedTargetSections = new Set(['robotics', 'software', 'music']);
  for (const section of Object.keys(home.linkTargets.sections)) {
    if (!allowedTargetSections.has(section)) {
      throw new Error(`linkTargets contains unsupported section: ${section}`);
    }
  }

  if (pages.comments.enabled) {
    for (const field of ['repo', 'repoId', 'categoryId']) {
      if (!String(pages.comments[field] || '').trim()) {
        throw new Error(`comments.${field} is required when comments.enabled is true`);
      }
    }
  }

  return { home, pages };
}

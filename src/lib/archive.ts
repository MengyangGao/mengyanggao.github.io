import { getEnabledSections } from './site-content';
import { getMetadata, getPrimaryMusicVideo, getRoboticsRepos, getRoboticsVideos, getSoftwareRepos } from './metadata';
import type { LocalizedText } from './site-content';
import { resolveTitle } from './localized-text';

export type ArchiveType =
  | 'blog-local'
  | 'robotics-repo'
  | 'software-repo'
  | 'robotics-video'
  | 'music-video';

export type ArchiveItem = {
  title: string;
  description: string;
  url: string;
  external: boolean;
  type: ArchiveType;
  sectionLabel: LocalizedText;
  tags: string[];
  timestamp: number;
  dateLabel: string;
};

type LocalPostLike = {
  id: string;
  data: {
    title_en: string;
    title_zh: string;
    summary?: string;
    url?: string;
    publish_date: Date;
    modify_date?: Date;
    tags?: string[];
  };
};

const toTimestamp = (value?: string | number | Date | null) => {
  if (!value) return 0;
  if (typeof value === 'number') {
    return value > 1e12 ? value : value * 1000;
  }
  const ts = Date.parse(String(value));
  return Number.isNaN(ts) ? 0 : ts;
};

const normalizeTag = (value: string) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-');

const formatDateLabel = (timestamp: number) => {
  if (!timestamp) return '-';
  return new Date(timestamp).toISOString().slice(0, 10);
};

const getSectionLabel = (type: ArchiveType): LocalizedText => {
  switch (type) {
    case 'blog-local':
      return { en: 'Blog', zhHans: '博客', zhHant: '博客' };
    case 'robotics-repo':
    case 'robotics-video':
      return { en: 'Robotics', zhHans: '机器人', zhHant: '機器人' };
    case 'software-repo':
      return { en: 'Software', zhHans: '软件', zhHant: '軟體' };
    case 'music-video':
      return { en: 'Music', zhHans: '音乐', zhHant: '音樂' };
  }
};

export function buildArchiveItems(localPosts: LocalPostLike[] = [], metadata = getMetadata()): ArchiveItem[] {
  const enabledSections = new Set(getEnabledSections());
  const localItems: ArchiveItem[] = enabledSections.has('blog') ? localPosts.map((post) => {
    const ts = (post.data.modify_date || post.data.publish_date).getTime();
    const title = resolveTitle(post.data, 'zhHans');
    return {
      title,
      description: String(post.data.summary || '').trim(),
      url: `/blog/${post.id.replace(/\.md$/, '')}/`,
      external: false,
      type: 'blog-local',
      sectionLabel: getSectionLabel('blog-local'),
      tags: Array.from(new Set(['blog', 'local', ...(post.data.tags || []).map(normalizeTag)])).filter(Boolean),
      timestamp: ts,
      dateLabel: formatDateLabel(ts)
    };
  }) : [];

  const repoItems: ArchiveItem[] = [
    ...(enabledSections.has('robotics') ? getRoboticsRepos(metadata).map((repo: any) => ({ repo, type: 'robotics-repo' as ArchiveType })) : []),
    ...(enabledSections.has('software') ? getSoftwareRepos(metadata).map((repo: any) => ({ repo, type: 'software-repo' as ArchiveType })) : [])
  ].map(({ repo, type }) => {
    const ts = toTimestamp(repo.pushed_at || repo.updated_at);
    const repoTags = [
      'github',
      'repo',
      type === 'robotics-repo' ? 'robotics' : 'software',
      repo.language ? normalizeTag(repo.language) : ''
    ];
    return {
      title: repo.full_name || repo.name || '-',
      description: repo.readme_excerpt || repo.description || '',
      url: repo.url || '#',
      external: true,
      type,
      sectionLabel: getSectionLabel(type),
      tags: Array.from(new Set(repoTags.map(normalizeTag))).filter(Boolean),
      timestamp: ts,
      dateLabel: formatDateLabel(ts)
    };
  });

  const featuredVideos = enabledSections.has('robotics') ? getRoboticsVideos(metadata) : [];
  const primaryVideo = enabledSections.has('music') ? [getPrimaryMusicVideo(metadata)].filter(Boolean) : [];
  const videoMap = new Map<string, any>();
  for (const video of [...primaryVideo, ...featuredVideos]) {
    if (!video) continue;
    const key = video.bvid || video.url || video.title;
    if (!key || videoMap.has(key)) continue;
    videoMap.set(key, video);
  }

  const primaryBvid = metadata?.bilibili?.video?.bvid || null;
  const videoItems: ArchiveItem[] = Array.from(videoMap.values()).map((video: any) => {
    const ts = toTimestamp(video.pubdate || null);
    const isMusic = primaryBvid && video.bvid === primaryBvid;
    return {
      title: video.title || '-',
      description: video.description || '',
      url: video.url || '#',
      external: true,
      type: isMusic ? 'music-video' : 'robotics-video',
      sectionLabel: getSectionLabel(isMusic ? 'music-video' : 'robotics-video'),
      tags: isMusic ? ['music', 'video', 'bilibili'] : ['robotics', 'video', 'bilibili'],
      timestamp: ts,
      dateLabel: formatDateLabel(ts)
    };
  });

  return [...localItems, ...repoItems, ...videoItems].sort((a, b) => {
    if (b.timestamp !== a.timestamp) return b.timestamp - a.timestamp;
    return a.title.localeCompare(b.title);
  });
}

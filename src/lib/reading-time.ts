const CJK_RE = /[\u3400-\u9fff]/g;
const LATIN_WORD_RE = /[A-Za-z0-9_]+/g;

function stripMarkdown(markdown: string) {
  return String(markdown || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function estimateReadingMinutes(markdown: string) {
  const text = stripMarkdown(markdown);
  if (!text) return 1;

  const cjkCount = (text.match(CJK_RE) || []).length;
  const latinWords = (text.match(LATIN_WORD_RE) || []).length;
  const minutes = cjkCount / 320 + latinWords / 220;
  return Math.max(1, Math.ceil(minutes));
}

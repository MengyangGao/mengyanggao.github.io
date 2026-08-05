import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

const FRONTMATTER_PATTERN = /^---\s*\n([\s\S]*?)\n---(?:\s*\n|$)/;
const LANGUAGE_HEADING_PATTERN = /^##\s+(en|zhHans|zhHant)\s*$/gm;

function parseAboutSections(body, sourceLabel) {
  const matches = [...body.matchAll(LANGUAGE_HEADING_PATTERN)];
  const about = { en: '', zhHans: '', zhHant: '' };

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const language = match[1];
    const start = match.index + match[0].length;
    const end = matches[index + 1]?.index ?? body.length;
    about[language] = body.slice(start, end).trim();
  }

  for (const language of Object.keys(about)) {
    if (!about[language]) {
      throw new Error(`${sourceLabel} must include a non-empty \"## ${language}\" section`);
    }
  }

  return about;
}

export function parseHomeMarkdown(source, sourceLabel = 'home.md') {
  const frontmatter = source.match(FRONTMATTER_PATTERN);
  if (!frontmatter) {
    throw new Error(`${sourceLabel} must start with YAML frontmatter`);
  }

  const config = parse(frontmatter[1]);
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error(`${sourceLabel} frontmatter must be a YAML object`);
  }

  return {
    ...config,
    about: parseAboutSections(source.slice(frontmatter[0].length), sourceLabel),
  };
}

export function readHomeMarkdownFile(filePath) {
  return parseHomeMarkdown(readFileSync(filePath, 'utf8'), filePath);
}

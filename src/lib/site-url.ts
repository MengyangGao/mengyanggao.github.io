const FALLBACK_SITE_ORIGIN = import.meta.env.PUBLIC_SITE_URL || (import.meta.env.PROD
  ? 'https://gaomengyang.com'
  : 'http://localhost:4321');

export function getFallbackSite() {
  return new URL(FALLBACK_SITE_ORIGIN);
}

export function resolveSite(site?: URL) {
  return site ?? getFallbackSite();
}

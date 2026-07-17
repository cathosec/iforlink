export function getFaviconUrl(url: string, size = 64): string | null {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return `https://www.google.com/s2/favicons?sz=${size}&domain=${u.hostname}`;
  } catch {
    return null;
  }
}

export function normalizeUrl(url: string): string {
  if (!url) return url;
  return url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
}

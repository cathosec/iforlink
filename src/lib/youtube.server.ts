export interface YouTubeChannelInfo {
  id: string;
  title: string;
  handle: string;
  avatar: string;
  subscribers: number;
  hiddenSubscribers: boolean;
  url: string;
}

const cache = new Map<string, { at: number; value: YouTubeChannelInfo | null }>();
const TTL_MS = 1000 * 60 * 60 * 24;

function parseHandle(raw: string): string | null {
  const v = (raw || "").trim();
  if (!v) return null;
  try {
    if (/^https?:\/\//i.test(v)) {
      const u = new URL(v);
      const seg = u.pathname.split("/").filter(Boolean);
      if (seg[0]?.startsWith("@")) return seg[0].slice(1);
      if (seg[0] === "channel" && seg[1]) return `__id__:${seg[1]}`;
      if (seg[0] === "c" && seg[1]) return seg[1];
      if (seg[0] === "user" && seg[1]) return seg[1];
    }
  } catch {}
  return v.replace(/^@/, "").replace(/\/+$/, "");
}

async function fetchChannel(apiKey: string, handle: string): Promise<YouTubeChannelInfo | null> {
  let url: string;
  if (handle.startsWith("__id__:")) {
    const id = handle.slice(7);
    url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${encodeURIComponent(id)}&key=${apiKey}`;
  } else {
    url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forHandle=@${encodeURIComponent(handle)}&key=${apiKey}`;
  }
  const res = await fetch(url);
  if (!res.ok) return null;
  const json: any = await res.json();
  const item = json?.items?.[0];
  if (!item) return null;
  const th = item.snippet?.thumbnails ?? {};
  const avatar = th.high?.url || th.medium?.url || th.default?.url || "";
  return {
    id: item.id,
    title: item.snippet?.title || "",
    handle: item.snippet?.customUrl?.replace(/^@/, "") || handle.replace(/^__id__:/, ""),
    avatar,
    subscribers: Number(item.statistics?.subscriberCount || 0),
    hiddenSubscribers: Boolean(item.statistics?.hiddenSubscriberCount),
    url: item.snippet?.customUrl
      ? `https://youtube.com/${item.snippet.customUrl.startsWith("@") ? item.snippet.customUrl : "@" + item.snippet.customUrl}`
      : `https://youtube.com/channel/${item.id}`,
  };
}

export async function resolveYouTubeChannelImpl(raw: string): Promise<YouTubeChannelInfo | null> {
  const handle = parseHandle(raw);
  if (!handle) return null;
  const cached = cache.get(handle);
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return null;
  try {
    const info = await fetchChannel(apiKey, handle);
    cache.set(handle, { at: Date.now(), value: info });
    return info;
  } catch {
    return null;
  }
}

import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Youtube } from "lucide-react";
import { resolveYouTubeChannel } from "@/lib/youtube.functions";

function formatSubs(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(".0", "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1).replace(".0", "")} mil`;
  return String(n);
}

export function YouTubeChannelCard({
  raw,
  onClick,
}: {
  raw: string;
  onClick?: () => void;
}) {
  const fn = useServerFn(resolveYouTubeChannel);
  const q = useQuery({
    queryKey: ["yt-channel", raw],
    queryFn: () => fn({ data: { raw } }),
    staleTime: 1000 * 60 * 60,
    retry: false,
  });

  const c = q.data?.channel;
  if (!c) return null;

  return (
    <a
      href={c.url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      onClick={onClick}
      className="group flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-red-500/40 hover:shadow-md"
    >
      <div className="relative shrink-0">
        {c.avatar ? (
          <img
            src={c.avatar}
            alt={c.title}
            loading="lazy"
            className="h-12 w-12 rounded-full object-cover"
          />
        ) : (
          <div className="grid h-12 w-12 place-items-center rounded-full bg-red-600 text-white">
            <Youtube className="h-6 w-6" />
          </div>
        )}
        <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full bg-red-600 text-white ring-2 ring-card">
          <Youtube className="h-3 w-3" />
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{c.title}</div>
        <div className="truncate text-[11px] text-muted-foreground">
          @{c.handle}
          {!c.hiddenSubscribers && c.subscribers > 0 && (
            <span> · {formatSubs(c.subscribers)} inscritos</span>
          )}
        </div>
      </div>
      <span className="shrink-0 rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors group-hover:bg-red-700">
        Inscrever-se
      </span>
    </a>
  );
}

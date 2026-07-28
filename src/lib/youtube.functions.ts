import { createServerFn } from "@tanstack/react-start";
import { resolveYouTubeChannelImpl, type YouTubeChannelInfo } from "./youtube.server";

export type { YouTubeChannelInfo };

export const resolveYouTubeChannel = createServerFn({ method: "GET" })
  .validator((input) => {
    if (!input || typeof input !== "object" || !("raw" in input)) {
      return { raw: "" };
    }

    const raw = (input as { raw?: unknown }).raw;
    return { raw: typeof raw === "string" ? raw : "" };
  })
  .handler(async ({ data }): Promise<{ channel: YouTubeChannelInfo | null }> => {
    try {
      const channel = await resolveYouTubeChannelImpl(data.raw);
      return { channel };
    } catch (err) {
      console.error("[youtube] resolve failed:", err);
      return { channel: null };
    }
  });

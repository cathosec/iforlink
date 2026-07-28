import { createServerFn } from "@tanstack/react-start";
import { resolveYouTubeChannelImpl, type YouTubeChannelInfo } from "./youtube.server";

export type { YouTubeChannelInfo };

export const resolveYouTubeChannel = createServerFn({ method: "GET" })
  .validator((data: { raw: string }) => data)
  .handler(async ({ data }): Promise<{ channel: YouTubeChannelInfo | null }> => {
    const channel = await resolveYouTubeChannelImpl(data.raw);
    return { channel };
  });

import { createServerFn } from "@tanstack/react-start";
import { resolveYouTubeChannelImpl, type YouTubeChannelInfo } from "./youtube.server";

export type { YouTubeChannelInfo };

export const resolveYouTubeChannel = createServerFn({ method: "GET" })
  .validator((data: { raw: string }) => data)
  .handler(async ({ data }) => {
    return await resolveYouTubeChannelImpl(data.raw);
  });

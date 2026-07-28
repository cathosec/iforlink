/**
 * Gzip helper via CompressionStream (Chromium/Safari/FF ≥113).
 * Fallback: retorna null (o caller envia sem compressão).
 */
export async function gzipString(input: string): Promise<Uint8Array | null> {
  try {
    if (typeof CompressionStream === "undefined") return null;
    const stream = new Blob([input]).stream().pipeThrough(new CompressionStream("gzip"));
    const buf = await new Response(stream).arrayBuffer();
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

export const GZIP_MIN_BYTES = 1024;

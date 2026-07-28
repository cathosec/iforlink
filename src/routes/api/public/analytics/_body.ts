/**
 * Lê o body da request; decompacta gzip transparentemente se Content-Encoding: gzip.
 * Retorna null se exceder maxBytes.
 */
export async function readMaybeGzip(request: Request, maxBytes: number): Promise<string | null> {
  const enc = request.headers.get("content-encoding")?.toLowerCase();
  if (enc === "gzip" && typeof DecompressionStream !== "undefined" && request.body) {
    const stream = request.body.pipeThrough(new DecompressionStream("gzip"));
    const buf = await new Response(stream).arrayBuffer();
    if (buf.byteLength > maxBytes) return null;
    return new TextDecoder().decode(buf);
  }
  const text = await request.text();
  if (text.length > maxBytes) return null;
  return text;
}

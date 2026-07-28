/**
 * Web Worker: serializa + comprime payloads de analytics fora da main thread.
 * Mensagem: { id: string, payload: unknown, gzip: boolean }
 * Retorno:  { id, body: string | Uint8Array, encoding?: "gzip" }
 */
/// <reference lib="webworker" />

type InMsg = { id: string; payload: unknown; gzip?: boolean };
type OutMsg =
  | { id: string; body: string; encoding?: undefined }
  | { id: string; body: ArrayBuffer; encoding: "gzip" };

async function gzip(str: string): Promise<ArrayBuffer | null> {
  try {
    if (typeof CompressionStream === "undefined") return null;
    const stream = new Blob([str]).stream().pipeThrough(new CompressionStream("gzip"));
    return await new Response(stream).arrayBuffer();
  } catch {
    return null;
  }
}

self.onmessage = async (ev: MessageEvent<InMsg>) => {
  const { id, payload, gzip: wantGzip } = ev.data;
  const body = JSON.stringify(payload);
  if (wantGzip && body.length >= 1024) {
    const buf = await gzip(body);
    if (buf) {
      (self as unknown as Worker).postMessage(
        { id, body: buf, encoding: "gzip" } satisfies OutMsg,
        [buf],
      );
      return;
    }
  }
  (self as unknown as Worker).postMessage({ id, body } satisfies OutMsg);
};

export {};

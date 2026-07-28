/**
 * Cliente do Web Worker de ingest. Fallback para main-thread se worker não puder ser criado.
 */
import { gzipString, GZIP_MIN_BYTES } from "./compress";

type PreparedBody =
  | { body: string; encoding?: undefined }
  | { body: Uint8Array; encoding: "gzip" };

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<string, (r: PreparedBody) => void>();
let disabled = false;

function ensureWorker(): Worker | null {
  if (disabled) return null;
  if (worker) return worker;
  if (typeof Worker === "undefined") return null;
  try {
    worker = new Worker(new URL("./ingest.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (ev: MessageEvent) => {
      const { id, body, encoding } = ev.data ?? {};
      const cb = pending.get(id);
      if (!cb) return;
      pending.delete(id);
      if (encoding === "gzip") cb({ body: new Uint8Array(body as ArrayBuffer), encoding: "gzip" });
      else cb({ body: body as string });
    };
    worker.onerror = () => { disabled = true; worker?.terminate(); worker = null; };
    return worker;
  } catch {
    disabled = true;
    return null;
  }
}

export async function prepareBody(payload: unknown, opts: { gzip?: boolean } = {}): Promise<PreparedBody> {
  const wantGzip = opts.gzip !== false;
  const w = ensureWorker();
  if (w) {
    return new Promise((resolve) => {
      const id = String(++seq);
      pending.set(id, resolve);
      w.postMessage({ id, payload, gzip: wantGzip });
    });
  }
  // Fallback main-thread
  const body = JSON.stringify(payload);
  if (wantGzip && body.length >= GZIP_MIN_BYTES) {
    const buf = await gzipString(body);
    if (buf) return { body: buf, encoding: "gzip" };
  }
  return { body };
}

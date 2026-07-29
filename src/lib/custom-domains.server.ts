/**
 * Wrapper server-only para a API Custom Hostnames do Cloudflare (SSL for SaaS).
 * NUNCA importar deste arquivo direto em rotas/componentes — usar dinamicamente
 * dentro de handlers de server functions/routes.
 *
 * Requer as secrets:
 *   CF_API_TOKEN — token com escopo "SSL: Custom Hostnames — Edit" + "Zone: Zone — Read"
 *   CF_ZONE_ID   — id da zona forlink.app
 *
 * Docs: https://developers.cloudflare.com/api/operations/custom-hostname-for-a-zone-create-custom-hostname
 */

const CF_API = "https://api.cloudflare.com/client/v4";

interface CfEnvelope<T> {
  success: boolean;
  errors?: Array<{ code: number; message: string }>;
  result?: T;
}

interface CfCustomHostname {
  id: string;
  hostname: string;
  status?: string;
  ssl?: {
    status?: string;
    method?: string;
    type?: string;
    validation_records?: Array<{ txt_name?: string; txt_value?: string; http_url?: string; http_body?: string }>;
    validation_errors?: Array<{ message: string }>;
  };
  ownership_verification?: { type?: string; name?: string; value?: string };
  ownership_verification_http?: { http_url?: string; http_body?: string };
  verification_errors?: string[];
}

function cfCredentials() {
  const token = (process.env.CF_API_TOKEN ?? "").trim();
  const zone = (process.env.CF_ZONE_ID ?? "").trim();
  if (!token || !zone) {
    throw new Error(
      "Cloudflare para SaaS não configurado no servidor (CF_API_TOKEN / CF_ZONE_ID ausentes).",
    );
  }
  return { token, zone };
}

async function cfFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { token } = cfCredentials();
  const res = await fetch(`${CF_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const body = (await res.json().catch(() => ({}))) as CfEnvelope<T>;
  if (!res.ok || !body.success) {
    const msg = body.errors?.map((e) => `${e.code}: ${e.message}`).join("; ") || `HTTP ${res.status}`;
    throw new Error(`Cloudflare API: ${msg}`);
  }
  return body.result as T;
}

/** Cria um Custom Hostname no CF for SaaS. */
export async function cfCreateCustomHostname(hostname: string): Promise<CfCustomHostname> {
  const { zone } = cfCredentials();
  return cfFetch<CfCustomHostname>(`/zones/${zone}/custom_hostnames`, {
    method: "POST",
    body: JSON.stringify({
      hostname,
      ssl: { method: "http", type: "dv", settings: { min_tls_version: "1.2" } },
    }),
  });
}

/** Consulta o status atual de um Custom Hostname. */
export async function cfGetCustomHostname(id: string): Promise<CfCustomHostname> {
  const { zone } = cfCredentials();
  return cfFetch<CfCustomHostname>(`/zones/${zone}/custom_hostnames/${id}`, { method: "GET" });
}

/** Remove um Custom Hostname (usar quando o usuário desconectar). */
export async function cfDeleteCustomHostname(id: string): Promise<void> {
  const { zone } = cfCredentials();
  await cfFetch<{ id: string }>(`/zones/${zone}/custom_hostnames/${id}`, { method: "DELETE" });
}

/**
 * Traduz o payload do CF para o par de status usados na tabela `custom_domains`.
 * Regras:
 *  - status "active" só quando CF reporta hostname active E SSL active
 *  - qualquer erro de validação → failed
 *  - hostname existe mas SSL ainda pendente → pending_ssl
 *  - default → pending_dns
 */
export function mapCfStatus(cf: CfCustomHostname): {
  status: "pending_dns" | "pending_ssl" | "active" | "failed";
  ssl_status: string | null;
  last_error: string | null;
  ownership: Record<string, unknown>;
} {
  const hostStatus = cf.status ?? "pending";
  const sslStatus = cf.ssl?.status ?? null;
  const sslErrs = cf.ssl?.validation_errors?.map((e) => e.message).join("; ");
  const hostErrs = cf.verification_errors?.join("; ");
  const lastError = sslErrs || hostErrs || null;

  let status: "pending_dns" | "pending_ssl" | "active" | "failed";
  if (hostStatus === "active" && sslStatus === "active") status = "active";
  else if (sslStatus === "pending_validation" || sslStatus === "pending_issuance" || sslStatus === "pending_deployment")
    status = "pending_ssl";
  else if (hostStatus === "moved" || sslStatus === "expired" || hostStatus === "deleted") status = "failed";
  else status = "pending_dns";

  const ownership: Record<string, unknown> = {};
  if (cf.ownership_verification?.name) ownership.txt = cf.ownership_verification;
  if (cf.ownership_verification_http?.http_url) ownership.http = cf.ownership_verification_http;
  if (cf.ssl?.validation_records?.length) ownership.ssl_validation = cf.ssl.validation_records;

  return { status, ssl_status: sslStatus, last_error: lastError, ownership };
}

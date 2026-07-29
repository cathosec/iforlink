import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Lista os domínios personalizados do usuário logado.
 */
export const listMyCustomDomains = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("custom_domains")
      .select("id,hostname,mode,path_prefix,status,ssl_status,ownership_verification,last_error,last_synced_at,created_at")
      .neq("status", "removed")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { domains: data ?? [] };
  });

/**
 * Cria um novo domínio personalizado (Pro/admin) e registra no Cloudflare.
 * Retorna o registro criado, já com as instruções DNS de ownership.
 */
export const createMyCustomDomain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { hostname: string; mode?: "root" | "subpath"; path_prefix?: string | null }) => input)
  .handler(async ({ context, data }) => {
    const hostname = (data.hostname ?? "").trim().toLowerCase();
    if (!hostname) throw new Error("Informe um domínio válido.");

    // Cria linha (trigger valida role Pro/admin, limite e formato)
    const { data: row, error: insErr } = await context.supabase
      .from("custom_domains")
      .insert({
        user_id: context.userId,
        hostname,
        mode: data.mode ?? "root",
        path_prefix: data.path_prefix ?? null,
      } as never)
      .select("id,hostname,mode,path_prefix,status")
      .single();
    if (insErr || !row) throw new Error(insErr?.message ?? "Falha ao criar domínio.");

    // Registra no Cloudflare
    try {
      const { cfCreateCustomHostname, mapCfStatus } = await import("./custom-domains.server");
      const cf = await cfCreateCustomHostname(hostname);
      const mapped = mapCfStatus(cf);

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.rpc("update_custom_domain_status", {
        _id: row.id,
        _status: mapped.status,
        _ssl_status: mapped.ssl_status,
        _ownership_verification: mapped.ownership as never,
        _cf_id: cf.id,
        _last_error: mapped.last_error,
      });

      return { id: row.id, hostname, cf_id: cf.id, ...mapped };
    } catch (cfErr) {
      const msg = cfErr instanceof Error ? cfErr.message : "erro desconhecido";
      // marca como failed mas mantém a linha para o usuário ver o erro
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.rpc("update_custom_domain_status", {
        _id: row.id,
        _status: "failed",
        _ssl_status: undefined,
        _ownership_verification: undefined,
        _cf_id: undefined,
        _last_error: msg,
      });
      throw new Error(`Domínio criado, mas Cloudflare recusou: ${msg}`);
    }
  });

/**
 * Reconsulta o Cloudflare e atualiza o status local.
 */
export const refreshCustomDomain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("custom_domains")
      .select("id,cf_custom_hostname_id,user_id")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !row) throw new Error("Domínio não encontrado.");
    if (!row.cf_custom_hostname_id) throw new Error("Domínio ainda não registrado no Cloudflare.");

    const { cfGetCustomHostname, mapCfStatus } = await import("./custom-domains.server");
    const cf = await cfGetCustomHostname(row.cf_custom_hostname_id);
    const mapped = mapCfStatus(cf);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.rpc("update_custom_domain_status", {
      _id: row.id,
      _status: mapped.status,
      _ssl_status: mapped.ssl_status,
      _ownership_verification: mapped.ownership as never,
      _cf_id: cf.id,
      _last_error: mapped.last_error,
    });

    return mapped;
  });

/**
 * Remove o domínio: apaga no Cloudflare e marca como removido.
 */
export const deleteMyCustomDomain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("custom_domains")
      .select("id,cf_custom_hostname_id")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !row) throw new Error("Domínio não encontrado.");

    if (row.cf_custom_hostname_id) {
      try {
        const { cfDeleteCustomHostname } = await import("./custom-domains.server");
        await cfDeleteCustomHostname(row.cf_custom_hostname_id);
      } catch {
        // segue mesmo se CF já não tiver o hostname
      }
    }

    const { error: delErr } = await context.supabase
      .from("custom_domains")
      .delete()
      .eq("id", row.id);
    if (delErr) throw new Error(delErr.message);
    return { ok: true };
  });

/**
 * Admin: lista todos os domínios (visão do painel /admin).
 */
export const adminListCustomDomains = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("admin_list_custom_domains", { _limit: 200 });
    if (error) throw new Error(error.message);
    return { domains: data ?? [] };
  });

/**
 * Sanitização de PII para eventos e props personalizadas do ForLink Analytics.
 * Mascaramos e-mails, telefones, CPF/CNPJ, cartões e tokens/JWT.
 */

const EMAIL_RE = /[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/gi;
// 11 a 16 dígitos contíguos (com hífens/espaços) — cartões, CPF, CNPJ, telefones longos
const LONG_DIGIT_RE = /\b(?:\d[ .\-]?){11,19}\b/g;
// Sequências longas base64/hex (tokens)
const TOKEN_RE = /\b(?:[A-Za-z0-9+/_\-]{28,})\b/g;
// JWT completo (3 segmentos separados por ponto)
const JWT_RE = /\beyJ[A-Za-z0-9_\-]+?\.[A-Za-z0-9_\-]+?\.[A-Za-z0-9_\-]+?\b/g;
// Chaves suspeitas em objetos
const SENSITIVE_KEY_RE = /password|passwd|senha|cpf|cnpj|rg|card|cartao|cvv|cvc|token|secret|api[_-]?key|authorization|bearer/i;

export function scrubText(input: string, max = 300): string {
  if (!input) return input;
  let out = input.slice(0, max);
  out = out.replace(JWT_RE, "[jwt]");
  out = out.replace(EMAIL_RE, "[email]");
  out = out.replace(LONG_DIGIT_RE, "[number]");
  out = out.replace(TOKEN_RE, (m) => (m.length >= 40 ? "[token]" : m));
  return out;
}

/** Sanitiza recursivamente valores num objeto de props personalizadas. */
export function scrubProps(input: unknown, depth = 0): unknown {
  if (depth > 4) return "[…]";
  if (input == null) return input;
  if (typeof input === "string") return scrubText(input);
  if (typeof input === "number" || typeof input === "boolean") return input;
  if (Array.isArray(input)) return input.slice(0, 50).map((v) => scrubProps(v, depth + 1));
  if (typeof input === "object") {
    const out: Record<string, unknown> = {};
    let n = 0;
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (n++ >= 50) break;
      if (SENSITIVE_KEY_RE.test(k)) {
        out[k] = "[redacted]";
        continue;
      }
      out[k] = scrubProps(v, depth + 1);
    }
    return out;
  }
  return null;
}

/** Verifica se um elemento deve ser considerado sensível (respeita opt-in de proteção). */
export function isSensitiveElement(el: Element | null): boolean {
  if (!el) return false;
  return !!el.closest(
    'input, textarea, select, [contenteditable="true"], [data-forlink-sensitive], .forlink-mask, .forlink-block',
  );
}

/**
 * Camada de domínio: cálculo de taxas de campanhas.
 *
 * Módulo puro. Sem I/O, sem dependências. Importado tanto pelo checkout (browser)
 * quanto pelas server functions — fonte única de verdade da matemática de taxas.
 *
 * Regras:
 *  - `feeForLink` = comissão da plataforma (percentual sobre `baseCents`, com mínimo).
 *  - `feeMp` = tarifa estimada do Mercado Pago (percentual + fixo).
 *  - Quando `passToSupporter=true` o apoiador paga tudo e o criador recebe
 *    exatamente `baseCents`. Resolvemos:
 *        total = ceil((base + feeForLink + mpFixed) / (1 - mpPct/100))
 *  - Quando `passToSupporter=false` o total cobrado é `baseCents`; ambas as
 *    taxas são deduzidas do repasse ao criador.
 */

export type ComputeCampaignFeesInput = {
  baseCents: number;          // valor "de doação" desejado pelo apoiador
  feePct: number;             // % ForLink (ex: 2 = 2%)
  minFeeCents: number;        // piso da comissão ForLink em centavos
  mpPct: number;              // % Mercado Pago (ex: 0.99 ou 4.98)
  mpFixedCents?: number;      // parcela fixa MP (usada em cartão)
  passToSupporter: boolean;   // criador repassa taxas ao apoiador
};

export type ComputeCampaignFeesResult = {
  base: number;               // valor de doação original
  total: number;              // valor efetivamente cobrado do apoiador
  feeForLink: number;         // comissão ForLink em centavos
  feeMp: number;              // tarifa MP estimada em centavos
  netCreator: number;         // repasse líquido ao criador em centavos
  addedToSupporter: number;   // quanto o apoiador paga a mais quando passToSupporter=true
};

const EMPTY: ComputeCampaignFeesResult = {
  base: 0, total: 0, feeForLink: 0, feeMp: 0, netCreator: 0, addedToSupporter: 0,
};

export function computeCampaignFees(input: ComputeCampaignFeesInput): ComputeCampaignFeesResult {
  const base = Math.max(0, Math.floor(input.baseCents || 0));
  if (base <= 0) return EMPTY;

  const feePct = Math.max(0, Number(input.feePct || 0));
  const minFee = Math.max(0, Math.floor(input.minFeeCents || 0));
  const mpPct = Math.max(0, Number(input.mpPct || 0));
  const mpFixed = Math.max(0, Math.floor(input.mpFixedCents || 0));

  const feeForLink = Math.max(minFee, Math.round((base * feePct) / 100));

  let total: number;
  let feeMp: number;
  let netCreator: number;
  let addedToSupporter = 0;

  if (input.passToSupporter) {
    const denom = Math.max(0.0001, 1 - mpPct / 100);
    total = Math.ceil((base + feeForLink + mpFixed) / denom);
    feeMp = Math.round((total * mpPct) / 100) + mpFixed;
    netCreator = base;
    addedToSupporter = Math.max(0, total - base);
  } else {
    total = base;
    feeMp = Math.round((base * mpPct) / 100) + mpFixed;
    netCreator = Math.max(0, base - feeForLink - feeMp);
  }

  return { base, total, feeForLink, feeMp, netCreator, addedToSupporter };
}

/** Tarifas MP default quando o admin não configurou explicitamente. */
export const MP_DEFAULT_FEES = {
  pixPct: 0.99,
  cardPct: 4.98,
  cardFixedCents: 0,
} as const;

export function mpFeeForMethod(
  method: "pix" | "card",
  cfg: { mp_fee_pix_percent?: number; mp_fee_card_percent?: number; mp_fee_card_fixed_cents?: number },
): { mpPct: number; mpFixedCents: number } {
  if (method === "card") {
    return {
      mpPct: Number(cfg.mp_fee_card_percent ?? MP_DEFAULT_FEES.cardPct),
      mpFixedCents: Number(cfg.mp_fee_card_fixed_cents ?? MP_DEFAULT_FEES.cardFixedCents),
    };
  }
  return {
    mpPct: Number(cfg.mp_fee_pix_percent ?? MP_DEFAULT_FEES.pixPct),
    mpFixedCents: 0,
  };
}

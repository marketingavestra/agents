export type Pricing = {
  inputPerMTokensUSD: number; // USD per 1M input tokens
  outputPerMTokensUSD: number; // USD per 1M output tokens
};

const toNumber = (v: string | undefined, d: number) => {
  const n = v ? Number(v) : NaN; return Number.isFinite(n) ? n : d;
};

// Defaults based on OpenAI pricing as of 2024-2025 public docs (subject to change).
// Make overridable via env to avoid hard dependency on scraping.
const DEFAULTS: Record<string, Pricing> = {
  'gpt-4o': { inputPerMTokensUSD: 5.0, outputPerMTokensUSD: 15.0 },
  'gpt-4o-mini': { inputPerMTokensUSD: 0.15, outputPerMTokensUSD: 0.60 },
  'gpt-3.5-turbo': { inputPerMTokensUSD: 0.50, outputPerMTokensUSD: 1.50 },
};

export function getPricingForModel(model: string): Pricing {
  const base = DEFAULTS[model] || DEFAULTS['gpt-4o'];
  // Allow overrides per model via env, e.g., PRICING_GPT_4O_IN=5, PRICING_GPT_4O_OUT=15
  const key = model.replace(/[^a-z0-9]/gi, '_').toUpperCase();
  const inUSD = toNumber(process.env[`PRICING_${key}_IN_USD_PER_M`], base.inputPerMTokensUSD);
  const outUSD = toNumber(process.env[`PRICING_${key}_OUT_USD_PER_M`], base.outputPerMTokensUSD);
  return { inputPerMTokensUSD: inUSD, outputPerMTokensUSD: outUSD };
}

export function costCentsFor(model: string, promptTokens: number, completionTokens: number): number {
  const p = getPricingForModel(model);
  const inUSD = (promptTokens / 1_000_000) * p.inputPerMTokensUSD;
  const outUSD = (completionTokens / 1_000_000) * p.outputPerMTokensUSD;
  const totalUSD = inUSD + outUSD;
  return Math.round(totalUSD * 100);
}

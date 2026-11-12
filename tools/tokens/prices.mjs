// The prices that weigh a call of the model, in US dollars per million tokens, by the model's ID:
// base input, cache writes for 5 minutes and for 1 hour, cache hits, and output.
//
// Source: https://platform.claude.com/docs/en/about-claude/pricing, read 2026-11-11 —
// "Claude Opus 5.5 | $4 / MTok | $5 / MTok | $8 / MTok | $0.20 / MTok | $20 / MTok" and
// "Claude Haiku 4.5 | $1 / MTok | $1.25 / MTok | $2 / MTok | $0.10 / MTok | $5 / MTok". The 1M
// context window is "at standard pricing", so a long context changes no price. Fast mode has
// prices of its own, and a call in it is weighed as a model without a price. measurements 1.2
// quotes the same; a new model, or a new price, is a change to both.

export const PRICES = {
  "claude-opus-5-5": { input: 4, write5m: 5, write1h: 8, read: 0.2, output: 20 },
  "claude-haiku-4-5-20251001": { input: 1, write5m: 1.25, write1h: 2, read: 0.1, output: 5 },
};

// What a call cost by its usage, in dollars, or null when its model has no price here or it ran
// in fast mode.
export function costOf(model, usage, prices = PRICES) {
  const price = prices[model];
  if (!price || usage.speed === "fast") return null;
  return (
    (usage.input * price.input + usage.write5m * price.write5m + usage.write1h * price.write1h + usage.read * price.read + usage.output * price.output) /
    1e6
  );
}

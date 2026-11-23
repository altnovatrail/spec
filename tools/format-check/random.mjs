// The module format's generator, a second implementation beside module-kit's by which CI computes
// its test vectors. Every number is a BigInt, so that 64 and 128 bits are exact. It is PCG as Go's
// math/rand/v2 has it, a place of randomness's stream derived as mathtrail-standalone's simulator
// derives it, and each function on a stream draws as many integers as Go's method does.

const WORD = (1n << 64n) - 1n;
const STATE = (1n << 128n) - 1n;
// The LCG step: state · M + C modulo 2^128.
const M = (2549297995355413924n << 64n) | 4865540595714422341n;
const C = (6364136223846793005n << 64n) | 1442695040888963407n;
// The multiplier of the output DXSM.
const CHEAP = 0xda942042e4dd58b5n;
const FNV_OFFSET = 14695981039346656037n;
const FNV_PRIME = 1099511628211n;
export const MAX_UNSIGNED = WORD;
export const MIN_SIGNED = -(1n << 63n);
export const MAX_SIGNED = (1n << 63n) - 1n;

// Started from its two words as they are, unmixed: { integer() }.
export function streamOf(high, low) {
  let state = (high << 64n) | low;
  return {
    integer() {
      state = (state * M + C) & STATE;
      let h = state >> 64n;
      const l = state & WORD;
      h ^= h >> 32n;
      h = (h * CHEAP) & WORD;
      h ^= h >> 48n;
      return (h * (l | 1n)) & WORD;
    },
  };
}

// Over the text's UTF-8 bytes (RFC 9923).
export function fnv1a64(text) {
  let hash = FNV_OFFSET;
  for (const byte of new TextEncoder().encode(text)) hash = ((hash ^ BigInt(byte)) * FNV_PRIME) & WORD;
  return hash;
}

// The two words that start the stream of a place of randomness: FNV-1a of the seed in decimal digits
// and each name after |, and the seed.
export const stateOf = (seed, names) => ({ high: fnv1a64([seed.toString(), ...names].join("|")), low: seed });

// Each function on a stream draws as many integers as Go's method does.
export function below(stream, bound) {
  if ((bound & (bound - 1n)) === 0n) return stream.integer() & (bound - 1n);
  let product = stream.integer() * bound;
  if ((product & WORD) < bound) {
    const threshold = ((1n << 64n) - bound) % bound;
    while ((product & WORD) < threshold) product = stream.integer() * bound;
  }
  return product >> 64n;
}

export const between = (stream, from, to) => from + below(stream, to - from + 1n);

export const fraction = (stream) => Number(stream.integer() & ((1n << 53n) - 1n)) / 2 ** 53;

export function permutation(stream, count) {
  const order = Array.from({ length: count }, (_, i) => i);
  for (let i = count - 1; i > 0; i--) {
    const j = Number(below(stream, BigInt(i + 1)));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

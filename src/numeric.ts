/** Shared finite option normalization; never coerce strings or invalid numbers. */
export const bounded = (value: number | undefined, fallback: number, min: number, max: number) =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, value!)) : fallback;

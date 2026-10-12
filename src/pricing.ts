/** Rounding applies to display equivalents, never to authoritative billed totals. */
export type GlassPriceRounding = 'half-up' | 'floor' | 'ceil';

export interface GlassPriceCurrency {
  /** Host-declared three-letter currency code; no exchange rate or ISO registry lookup. */
  readonly currency: string;
  /** Host-declared minor-unit exponent, 0–3; never inferred from the currency code. */
  readonly exponent: number;
}

export interface GlassFreePrice {
  readonly id: string;
  readonly kind: 'free';
}

export interface GlassContactPrice {
  readonly id: string;
  readonly kind: 'contact-sales';
}

export interface GlassRecurringPrice extends GlassPriceCurrency {
  readonly id: string;
  readonly kind: 'recurring';
  /** Exact charge for the entire stated quantity and billing period, in minor units. */
  readonly totalMinor: number;
  /** Positive whole months, 1–1,200. */
  readonly periodMonths: number;
  /** Host-authored charge unit, for example "seat" or "workspace". */
  readonly unit: string;
  readonly quantity: number;
  /** Explicit identity of included features/limits. Only identical keys can compare. */
  readonly scopeKey: string;
}

export interface GlassUsagePrice extends GlassPriceCurrency {
  readonly id: string;
  readonly kind: 'usage';
  /** Exact rate for one block of perQuantity units, not a projected invoice. */
  readonly rateMinor: number;
  readonly perQuantity: number;
  readonly unit: string;
}

export type GlassPricingOffer = GlassFreePrice | GlassContactPrice | GlassRecurringPrice | GlassUsagePrice;

export interface GlassMoneyDisplay extends GlassPriceCurrency {
  readonly minor: number;
  readonly formatted: string;
}

export interface GlassMonthlyEquivalent extends GlassMoneyDisplay {
  /** The original fraction remains explicit even when the display was rounded. */
  readonly numeratorMinor: number;
  readonly denominatorMonths: number;
  readonly rounded: boolean;
  readonly rounding: GlassPriceRounding;
}

export type GlassResolvedPrice = GlassFreePrice | GlassContactPrice
  | (GlassRecurringPrice & { readonly billingAmount: GlassMoneyDisplay; readonly monthlyEquivalent: GlassMonthlyEquivalent })
  | (GlassUsagePrice & { readonly rate: GlassMoneyDisplay });

export interface GlassPricingSavings extends GlassPriceCurrency {
  readonly selectedId: string;
  readonly baselineId: string;
  /** Least common whole billing period, bounded to 1,200 months. */
  readonly periodMonths: number;
  readonly selectedTotalMinor: number;
  readonly baselineTotalMinor: number;
  readonly savedAmount: GlassMoneyDisplay;
  /** 100 basis points = 1%; rounded half-up from exact invoice totals. */
  readonly percentBasisPoints: number;
  readonly percentageRounded: boolean;
  readonly percentageRounding: 'half-up';
}

export interface GlassPricingOptions {
  /** Required explicit supported locale, shared by server and client. */
  readonly locale: string;
  readonly offers: readonly GlassPricingOffer[];
  /** Default half-up. Exposed on every resolved monthly equivalent. */
  readonly monthlyRounding?: GlassPriceRounding;
}

export interface GlassPricingModel {
  readonly locale: string;
  readonly monthlyRounding: GlassPriceRounding;
  readonly offers: readonly GlassResolvedPrice[];
  /** Unknown ids throw; missing prices are never interpreted as free. */
  resolve(id: string): GlassResolvedPrice;
  /** Null for nonrecurring/incomparable offers, excessive horizon, or no savings. */
  compare(selectedId: string, baselineId: string): GlassPricingSavings | null;
}

const maximumMinor = BigInt(Number.MAX_SAFE_INTEGER);
const maximumMonths = 1200;
const fail = (path: string, reason: string): never => { throw new TypeError(`Invalid glass pricing ${path}: ${reason}`); };

function record(value: unknown, allowed: readonly string[], path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) return fail(path, 'expected a plain object');
  const result: Record<string, unknown> = Object.create(null);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !allowed.includes(key)) return fail(path, 'unknown property');
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
    if (descriptor.get || descriptor.set) return fail(path, 'accessors are not accepted');
    result[key] = descriptor.value;
  }
  return result;
}

function integer(value: unknown, minimum: number, maximum: number, path: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum || value > maximum) return fail(path, `expected a safe integer from ${minimum} to ${maximum}`);
  return value === 0 ? 0 : value;
}

function text(value: unknown, maximum: number, path: string, identifier = false): string {
  if (typeof value !== 'string' || value.length < 1 || value.length > maximum || value.trim() !== value || /[\u0000-\u001f\u007f-\u009f]/.test(value)
    || (identifier && !/^[a-zA-Z0-9][a-zA-Z0-9_.:-]*$/.test(value))) return fail(path, 'expected bounded nonempty text');
  return value;
}

function currency(value: Record<string, unknown>, path: string): GlassPriceCurrency {
  if (typeof value.currency !== 'string' || !/^[a-zA-Z]{3}$/.test(value.currency)) return fail(`${path}.currency`, 'expected a three-letter currency code');
  return { currency: value.currency.toUpperCase(), exponent: integer(value.exponent, 0, 3, `${path}.exponent`) };
}

function normalizeOffer(value: unknown, path: string): GlassPricingOffer {
  const common = ['id', 'kind'];
  const candidate = record(value, [...common, 'currency', 'exponent', 'totalMinor', 'periodMonths', 'unit', 'quantity', 'scopeKey', 'rateMinor', 'perQuantity'], path);
  const id = text(candidate.id, 64, `${path}.id`, true);
  if (candidate.kind === 'free' || candidate.kind === 'contact-sales') {
    record(value, common, path);
    return Object.freeze({ id, kind: candidate.kind });
  }
  if (candidate.kind === 'recurring') {
    record(value, [...common, 'currency', 'exponent', 'totalMinor', 'periodMonths', 'unit', 'quantity', 'scopeKey'], path);
    return Object.freeze({ id, kind: 'recurring', ...currency(candidate, path),
      totalMinor: integer(candidate.totalMinor, 0, Number.MAX_SAFE_INTEGER, `${path}.totalMinor`),
      periodMonths: integer(candidate.periodMonths, 1, maximumMonths, `${path}.periodMonths`),
      unit: text(candidate.unit, 80, `${path}.unit`), quantity: integer(candidate.quantity, 1, Number.MAX_SAFE_INTEGER, `${path}.quantity`),
      scopeKey: text(candidate.scopeKey, 128, `${path}.scopeKey`, true),
    });
  }
  if (candidate.kind === 'usage') {
    record(value, [...common, 'currency', 'exponent', 'rateMinor', 'perQuantity', 'unit'], path);
    return Object.freeze({ id, kind: 'usage', ...currency(candidate, path),
      rateMinor: integer(candidate.rateMinor, 0, Number.MAX_SAFE_INTEGER, `${path}.rateMinor`),
      perQuantity: integer(candidate.perQuantity, 1, Number.MAX_SAFE_INTEGER, `${path}.perQuantity`),
      unit: text(candidate.unit, 80, `${path}.unit`),
    });
  }
  return fail(`${path}.kind`, 'expected free, contact-sales, recurring or usage');
}

function offerList(value: unknown): GlassPricingOffer[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length < 1 || value.length > 64) return fail('offers', 'expected one to 64 offers');
  for (const key of Reflect.ownKeys(value)) {
    if (key !== 'length' && (typeof key !== 'string' || !/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length)) return fail('offers', 'unknown array property');
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
    if (descriptor.get || descriptor.set) return fail('offers', 'accessors are not accepted');
  }
  const ids = new Set<string>();
  return Array.from({ length: value.length }, (_, index) => {
    if (!Object.hasOwn(value, index)) return fail('offers', 'sparse arrays are not accepted');
    const offer = normalizeOffer(value[index], `offers.${index}`);
    if (ids.has(offer.id)) return fail(`offers.${index}.id`, 'expected a unique id');
    ids.add(offer.id); return offer;
  });
}

interface CurrencyFormatter { formatter: Intl.NumberFormat; digits: readonly string[] }
// Bounded shared reuse; locale is part of the key. No formatter is made at import time.
const formatters = new Map<string, CurrencyFormatter>();
function formatterFor(locale: string, money: GlassPriceCurrency): CurrencyFormatter {
  const key = `${locale}|${money.currency}|${money.exponent}`;
  const found = formatters.get(key);
  if (found) return found;
  const digitFormatter = new Intl.NumberFormat(locale, { useGrouping: false, maximumFractionDigits: 0 });
  const created = { formatter: new Intl.NumberFormat(locale, { style: 'currency', currency: money.currency, minimumFractionDigits: money.exponent, maximumFractionDigits: money.exponent }),
    digits: Object.freeze(Array.from({ length: 10 }, (_, digit) => digitFormatter.format(digit))) };
  if (formatters.size === 32) formatters.delete(formatters.keys().next().value!);
  formatters.set(key, created); return created;
}

function display(minor: number, money: GlassPriceCurrency, format: CurrencyFormatter): GlassMoneyDisplay {
  const scale = 10n ** BigInt(money.exponent), amount = BigInt(minor);
  // Never convert the major-unit decimal to a Number: that can lose a minor unit
  // even when the original minor-unit integer was safe. Keep locale affixes/grouping.
  const fraction = (amount % scale).toString().padStart(money.exponent, '0');
  const formatted = format.formatter.formatToParts(amount / scale).map(part => part.type === 'fraction'
    ? [...fraction].map(digit => format.digits[Number(digit)]).join('') : part.value).join('');
  return Object.freeze({ currency: money.currency, exponent: money.exponent, minor, formatted });
}

function roundedDivision(numerator: bigint, denominator: bigint, rounding: GlassPriceRounding): bigint {
  const quotient = numerator / denominator, remainder = numerator % denominator;
  return quotient + (rounding === 'ceil' ? (remainder > 0n ? 1n : 0n) : rounding === 'half-up' && remainder * 2n >= denominator ? 1n : 0n);
}

function safeResult(value: bigint, path: string): number {
  if (value < 0n || value > maximumMinor) throw new RangeError(`Glass pricing ${path} exceeds safe integer minor units`);
  return Number(value);
}

function commonMonths(a: number, b: number): number {
  let x = a, y = b;
  while (y) { const remainder = x % y; x = y; y = remainder; }
  return (a / x) * b;
}

/**
 * Optional, browser-free view model over host-authored offers, not a payment engine.
 * Taxes, setup costs, limits, currency exponent, actual charges and checkout remain
 * host-owned. Free/contact-sales have no invented numeric amount; usage is a rate,
 * not a forecast. Monthly equivalents never reconstruct the invoice total.
 * Comparisons assume the host's explicit scope/unit/quantity identities are truthful
 * and the declared recurring charges repeat over their common whole billing period.
 * Localized strings depend on the runtime's ICU data; use the same locale/ICU on SSR.
 */
export function createGlassPricingModel(input: GlassPricingOptions): GlassPricingModel {
  const config = record(input, ['locale', 'offers', 'monthlyRounding'], 'config');
  const requestedLocale = text(config.locale, 128, 'locale');
  let locale: string;
  try {
    locale = Intl.getCanonicalLocales(requestedLocale)[0];
    if (Intl.NumberFormat.supportedLocalesOf(locale).length !== 1) return fail('locale', 'expected a supported explicit locale');
  } catch { return fail('locale', 'expected a supported explicit locale'); }
  const rounding = config.monthlyRounding === undefined ? 'half-up' : config.monthlyRounding;
  if (rounding !== 'half-up' && rounding !== 'floor' && rounding !== 'ceil') return fail('monthlyRounding', 'expected half-up, floor or ceil');
  const normalized = offerList(config.offers);
  const offers = Object.freeze(normalized.map((offer): GlassResolvedPrice => {
    if (offer.kind === 'free' || offer.kind === 'contact-sales') return offer;
    const format = formatterFor(locale, offer);
    if (offer.kind === 'usage') return Object.freeze({ ...offer, rate: display(offer.rateMinor, offer, format) });
    const numerator = BigInt(offer.totalMinor), denominator = BigInt(offer.periodMonths);
    const equivalent = safeResult(roundedDivision(numerator, denominator, rounding), 'monthly equivalent');
    return Object.freeze({ ...offer, billingAmount: display(offer.totalMinor, offer, format), monthlyEquivalent: Object.freeze({
      ...display(equivalent, offer, format), numeratorMinor: offer.totalMinor, denominatorMonths: offer.periodMonths,
      rounded: numerator % denominator !== 0n, rounding,
    }) });
  }));
  const byId = new Map(offers.map(offer => [offer.id, offer]));
  const resolve = (id: string): GlassResolvedPrice => {
    text(id, 64, 'id', true);
    const offer = byId.get(id);
    if (!offer) throw new RangeError(`Unknown glass pricing offer: ${id}`);
    return offer;
  };
  const compare = (selectedId: string, baselineId: string): GlassPricingSavings | null => {
    const selected = resolve(selectedId), baseline = resolve(baselineId);
    if (selected.kind !== 'recurring' || baseline.kind !== 'recurring' || selected.currency !== baseline.currency || selected.exponent !== baseline.exponent
      || selected.unit !== baseline.unit || selected.quantity !== baseline.quantity || selected.scopeKey !== baseline.scopeKey) return null;
    const periodMonths = commonMonths(selected.periodMonths, baseline.periodMonths);
    if (periodMonths > maximumMonths) return null;
    const selectedTotal = BigInt(selected.totalMinor) * BigInt(periodMonths / selected.periodMonths);
    const baselineTotal = BigInt(baseline.totalMinor) * BigInt(periodMonths / baseline.periodMonths);
    const selectedTotalMinor = safeResult(selectedTotal, 'selected comparison total');
    const baselineTotalMinor = safeResult(baselineTotal, 'baseline comparison total');
    if (selectedTotal >= baselineTotal) return null;
    const saved = baselineTotal - selectedTotal, percentage = saved * 10000n;
    return Object.freeze({ currency: selected.currency, exponent: selected.exponent, selectedId, baselineId, periodMonths,
      selectedTotalMinor, baselineTotalMinor, savedAmount: display(safeResult(saved, 'savings'), selected, formatterFor(locale, selected)),
      percentBasisPoints: Number(roundedDivision(percentage, baselineTotal, 'half-up')),
      percentageRounded: percentage % baselineTotal !== 0n, percentageRounding: 'half-up',
    });
  };
  return Object.freeze({ locale, monthlyRounding: rounding, offers, resolve, compare });
}

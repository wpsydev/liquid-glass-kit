// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createGlassPricingModel } from '../src/pricing.js';
import type { GlassPricingOffer, GlassPricingOptions, GlassRecurringPrice } from '../src/pricing.js';

const recurring = (id = 'monthly', overrides: Partial<GlassRecurringPrice> = {}): GlassRecurringPrice => ({
  id, kind: 'recurring', currency: 'USD', exponent: 2, totalMinor: 2400, periodMonths: 1,
  unit: 'workspace', quantity: 1, scopeKey: 'studio-v1', ...overrides,
});
const model = (offers: readonly GlassPricingOffer[], extra: Partial<GlassPricingOptions> = {}) => createGlassPricingModel({ locale: 'en-US', offers, ...extra });
const unsafe = (input: unknown) => createGlassPricingModel(input as GlassPricingOptions);

describe('exact, SSR-safe pricing view model', () => {
  it('retains authoritative invoice totals rather than rebuilding them from a headline', () => {
    expect(typeof window).toBe('undefined'); expect(typeof document).toBe('undefined');
    const pricing = model([recurring('annual', { totalMinor: 199000, periodMonths: 12 })]);
    const price = pricing.resolve('annual');
    expect(price.kind).toBe('recurring');
    if (price.kind !== 'recurring') throw new Error('Wrong variant');
    expect(price.billingAmount).toEqual({ currency: 'USD', exponent: 2, minor: 199000, formatted: '$1,990.00' });
    expect(price.monthlyEquivalent).toEqual({ currency: 'USD', exponent: 2, minor: 16583, formatted: '$165.83',
      numeratorMinor: 199000, denominatorMonths: 12, rounded: true, rounding: 'half-up' });
    expect(price.monthlyEquivalent.minor * 12).not.toBe(price.totalMinor);
    expect(pricing.resolve('annual')).toEqual(model([recurring('annual', { totalMinor: 199000, periodMonths: 12 })]).resolve('annual'));
  });

  it.each([['floor', 12], ['half-up', 13], ['ceil', 13]] as const)('exposes %s rounding without changing an invoice', (monthlyRounding, minor) => {
    const price = model([recurring('eight-month', { totalMinor: 100, periodMonths: 8 })], { monthlyRounding }).resolve('eight-month');
    if (price.kind !== 'recurring') throw new Error('Wrong variant');
    expect(price.monthlyEquivalent).toMatchObject({ minor, rounding: monthlyRounding, rounded: true, numeratorMinor: 100, denominatorMonths: 8 });
    expect(price.billingAmount.minor).toBe(100);
  });

  it('marks exactly divisible equivalents and keeps a zero recurring charge distinct from free', () => {
    const prices = model([recurring('annual', { totalMinor: 24000, periodMonths: 12 }), recurring('zero', { totalMinor: -0 }), { id: 'free', kind: 'free' }]);
    expect(prices.resolve('annual')).toMatchObject({ monthlyEquivalent: { minor: 2000, rounded: false } });
    expect(prices.resolve('zero')).toMatchObject({ kind: 'recurring', totalMinor: 0, billingAmount: { minor: 0, formatted: '$0.00' } });
    expect(Object.is((prices.resolve('zero') as GlassRecurringPrice).totalMinor, -0)).toBe(false);
    expect(prices.resolve('free')).toEqual({ id: 'free', kind: 'free' });
  });

  it('keeps usage rates and contact-sales explicit without invented invoice or zero values', () => {
    const prices = model([{ id: 'free', kind: 'free' }, { id: 'enterprise', kind: 'contact-sales' },
      { id: 'usage', kind: 'usage', currency: 'usd', exponent: 2, rateMinor: 150, perQuantity: 1000, unit: 'requests' }]);
    expect(prices.resolve('enterprise')).toEqual({ id: 'enterprise', kind: 'contact-sales' });
    expect(prices.resolve('usage')).toEqual({ id: 'usage', kind: 'usage', currency: 'USD', exponent: 2, rateMinor: 150, perQuantity: 1000,
      unit: 'requests', rate: { currency: 'USD', exponent: 2, minor: 150, formatted: '$1.50' } });
    expect(prices.resolve('usage')).not.toHaveProperty('billingAmount');
    expect(prices.resolve('usage')).not.toHaveProperty('monthlyEquivalent');
    expect(prices.compare('usage', 'free')).toBeNull();
    expect(() => prices.resolve('unknown')).toThrow(/Unknown/);
    expect(() => prices.compare('free', 'unknown')).toThrow(/Unknown/);
  });

  it('uses the supplied exponent, including zero and three, without currency inference', () => {
    const prices = model([recurring('zero', { totalMinor: 1990, currency: 'USD', exponent: 0 }),
      recurring('three', { totalMinor: 1990, currency: 'USD', exponent: 3 }), recurring('yen', { totalMinor: 1990, currency: 'JPY', exponent: 0 })]);
    expect(prices.resolve('zero')).toMatchObject({ billingAmount: { formatted: '$1,990', minor: 1990, exponent: 0 } });
    expect(prices.resolve('three')).toMatchObject({ billingAmount: { formatted: '$1.990', minor: 1990, exponent: 3 } });
    expect(prices.resolve('yen')).toMatchObject({ billingAmount: { formatted: '¥1,990' } });
  });

  it('formats safe minor-unit limits without losing their last decimal digit', () => {
    const prices = model([recurring('two', { totalMinor: Number.MAX_SAFE_INTEGER }), recurring('three', { totalMinor: Number.MAX_SAFE_INTEGER, exponent: 3 })]);
    expect(prices.resolve('two')).toMatchObject({ billingAmount: { formatted: '$90,071,992,547,409.91', minor: Number.MAX_SAFE_INTEGER } });
    expect(prices.resolve('three')).toMatchObject({ billingAmount: { formatted: '$9,007,199,254,740.991' } });
  });

  it('keeps locale and currency/exponent formatter configurations separate', () => {
    const offer = recurring('tiny', { totalMinor: 1, exponent: 3 });
    expect(model([offer], { locale: 'de-DE' }).resolve('tiny')).toMatchObject({ billingAmount: { formatted: '0,001 $' } });
    const arabic = model([offer], { locale: 'ar-EG' }).resolve('tiny');
    if (arabic.kind !== 'recurring') throw new Error('Wrong variant');
    expect(arabic.billingAmount.formatted).toContain('٠٫٠٠١');
    expect(model([offer]).resolve('tiny')).toMatchObject({ billingAmount: { formatted: '$0.001' } });
    expect(model([offer], { locale: 'en-us' }).locale).toBe('en-US');
    // Exercise more than the bounded shared cache capacity; eviction must not alter output.
    for (const currency of ['AAA', 'AAB', 'AAC', 'AAD', 'AAE', 'AAF', 'AAG', 'AAH', 'AAI', 'AAJ', 'AAK', 'AAL', 'AAM', 'AAN', 'AAO', 'AAP', 'AAQ', 'AAR', 'AAS', 'AAT', 'AAU', 'AAV', 'AAW', 'AAX', 'AAY', 'AAZ', 'ABA', 'ABB', 'ABC', 'ABD', 'ABE', 'ABF', 'ABG']) model([recurring('price', { currency })]);
    expect(model([offer]).resolve('tiny')).toMatchObject({ billingAmount: { formatted: '$0.001' } });
  });

  it('detaches and freezes model snapshots without freezing caller data', () => {
    const offer = recurring(); const offers = [offer]; const pricing = model(offers);
    (offer as { totalMinor: number }).totalMinor = 99999;
    offers.push(recurring('new'));
    expect(pricing.offers).toHaveLength(1);
    expect(pricing.resolve('monthly')).toMatchObject({ totalMinor: 2400, billingAmount: { formatted: '$24.00' } });
    expect(Object.isFrozen(offer)).toBe(false);
    expect(() => (pricing.offers as GlassPricingOffer[]).push({ id: 'fake', kind: 'free' })).toThrow();
    expect(() => { (pricing.resolve('monthly') as { totalMinor: number }).totalMinor = 1; }).toThrow();
    const price = pricing.resolve('monthly');
    if (price.kind !== 'recurring') throw new Error('Wrong variant');
    expect(Object.isFrozen(price.billingAmount)).toBe(true);
    expect(Object.isFrozen(price.monthlyEquivalent)).toBe(true);
    expect(Object.isFrozen(pricing)).toBe(true);
  });
});

describe('explicit comparable savings', () => {
  it('compares annual invoice totals against twelve comparable monthly invoices', () => {
    const prices = model([recurring(), recurring('annual', { totalMinor: 19900, periodMonths: 12 })]);
    expect(prices.compare('annual', 'monthly')).toEqual({ currency: 'USD', exponent: 2, selectedId: 'annual', baselineId: 'monthly', periodMonths: 12,
      selectedTotalMinor: 19900, baselineTotalMinor: 28800,
      savedAmount: { currency: 'USD', exponent: 2, minor: 8900, formatted: '$89.00' },
      percentBasisPoints: 3090, percentageRounded: true, percentageRounding: 'half-up' });
    expect(prices.compare('monthly', 'annual')).toBeNull();
    expect(prices.compare('monthly', 'monthly')).toBeNull();
  });

  it('uses a whole shared horizon rather than guessing a baseline interval', () => {
    const prices = model([recurring('four', { totalMinor: 1000, periodMonths: 4 }), recurring('six', { totalMinor: 1200, periodMonths: 6 })]);
    expect(prices.compare('six', 'four')).toMatchObject({ periodMonths: 12, selectedTotalMinor: 2400, baselineTotalMinor: 3000,
      savedAmount: { minor: 600 }, percentBasisPoints: 2000, percentageRounded: false });
    expect(Object.isFrozen(prices.compare('six', 'four'))).toBe(true);
    expect(Object.isFrozen(prices.compare('six', 'four')?.savedAmount)).toBe(true);
    expect(model([recurring('1199', { periodMonths: 1199 }), recurring('1200', { periodMonths: 1200 })]).compare('1199', '1200')).toBeNull();
  });

  it.each([{ currency: 'EUR' }, { exponent: 3 }, { unit: 'seat' }, { quantity: 2 }, { scopeKey: 'different-limits' }] as const)('does not manufacture savings across mismatched %s', change => {
    expect(model([recurring(), recurring('annual', { totalMinor: 100, periodMonths: 12, ...change })]).compare('annual', 'monthly')).toBeNull();
  });

  it('allows genuine zero recurring charges without dividing by a zero baseline', () => {
    const prices = model([recurring('zero', { totalMinor: 0 }), recurring('one', { totalMinor: 1 })]);
    expect(prices.compare('one', 'zero')).toBeNull(); expect(prices.compare('zero', 'zero')).toBeNull();
    expect(prices.compare('zero', 'one')).toMatchObject({ savedAmount: { minor: 1 }, percentBasisPoints: 10000, percentageRounded: false });
  });

  it('uses BigInt intermediates for percentages and rejects unsafe public comparison totals', () => {
    const prices = model([recurring('large', { totalMinor: Number.MAX_SAFE_INTEGER }), recurring('half', { totalMinor: 4503599627370495 })]);
    expect(prices.compare('half', 'large')).toMatchObject({ selectedTotalMinor: 4503599627370495, baselineTotalMinor: Number.MAX_SAFE_INTEGER,
      savedAmount: { minor: 4503599627370496 }, percentBasisPoints: 5000, percentageRounded: true });
    const unsafeBaseline = model([recurring('annual', { totalMinor: 1, periodMonths: 12 }), recurring('large', { totalMinor: Number.MAX_SAFE_INTEGER })]);
    expect(() => unsafeBaseline.compare('annual', 'large')).toThrow(/baseline comparison total.*safe integer/);
    expect(() => unsafeBaseline.compare('large', 'annual')).toThrow(/selected comparison total.*safe integer/);
  });
});

describe('bounded pricing inputs', () => {
  it.each([-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '100', null])('rejects invalid money %s', totalMinor => {
    expect(() => unsafe({ locale: 'en-US', offers: [{ ...recurring(), totalMinor }] })).toThrow(/safe integer/);
    expect(() => unsafe({ locale: 'en-US', offers: [{ id: 'usage', kind: 'usage', currency: 'USD', exponent: 2, rateMinor: totalMinor, perQuantity: 1, unit: 'requests' }] })).toThrow(/safe integer/);
  });

  it.each([0, -1, 1.5, 1201, NaN, '12'])('rejects invalid billing months %s', periodMonths => {
    expect(() => unsafe({ locale: 'en-US', offers: [{ ...recurring(), periodMonths }] })).toThrow(/periodMonths/);
  });

  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, Infinity, '2'])('requires explicit positive whole charge quantities %s', quantity => {
    expect(() => unsafe({ locale: 'en-US', offers: [{ ...recurring(), quantity }] })).toThrow(/quantity/);
    expect(() => unsafe({ locale: 'en-US', offers: [{ id: 'usage', kind: 'usage', currency: 'USD', exponent: 2, rateMinor: 1, perQuantity: quantity, unit: 'requests' }] })).toThrow(/perQuantity/);
  });

  it.each([-1, 0.5, 4, undefined, '2'])('requires a supplied minor-unit exponent %s', exponent => {
    expect(() => unsafe({ locale: 'en-US', offers: [{ ...recurring(), exponent }] })).toThrow(/exponent/);
  });

  it.each(['', 'US', 'USDD', 'US$', ' usd', 'USD\n', null])('rejects malformed currency codes %s', currency => {
    expect(() => unsafe({ locale: 'en-US', offers: [{ ...recurring(), currency }] })).toThrow(/currency/);
  });

  it.each(['', ' ', 'not_a_locale', 'zz-ZZ', 'x'.repeat(129), undefined, ['en-US']])('requires a supported bounded explicit locale %s', locale => {
    expect(() => unsafe({ locale, offers: [recurring()] })).toThrow(/locale/);
  });

  it('rejects unsupported rounding and missing amounts/scopes rather than inventing values', () => {
    expect(() => unsafe({ locale: 'en-US', offers: [recurring()], monthlyRounding: 'nearest' })).toThrow(/monthlyRounding/);
    for (const key of ['totalMinor', 'quantity', 'periodMonths', 'unit', 'scopeKey']) {
      const offer = { ...recurring() } as Record<string, unknown>; delete offer[key];
      expect(() => unsafe({ locale: 'en-US', offers: [offer] })).toThrow();
    }
    expect(() => unsafe({ locale: 'en-US', offers: [{ id: 'custom', kind: 'unknown' }] })).toThrow(/kind/);
    expect(() => unsafe({ locale: 'en-US', offers: [{ id: 'free', kind: 'free', totalMinor: 0 }] })).toThrow(/unknown property/);
    expect(() => unsafe({ locale: 'en-US', offers: [{ ...recurring(), rateMinor: 100 }] })).toThrow(/unknown property/);
    expect(() => unsafe({ locale: 'en-US', offers: [recurring()], taxes: 0 })).toThrow(/unknown property/);
  });

  it('bounds offer lists, ids, scope and human-authored unit strings', () => {
    for (const offers of [[], Array(65).fill(recurring()), Array(1), null, 'offers', [recurring(), recurring()]]) expect(() => unsafe({ locale: 'en-US', offers })).toThrow();
    for (const id of ['', 'a'.repeat(65), 'bad id', '__ bad', '\n']) expect(() => model([recurring(id)])).toThrow(/id/);
    for (const unit of ['', ' ', ' padded', 'x'.repeat(81), 'seat\n']) expect(() => model([recurring('price', { unit })])).toThrow(/unit/);
    for (const scopeKey of ['', 'x'.repeat(129), 'scope with spaces']) expect(() => model([recurring('price', { scopeKey })])).toThrow(/scopeKey/);
    const prices = model(Array.from({ length: 64 }, (_, index) => recurring(`p-${index}`)));
    expect(prices.offers).toHaveLength(64);
    expect(() => prices.resolve('bad id')).toThrow(/id/);
  });

  it('rejects accessors, exotic records and array side channels without executing getters', () => {
    let reads = 0;
    const getter = { ...recurring(), get totalMinor() { reads++; return 1; } };
    expect(() => model([getter])).toThrow(/accessors/);
    const offers: GlassPricingOffer[] = [recurring()]; Object.defineProperty(offers, '0', { get() { reads++; return recurring(); } });
    expect(() => model(offers)).toThrow(/accessors/);
    expect(reads).toBe(0);
    expect(() => unsafe({ locale: 'en-US', offers: [Object.create(recurring())] })).toThrow(/plain object/);
    const custom = [recurring()]; Object.assign(custom, { extra: true });
    expect(() => model(custom)).toThrow(/array property/);
    expect(() => unsafe({ locale: 'en-US', offers: [null] })).toThrow(/plain object/);
    expect(() => unsafe({ locale: 'en-US', offers: [recurring()], [Symbol('extra')]: true })).toThrow(/unknown property/);
    expect(() => unsafe(new Date())).toThrow(/plain object/);
  });
});

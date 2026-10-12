import { createGlassPricingModel } from '../../src/pricing.js';
import type { GlassPricingModel, GlassPricingSavings, GlassResolvedPrice } from '../../src/pricing.js';
import '../../src/material.css';
import './style.css';

type Currency = 'USD' | 'JPY' | 'BHD';
type Period = 'monthly' | 'annual';
type Preset = 'usd-monthly' | 'usd-annual' | 'jpy-annual' | 'bhd-annual' | 'incomparable';
const get = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const currencySelect = get<HTMLSelectElement>('currency'), mismatch = get<HTMLInputElement>('different-scope');
const quiet = get<HTMLInputElement>('quiet'), solid = get<HTMLInputElement>('solid');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const exponent: Record<Currency, number> = { USD: 2, JPY: 0, BHD: 3 };
const models = new Map<Currency, GlassPricingModel>();
for (const currency of ['USD', 'JPY', 'BHD'] as const) {
  const common = { currency, exponent: exponent[currency], unit: 'workspace', quantity: 1, scopeKey: 'studio-v1' };
  models.set(currency, createGlassPricingModel({ locale: currency === 'JPY' ? 'ja-JP' : 'en-US', monthlyRounding: 'half-up', offers: [
    { id: 'monthly', kind: 'recurring', ...common, totalMinor: 3900, periodMonths: 1 },
    { id: 'annual', kind: 'recurring', ...common, totalMinor: 35999, periodMonths: 12 },
    { id: 'different-scope', kind: 'recurring', ...common, totalMinor: 7900, periodMonths: 1, quantity: 2, scopeKey: 'studio-plus-v1' },
    { id: 'baseline-year', kind: 'recurring', ...common, totalMinor: 46800, periodMonths: 12 },
    { id: 'free', kind: 'free' }, { id: 'custom', kind: 'contact-sales' },
    { id: 'usage', kind: 'usage', currency, exponent: exponent[currency], rateMinor: 145, perQuantity: 1000, unit: 'render jobs' },
  ] }));
}
let currency: Currency = 'USD', period: Period = 'annual', touring = false;
let timers: number[] = [], animations: Animation[] = [];
const selected = () => models.get(currency)!.resolve(period);
const savings = () => models.get(currency)!.compare(period, mismatch.checked ? 'different-scope' : 'monthly');
const text = (id: string, value: string) => { const node = get(id); if (node.textContent !== value) node.textContent = value; };
function setStatus(value: string) { text('status', value); }
function animateChange() {
  for (const animation of animations) animation.cancel(); animations = [];
  if (quiet.checked || reducedMotion.matches) return;
  for (const node of [get('headline'), get('invoice-total'), get('saving-panel'), get('currency-stamp')]) {
    if (typeof node.animate !== 'function') continue;
    const animation = node.animate([{ opacity: .35, transform: 'translateY(7px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' });
    animations.push(animation); void animation.finished.catch(() => {});
  }
}
function render(animated = true) {
  const model = models.get(currency)!, price = selected(), comparison = savings();
  if (price.kind !== 'recurring') throw new Error('Demo selection must be recurring');
  const baseline = model.resolve(mismatch.checked ? 'different-scope' : 'monthly'), baselineYear = model.resolve('baseline-year');
  if (baseline.kind !== 'recurring' || baselineYear.kind !== 'recurring') throw new Error('Demo baseline must be recurring');
  document.body.dataset.currency = currency; currencySelect.value = currency;
  get<HTMLInputElement>(period).checked = true;
  text('equivalent-label', period === 'annual' ? 'MONTHLY EQUIVALENT' : 'MONTHLY BILL');
  text('headline', price.monthlyEquivalent.formatted);
  get('price-unit').replaceChildren(document.createTextNode('/ month'), document.createElement('br'));
  const rounded = document.createElement('small'); rounded.textContent = period === 'annual' ? 'rounded display' : 'exact monthly amount'; get('price-unit').append(rounded);
  text('invoice-total', price.billingAmount.formatted); text('invoice-period', `every ${price.periodMonths === 1 ? 'month' : `${price.periodMonths} months`}`);
  text('selected-ledger', `${price.billingAmount.formatted} / ${price.periodMonths === 1 ? 'month' : '12 months'}`);
  text('baseline-ledger', `${baseline.billingAmount.formatted} / month${mismatch.checked ? ' · 2 workspaces' : ''}`);
  text('baseline-total', mismatch.checked ? 'Different scope; not compared' : period === 'annual' ? `${baselineYear.billingAmount.formatted} / 12 months` : `${baseline.billingAmount.formatted} / month`);
  const panel = get('saving-panel');
  if (comparison) {
    panel.dataset.result = 'saving'; text('saving-title', `${comparison.savedAmount.formatted} less over ${comparison.periodMonths} months`);
    text('saving-detail', 'Same workspace, scope and currency. Compared with 12 monthly bills.');
    text('saving-percent', `${comparison.percentageRounded ? '≈' : ''}${(comparison.percentBasisPoints / 100).toFixed(2)}%`);
    text('comparison-marker', 'LIKE FOR LIKE');
  } else {
    panel.dataset.result = mismatch.checked ? 'incomparable' : 'same';
    text('saving-title', mismatch.checked ? 'No savings comparison' : 'No savings on this comparison');
    text('saving-detail', mismatch.checked ? 'The baseline has 2 workspaces and a different scope. A discount would be misleading.' : 'The selected monthly bill is the same as the baseline. No saving is inferred.');
    text('saving-percent', mismatch.checked ? 'Not comparable' : 'No savings'); text('comparison-marker', mismatch.checked ? 'SCOPE DOES NOT MATCH' : 'SAME MONTHLY BILL');
  }
  const symbol = panel.querySelector('.comparison-symbol')!; symbol.textContent = comparison ? '↘' : mismatch.checked ? '≠' : '=';
  const stamp = get('currency-stamp'); stamp.replaceChildren(document.createTextNode(currency), document.createElement('br'));
  const digits = document.createElement('small'); digits.textContent = `${String(exponent[currency]).padStart(2, '0')} DIGITS`; stamp.append(digits);
  const usage = model.resolve('usage'); if (usage.kind !== 'usage') throw new Error('Demo usage offer missing');
  const rate = get('usage-rate'); rate.replaceChildren(document.createTextNode(usage.rate.formatted + ' ')); const rateUnit = document.createElement('small'); rateUnit.textContent = `/ ${usage.perQuantity.toLocaleString('en-US')} jobs`; rate.append(rateUnit);
  const free = model.resolve('free'), custom = model.resolve('custom'); text('free-price', free.kind === 'free' ? 'Free' : 'Missing free offer'); text('custom-price', custom.kind === 'contact-sales' ? 'Contact sales' : 'Missing custom offer');
  text('math-fraction', `${price.totalMinor.toLocaleString('en-US')} minor units ÷ ${price.periodMonths} ${price.periodMonths === 1 ? 'month' : 'months'}`);
  text('math-rounded', `${price.monthlyEquivalent.minor.toLocaleString('en-US')} minor units / month · ${price.monthlyEquivalent.rounding}`);
  const difference = BigInt(price.monthlyEquivalent.minor) * BigInt(price.periodMonths) - BigInt(price.totalMinor);
  text('math-difference', difference === 0n ? 'This equivalent divides exactly. The invoice total is still authoritative.' : `The rounded display × ${price.periodMonths} is ${difference < 0n ? -difference : difference} minor unit ${difference < 0n ? 'below' : 'above'} the actual bill.`);
  for (const surface of document.querySelectorAll<HTMLElement>('.lg-glass')) surface.dataset.lgSolid = String(solid.checked);
  if (animated) animateChange();
}
function cancel() {
  for (const timer of timers) clearTimeout(timer); timers = []; touring = false; text('tour', 'Play 10s tour');
}
function applyPreset(name: Preset) {
  if (!['usd-monthly', 'usd-annual', 'jpy-annual', 'bhd-annual', 'incomparable'].includes(name)) throw new TypeError('Unknown RateCard preset');
  currency = name === 'jpy-annual' ? 'JPY' : name === 'bhd-annual' || name === 'incomparable' ? 'BHD' : 'USD';
  period = name === 'usd-monthly' ? 'monthly' : 'annual'; mismatch.checked = name === 'incomparable';
  render();
  setStatus(name === 'incomparable' ? 'Scope differs. The model declines to show savings.' : `${currency} ${period} sample. ${exponent[currency]} currency digits; the billed total stays exact.`);
}
function preset(name: Preset) { cancel(); applyPreset(name); }
function reset() {
  cancel(); currency = 'USD'; period = 'annual'; mismatch.checked = false; quiet.checked = false; solid.checked = false;
  get('math-detail').hidden = true; get('inspect').setAttribute('aria-expanded', 'false'); render(false);
  for (const animation of animations) animation.cancel(); animations = [];
  setStatus('Annual sample. Exact bill and rounded display stay separate.');
}
function tour() {
  cancel(); touring = true; text('tour', 'Stop tour');
  const steps: [number, Preset][] = [[0, 'usd-annual'], [2000, 'usd-monthly'], [4000, 'jpy-annual'], [6000, 'bhd-annual'], [8000, 'incomparable']];
  applyPreset(steps[0][1]);
  for (const [time, name] of steps.slice(1)) timers.push(window.setTimeout(() => applyPreset(name), time));
  timers.push(window.setTimeout(() => { cancel(); setStatus('Tour complete. Different scopes keep their savings unclaimed.'); }, 10000));
}
currencySelect.addEventListener('change', () => { cancel(); currency = currencySelect.value as Currency; render(); setStatus(`${currency}: ${exponent[currency]} declared minor-unit digits. Sample prices are not exchange conversions.`); });
for (const radio of document.querySelectorAll<HTMLInputElement>('input[name="period"]')) radio.addEventListener('change', () => { if (!radio.checked) return; cancel(); period = radio.value as Period; render(); setStatus(`${period === 'annual' ? 'Annual total and rounded monthly equivalent' : 'Exact monthly bill'} selected.`); });
mismatch.addEventListener('change', () => { cancel(); render(); setStatus(mismatch.checked ? 'Different workspace quantity and scope. No savings comparison.' : 'Baseline restored to the same workspace and scope.'); });
get('inspect').addEventListener('click', () => { cancel(); const details = get('math-detail'); details.hidden = !details.hidden; get('inspect').setAttribute('aria-expanded', String(!details.hidden)); });
quiet.addEventListener('change', () => { if (quiet.checked) { for (const animation of animations) animation.cancel(); animations = []; } });
solid.addEventListener('change', () => render(false));
reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) { for (const animation of animations) animation.cancel(); animations = []; } });
get('tour').addEventListener('click', () => touring ? cancel() : tour()); get('reset').addEventListener('click', reset);
document.addEventListener('visibilitychange', () => { if (document.hidden) cancel(); });
render(false);
declare global {
  interface Window { __pricingDemo: { tour(): void; reset(): void; cancel(): void; preset(name: Preset): void; state(): { currency: Currency; period: Period; incomparable: boolean; touring: boolean; selected: GlassResolvedPrice; savings: GlassPricingSavings | null; solid: boolean; quiet: boolean } } }
}
window.__pricingDemo = { tour, reset, cancel, preset, state: () => ({ currency, period, incomparable: mismatch.checked, touring, selected: selected(), savings: savings(), solid: solid.checked, quiet: quiet.checked || reducedMotion.matches }) };

import { attachGlassNumber, formatGlassNumber } from '../../src/number-transition.js';
import type { GlassNumberController } from '../../src/number-transition.js';
import { getGlassProps } from '../../src/material.js';
import './style.css';

type Instrument = 'session' | 'reading' | 'pattern';
type Preset = 'baseline' | 'reading' | 'negative' | 'pattern' | 'quiet';
interface Settings { locale: 'en-US' | 'de-DE' | 'fr-FR' | 'ar-EG'; precision: number; grouping: boolean; interpolate: boolean; announce: boolean; quiet: boolean; duration: number }
const query = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const localeField = query<HTMLSelectElement>('#locale'), precisionField = query<HTMLSelectElement>('#precision'), durationField = query<HTMLSelectElement>('#duration');
const sessionInput = query<HTMLInputElement>('#session-length'), readingInput = query<HTMLInputElement>('#reading-input'), patternInput = query<HTMLInputElement>('#pattern-input');
const media = window.matchMedia('(prefers-reduced-motion: reduce)'), instruments: Instrument[] = ['session', 'reading', 'pattern'];
let options: Settings = { locale: 'en-US', precision: 1, grouping: true, interpolate: false, announce: false, quiet: false, duration: 280 };
let sessions: { id: number; minutes: number }[] = [], nextSession = 1, readingValue = 21.5, patternValue = 12, solid = false;
let controllers: Record<Instrument, GlassNumberController>, requested = 0, completed = 0, cancelled = 0, epoch = 0, destroyed = false;
let tourVersion = 0, tourTimers: number[] = [], tourFinish: ((complete: boolean) => void) | undefined, tourStep = '';
const total = () => sessions.reduce((sum, session) => sum + session.minutes, 0);
const node = <K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = '') => { const element = document.createElement(tag); element.textContent = text; if (className) element.className = className; return element; };
const config = (instrument: Instrument) => ({ locale: options.locale, precision: instrument === 'reading' ? options.precision : 0, useGrouping: options.grouping, duration: options.duration, reducedMotion: options.quiet, mode: instrument === 'session' || !options.interpolate ? 'replace' as const : 'interpolate' as const, announce: options.announce, announcementPrefix: instrument === 'session' ? 'Minutes recorded: ' : instrument === 'reading' ? 'Temperature study setting: ' : 'Grid spacing in CSS pixels: ' });
function mount() {
  controllers = Object.fromEntries(instruments.map(instrument => [instrument, attachGlassNumber(query('#' + instrument + '-visual'), { ...config(instrument), value: instrument === 'session' ? total() : instrument === 'reading' ? readingValue : patternValue, semantic: query('#' + instrument + '-current'), status: query('#' + instrument + '-status') })])) as Record<Instrument, GlassNumberController>;
}
function material() {
  const props = getGlassProps({ appearance: 'light', radius: 16, blur: 12, corner: 'continuous', reducedTransparency: solid });
  const board = query('.instrument-board'); board.classList.add(props.className);
  for (const [key, value] of Object.entries(props.style)) board.style.setProperty(key, String(value));
  for (const [key, value] of Object.entries(props)) if (key.startsWith('data-')) board.setAttribute(key, String(value));
  board.style.setProperty('--lg-fill-rgb', '247 246 241'); board.style.setProperty('--lg-solid-fill', '#f7f6f1'); board.style.setProperty('--lg-ink', '#2a2e29');
  query('#solid').setAttribute('aria-pressed', String(solid));
}
function render() {
  if (destroyed) return;
  document.body.dataset.quiet = String(options.quiet || media.matches);
  query('#session-count').textContent = sessions.length + (sessions.length === 1 ? ' session' : ' sessions'); query<HTMLButtonElement>('#undo').disabled = sessions.length === 0;
  query('#session-strip').replaceChildren(...(sessions.length ? sessions.map(session => { const bar = node('span', '', 'session-bar'); bar.style.setProperty('--session-share', (session.minutes / 120 * 100).toFixed(2) + '%'); bar.setAttribute('aria-label', 'Session ' + session.id + ': ' + session.minutes + ' recorded minutes'); bar.append(node('span', String(session.minutes))); return bar; }) : [node('span', 'No sessions recorded yet', 'empty-strip')]));
  query('#session-history').replaceChildren(...[...sessions].reverse().map(session => node('li', String(session.id).padStart(2, '0') + ' / ' + session.minutes + ' minutes recorded')));
  query('#reading-marker').setAttribute('d', 'm' + (18 + (readingValue + 30) / 90 * 284 - 5).toFixed(2) + ' 9 5 8 5-8z');
  query('#pattern-sample').style.setProperty('--pattern-gap', patternValue + 'px'); query('#pattern-caption').textContent = patternValue + ' px / grid step';
  const snapshots = instruments.map(instrument => controllers[instrument].snapshot());
  query('#readback-values').textContent = instruments.map(instrument => query('#' + instrument + '-current').textContent).join(' / ');
  query('#readback-active').textContent = String(snapshots.filter(snapshot => snapshot.active).length); query('#readback-lifecycle').textContent = requested + ' / ' + completed + ' / ' + cancelled;
  query('#readback-mode').textContent = 'replace / ' + (options.interpolate ? 'interpolate (decorative)' : 'replace');
  query('#readback-motion').textContent = media.matches ? 'OS reduce (authoritative)' : options.quiet ? 'Explicit quiet / immediate' : 'Finite / ' + options.duration + ' ms';
  query('#readback-announce').textContent = options.announce ? 'Opt-in / latest settled only' : 'Opt-in / off';
  query('#policy').textContent = options.interpolate ? 'The session log still replaces actual values. Only the editable temperature and CSS studies blend decorative nonfinancial intermediates; their actual values update immediately.' : 'The session log always replaces actual values. Interpolation is off; the two editable studies may explicitly blend decorative nonfinancial values.';
  query('#tour-status').textContent = tourStep ? 'Finite tour / ' + tourStep : 'No automatic updates';
}
function present(instrument: Instrument, value: number) {
  const generation = epoch; requested++; const promise = controllers[instrument].set(value); render();
  return promise.then(result => { if (!destroyed && epoch === generation) { result ? completed++ : cancelled++; render(); } return result; });
}
function log(minutes: number): Promise<boolean> {
  if (destroyed || !Number.isInteger(minutes) || minutes < 1 || minutes > 120 || sessions.length >= 12) return Promise.resolve(false);
  sessions.push({ id: nextSession++, minutes }); query('#input-error').textContent = ''; return present('session', total());
}
function undo(): Promise<boolean> { if (!sessions.length || destroyed) return Promise.resolve(false); sessions.pop(); return present('session', total()); }
function reading(value: number): Promise<boolean> {
  if (destroyed || !Number.isFinite(value) || value < -30 || value > 60 || !Number.isInteger(value * 8)) return Promise.resolve(false);
  readingValue = value === 0 ? 0 : value; readingInput.value = String(readingValue); query('#input-error').textContent = ''; return present('reading', readingValue);
}
function pattern(value: number): Promise<boolean> {
  if (destroyed || !Number.isInteger(value) || value < 4 || value > 48) return Promise.resolve(false);
  patternValue = value; patternInput.value = String(value); query('#input-error').textContent = ''; return present('pattern', value);
}
function settings(patch: Partial<Settings>): boolean {
  if (destroyed || !patch || typeof patch !== 'object' || Array.isArray(patch) || Object.keys(patch).some(key => !['locale', 'precision', 'grouping', 'interpolate', 'announce', 'quiet', 'duration'].includes(key))) return false;
  const next = { ...options, ...patch };
  if (!['en-US', 'de-DE', 'fr-FR', 'ar-EG'].includes(next.locale) || !Number.isInteger(next.precision) || next.precision < 0 || next.precision > 3 || !Number.isFinite(next.duration) || next.duration < 0 || next.duration > 600 || ['grouping', 'interpolate', 'announce', 'quiet'].some(key => typeof next[key as keyof Settings] !== 'boolean')) return false;
  options = next;
  localeField.value = options.locale; precisionField.value = String(options.precision);
  durationField.querySelector('[data-custom-duration]')?.remove();
  if (![...durationField.options].some(option => option.value === String(options.duration))) {
    const custom = node('option', options.duration + ' ms'); custom.value = String(options.duration); custom.dataset.customDuration = 'true'; durationField.append(custom);
  }
  durationField.value = String(options.duration);
  for (const key of ['grouping', 'interpolate', 'announce', 'quiet'] as const) query<HTMLInputElement>('#' + key).checked = options[key];
  for (const instrument of instruments) controllers[instrument].update(config(instrument)); render(); return true;
}
function cancelTour() { tourVersion++; for (const timer of tourTimers) window.clearTimeout(timer); tourTimers = []; const finish = tourFinish; tourFinish = undefined; tourStep = ''; finish?.(false); render(); }
function reset() {
  cancelTour(); epoch++; for (const controller of Object.values(controllers)) controller.destroy();
  sessions = []; nextSession = 1; readingValue = 21.5; patternValue = 12; requested = completed = cancelled = 0;
  options = { locale: 'en-US', precision: 1, grouping: true, interpolate: false, announce: false, quiet: false, duration: 280 };
  sessionInput.value = '25'; readingInput.value = '21.5'; patternInput.value = '12'; solid = false; mount(); material(); settings(options); query('#input-error').textContent = ''; render();
}
function preset(value: Preset): boolean {
  if (!['baseline', 'reading', 'negative', 'pattern', 'quiet'].includes(value) || destroyed) return false;
  if (value === 'baseline') { reset(); return true; } cancelTour();
  if (value === 'reading') { settings({ precision: 3, interpolate: false, quiet: false }); void reading(37.125); }
  else if (value === 'negative') { settings({ precision: 1, interpolate: false, quiet: false }); void reading(-8.5); }
  else if (value === 'pattern') { settings({ interpolate: true, quiet: false }); void pattern(24); }
  else { settings({ quiet: true }); void reading(24.5); void pattern(8); }
  return true;
}
function tour(): Promise<boolean> {
  reset(); const version = ++tourVersion; tourStep = '01 / record a completed session'; void log(25); render();
  return new Promise(resolve => {
    tourFinish = resolve;
    const at = (delay: number, step: () => void) => { const timer = window.setTimeout(() => { tourTimers = tourTimers.filter(value => value !== timer); if (!destroyed && version === tourVersion) step(); }, delay); tourTimers.push(timer); };
    at(1500, () => { void log(35); tourStep = 'actual session total / two real entries'; render(); });
    at(3000, () => { settings({ precision: 3, interpolate: true }); void reading(37.125); tourStep = 'explicit study blend / immediate actual value'; render(); });
    at(4700, () => { void reading(-8.5); void pattern(24); tourStep = 'negative reading / open grid'; render(); });
    at(6300, () => { settings({ locale: 'de-DE', precision: 2 }); void log(90); tourStep = 'locale punctuation / replace-only log'; render(); });
    at(8000, () => { settings({ quiet: true }); void reading(22.25); void pattern(8); tourStep = 'quiet / exact settings'; render(); });
    at(10000, () => { tourStep = ''; tourFinish = undefined; render(); resolve(true); });
  });
}
mount(); material(); render();
query<HTMLFormElement>('#session-form').addEventListener('submit', event => { event.preventDefault(); cancelTour(); const value = sessionInput.valueAsNumber; if (!Number.isInteger(value) || value < 1 || value > 120 || sessions.length >= 12) { query('#input-error').textContent = 'Use a whole session length from one to one hundred twenty minutes. This local notebook holds twelve entries.'; return; } void log(value); });
query<HTMLFormElement>('#reading-form').addEventListener('submit', event => { event.preventDefault(); cancelTour(); const value = readingInput.valueAsNumber; if (!Number.isFinite(value) || value < -30 || value > 60 || !Number.isInteger(value * 8)) { query('#input-error').textContent = 'Use a reading between minus thirty and sixty, in steps of one eighth.'; return; } void reading(value); });
query<HTMLFormElement>('#pattern-form').addEventListener('submit', event => { event.preventDefault(); cancelTour(); const value = patternInput.valueAsNumber; if (!Number.isInteger(value) || value < 4 || value > 48) { query('#input-error').textContent = 'Use a whole grid step from four to forty-eight CSS pixels.'; return; } void pattern(value); });
query('#undo').addEventListener('click', () => { cancelTour(); void undo(); });
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-reading]')) button.addEventListener('click', () => { cancelTour(); void reading(Number(button.dataset.reading)); });
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-pattern]')) button.addEventListener('click', () => { cancelTour(); void pattern(Number(button.dataset.pattern)); });
localeField.addEventListener('change', () => { cancelTour(); settings({ locale: localeField.value as Settings['locale'] }); }); precisionField.addEventListener('change', () => { cancelTour(); settings({ precision: Number(precisionField.value) }); }); durationField.addEventListener('change', () => { cancelTour(); settings({ duration: Number(durationField.value) }); });
for (const key of ['grouping', 'interpolate', 'announce', 'quiet'] as const) query<HTMLInputElement>('#' + key).addEventListener('change', event => { cancelTour(); settings({ [key]: (event.target as HTMLInputElement).checked }); });
query('#solid').addEventListener('click', () => { cancelTour(); solid = !solid; material(); });
for (const input of [sessionInput, readingInput, patternInput]) input.addEventListener('input', cancelTour);
query('#tour').addEventListener('click', () => { void tour(); }); query('#reset').addEventListener('click', reset);
const motionChanged = () => { document.body.dataset.quiet = String(options.quiet || media.matches); render(); }; media.addEventListener('change', motionChanged);
const state = () => ({ settings: { ...options }, systemReduced: media.matches, solid, sessions: sessions.map(session => ({ ...session })), totalMinutes: total(), reading: readingValue, pattern: patternValue, instruments: Object.fromEntries(instruments.map(instrument => [instrument, { ...controllers[instrument].snapshot(), semantic: query('#' + instrument + '-current').textContent, status: query('#' + instrument + '-status').textContent }])), formatted: { session: formatGlassNumber(total(), { locale: options.locale, precision: 0, useGrouping: options.grouping }), reading: formatGlassNumber(readingValue, { locale: options.locale, precision: options.precision, useGrouping: options.grouping }), pattern: formatGlassNumber(patternValue, { locale: options.locale, precision: 0, useGrouping: options.grouping }) }, requested, completed, cancelled, tourStep, pendingTourSteps: tourTimers.length, focus: document.activeElement?.id || document.activeElement?.tagName || null });
const demo = { preset, log: (minutes: number) => { cancelTour(); return log(minutes); }, undo: () => { cancelTour(); return undo(); }, reading: (value: number) => { cancelTour(); return reading(value); }, pattern: (value: number) => { cancelTour(); return pattern(value); }, settings: (patch: Partial<Settings>) => { cancelTour(); return settings(patch); }, reset, tour, state };
(window as Window & { __numberDemo?: typeof demo }).__numberDemo = demo;
window.addEventListener('pagehide', () => { cancelTour(); epoch++; destroyed = true; for (const controller of Object.values(controllers)) controller.destroy(); media.removeEventListener('change', motionChanged); }, { once: true });

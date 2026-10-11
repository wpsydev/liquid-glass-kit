import { bounded } from './numeric.js';

export interface GlassCompositionOptions {
  /** Intrinsic grouping strategy. Default split. */
  layout?: 'split' | 'stack' | 'cluster' | 'grid';
  /** First/second split column growth. Source order never changes. Default 1:1. */
  ratio?: '2:1' | '1:1' | '1:2';
  /** Spacing rhythm; control target sizes remain unchanged. Default comfortable. */
  density?: 'compact' | 'comfortable' | 'editorial';
  /** Maximum reading line length in ch, clamped to 30–90. Default 60. */
  measure?: number;
}

/**
 * Pure, SSR-safe opt-in composition props; spread attributes and put the returned
 * custom properties on style. Import composition.css separately. Use headings and
 * reading helpers on descendants, so container-relative type never queries its
 * own container. Split ratios describe the first two children; extra children wrap.
 * Typography inherits the application's fonts. No markup, browser state or motion
 * controller is created. Invalid enum/numeric inputs return safe bounded defaults.
 */
export function getGlassCompositionProps(options: GlassCompositionOptions = {}) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) options = {};
  const layout = ['split', 'stack', 'cluster', 'grid'].includes(options.layout ?? '') ? options.layout! : 'split';
  const ratio = options.ratio === '2:1' || options.ratio === '1:2' ? options.ratio : '1:1';
  const density = options.density === 'compact' || options.density === 'editorial' ? options.density : 'comfortable';
  const gap = density === 'compact' ? '.75rem' : density === 'editorial' ? '2.5rem' : '1.5rem';
  return {
    className: 'lg-composition',
    'data-lg-layout': layout,
    'data-lg-ratio': ratio,
    'data-lg-density': density,
    style: {
      '--lg-composition-gap': gap,
      '--lg-composition-measure': `${bounded(options.measure, 60, 30, 90)}ch`,
      '--lg-composition-leading': ratio === '2:1' ? '2' : '1',
      '--lg-composition-trailing': ratio === '1:2' ? '2' : '1',
    } as Record<string, string>,
  };
}

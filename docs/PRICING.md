# Pricing displays that retain their source amounts

Optional `/pricing` exports pure `createGlassPricingModel(options)`. It formats host-authored offers and compares compatible recurring charges. It imports safely during SSR, has no runtime dependencies and performs no DOM, network, payment or currency conversion work.

```ts
import { createGlassPricingModel } from '@wpsydev/liquid-glass/pricing';
const prices = createGlassPricingModel({
  locale: 'en-US',
  offers: [
    { id: 'monthly', kind: 'recurring', currency: 'USD', exponent: 2,
      totalMinor: 3900, periodMonths: 1, unit: 'workspace', quantity: 1, scopeKey: 'studio-v1' },
    { id: 'annual', kind: 'recurring', currency: 'USD', exponent: 2,
      totalMinor: 35999, periodMonths: 12, unit: 'workspace', quantity: 1, scopeKey: 'studio-v1' },
  ],
});
const annual = prices.resolve('annual');
const saving = prices.compare('annual', 'monthly');
```

Here the actual annual charge is$359.99. Its rounded monthly display is$30.00, retaining the original fraction35999/12 and `rounded:true`. Twelve displayed monthly equivalents total one minor unit more than the original invoice. The comparison instead uses exact repeated invoice totals:46800−35999=10801minor units over12months. Never reconstruct an invoice from a rounded display.

Supply an explicit supported locale and1–64 unique offers. Currency is a host-declared three-letter code and exponent0–3; the helper does not consult a currency registry. Amounts are nonnegative safe integer minor units up to Number.MAX_SAFE_INTEGER. Formatting preserves integer/fraction precision with BigInt and localized format parts. Locale/ICU data can differ across runtimes; align server/client locale and runtime data when hydrating strings. At most32 formatter configurations are cached, with none created at import time.

Offer kinds are `free`, `contact-sales`, `recurring` and `usage`. Free/contact-sales have only id/kind; no amount is invented. A recurring offer declares `totalMinor`, `periodMonths:1–1200`, `unit`, positive safe integer `quantity` and `scopeKey`. A usage offer declares `rateMinor`, `perQuantity` and `unit`; it is a block rate, not a projected bill. Plain bounded data is required: unknown fields, accessors, sparse arrays and duplicate identifiers reject.

The frozen model exposes locale, monthlyRounding, offers, `resolve(id)` and `compare(selectedId, baselineId)`. Unknown IDs throw. `monthlyRounding` defaults half-up and may be floor or ceil; resolved monthly equivalents retain numerator, denominator, rounded status and policy. Recurring billingAmount and usage rate carry exact minor units and formatted strings.

A comparison requires matching currency, exponent, unit, quantity and scopeKey. It assumes the host truthfully identifies equivalent features/limits and recurring charges repeat unchanged. The comparison period is their least common whole billing horizon, bounded to1200months. Nonrecurring, incompatible, excessive-horizon or nonsaving cases return null; unsafe derived totals reject. Positive results include exact selected/baseline totals, saving amount and a half-up percentage in basis points with its rounding metadata. The host owns taxes, discounts, setup fees, actual invoices, checkout and scope truth.

[RateCard](https://wpsydev.github.io/liquid-glass-kit/pricing/) is an original session study, with real native period/currency controls and explicit rounding detail. USD, JPY and BHD are independent fictional prices, not exchange-rate conversions. A different quantity/scope removes the saving label. Native quiet/solid controls alter presentation without altering amounts. No checkout is connected.

Sixty focused tests cover bounds, exact large-unit formatting, rounding, offer kinds, scope/quantity mismatch and comparison limits. Twenty-five native desktop Chromium preset/viewport cases320–1440px fit without horizontal overflow, with44px controls/associated checkbox-radio labels and16px fields. The small input boxes use their actual associated labels; physical phones/Safari/AT remain unverified.

Optional standalone JS is2,573bytesgzip. Node24 warmed model generation/comparison/JSON benchmark:100warmups plus25×500operations, median normalized batch average0.0426ms/operation, p95 normalized batch0.0475ms. This is not browser rendering, checkout latency, per-call tail latency or a comparative speedup. [Benchmark](../benchmarks/pricing.json) · [Native evidence](../benchmarks/pricing-browser.json) · [Research](resource-series/research/18-pricing.md).

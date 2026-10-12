# Native fields with useful context

Optional `/field` exports pure `getGlassFieldProps(options)`; import `/field.css` separately. It describes one labeled native input, textarea or select. The host authors its type, name, value, native constraints, form behavior and document-unique IDs. There is no form validator, DOM controller or async save engine in this helper.

```tsx
import { getGlassFieldProps } from '@wpsydev/liquid-glass/field';
import '@wpsydev/liquid-glass/field.css';
const parts = getGlassFieldProps({ id: 'brief-title', label: 'Brief title',
  description: 'Name the actual change', error: currentError });
<div {...parts.field}>
  <label {...parts.label.props}>{parts.label.text}</label>
  <input {...parts.control} name="title" required value={title} onChange={onTitleChange} />
  {parts.description && <p {...parts.description.props}>{parts.description.text}</p>}
  {parts.error && <p {...parts.error.props}>{parts.error.text}</p>}
</div>
```

`title`, handlers and currentError belong to the application. For raw HTML/DOM map className to class and htmlFor to for. Render label/description/error as escaped children or textContent, never innerHTML. Recompute from current state and remove omitted attributes and nodes; an adapter that only calls setAttribute leaves stale error references behind. React, Vue and other controlled renderers can apply the same anatomy after mapping their conventions.

Options require `id` (bounded ASCII1–128) and a visible `label` (nonempty text up to240 characters). The helper reserves `${id}--description` and `${id}--error`; the host ensures all IDs are unique. Optional description/error are nonempty multiline text up to2000characters. Omit absent messages rather than passing empty strings. An error implies invalid and conflicts with explicit invalid:false. Invalid and busy accept booleans; omitted means no opinion, false deliberately clears the corresponding host state. Busy supplies ARIA state only, without disabling native controls or blocking submission.

`describedBy` merges unrelated description IDs, deduplicates them and removes stale generated references. At most32 unrelated unique tokens remain; self-description rejects. The host creates real same-document description targets. `errorAnnouncement` defaults off; polite adds status/atomic, assertive adds alert/atomic. The host chooses announcement timing and form-level focus, avoiding competing live regions.

Returned frozen anatomy contains field/group containers, control props and label/description/error text descriptors. CSS supplies native focus, invalid/busy, solid/motion/forced-colors presentation and input groups. Put the control before logical-edge addons in DOM, then place addons with data-lg-field-addon inline-start/inline-end/block-start/block-end. Native button addons retain44px minima; text addons can shrink. Grouped radio/checkbox choices still need a native fieldset/legend and suitable associated targets. Inline errors alone do not certify accessibility.

[Commonplace](https://wpsydev.github.io/liquid-glass-kit/fields/) is an original local notes editor. Required title/URL constraints, research source requirements, actual FormData snapshots, duplicate-title review and cancellation are host code. Its600ms delay is fixture pacing; page-session notes are real but no remote save is connected. Editing during review invalidates the old snapshot; a deliberate noncooperative fixture counts an ignored late result.

Forty-two focused tests include a native-addon CSS cascade regression. Native Chromium found and fixed a42.2px Help target; twenty final preset/viewport cases320–1440px fit with44px controls/associated labels and16px fields. Native submit, invalid focus, label association, editable pending state, preserved caret, current errors, guarded late results and quiet spinner were checked separately. Physical phones, software keyboards, Safari and assistive technology remain unverified.

Optional pure factory1,364bytesgzip/CSS1,270bytesgzip. Native400batches after50warmups separately measure construction (~0.001ms normalized batch average/call), a connected host adapter's apply/clear (~0.005ms/cycle), and combined two constructions plus apply/clear (~0.010ms/cycle). There is no attach/destroy API to benchmark. Setup, native validation, forced layout/paint, async review and network are excluded; quantized batch timings are not individual-event tails or a speedup claim. [Payload](../benchmarks/field-payload.json) · [Workloads](../benchmarks/field-lifecycle-native.json) · [Native behavior](../benchmarks/field-native.json) · [Layouts](../benchmarks/field-responsive.json).

[Research](resource-series/research/20-shadcn.md): independently authored native-field anatomy informed by shadcn's compositional approach, without copying a component or requiring React, Tailwind or Radix in the core.

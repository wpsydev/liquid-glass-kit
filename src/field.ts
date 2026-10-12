export type GlassFieldAnnouncement = 'off' | 'polite' | 'assertive';

export interface GlassFieldOptions {
  /** Unique host-authored ID; also reserves `${id}--description` and `${id}--error`. */
  readonly id: string;
  /** Required visible native label. A placeholder is not a label substitute. */
  readonly label: string;
  readonly description?: string;
  /** Current host validation message. Implies invalid; conflicts with invalid:false. */
  readonly error?: string;
  /** Omitted means no opinion. Explicit false clears a prior host invalid state. */
  readonly invalid?: boolean;
  /** ARIA state only; never disables the native control or blocks submission. */
  readonly busy?: boolean;
  /** Up to 32 unrelated description IDs; host ensures same-document targets exist. */
  readonly describedBy?: string;
  /** Default off. The host chooses announcement timing and creates/updates the node. */
  readonly errorAnnouncement?: GlassFieldAnnouncement;
}

export interface GlassFieldTextProps {
  readonly className: string;
  readonly id?: string;
  /** React casing. An HTML/DOM adapter must map htmlFor to the label's `for`. */
  readonly htmlFor?: string;
  readonly role?: 'status' | 'alert';
  readonly 'aria-atomic'?: true;
}

export interface GlassFieldText {
  readonly props: GlassFieldTextProps;
  /** Render as escaped text/children/textContent, never as innerHTML. */
  readonly text: string;
}

export interface GlassFieldControlProps {
  readonly id: string;
  readonly className: 'lg-form-control';
  readonly 'aria-describedby'?: string;
  readonly 'aria-invalid'?: boolean;
  readonly 'aria-busy'?: boolean;
}

export interface GlassFieldContainerProps {
  readonly className: 'lg-form-field' | 'lg-form-input-group';
  readonly 'data-lg-field-invalid'?: 'true' | 'false';
  readonly 'data-lg-field-busy'?: 'true' | 'false';
}

export interface GlassFieldProps {
  readonly field: GlassFieldContainerProps;
  readonly group: GlassFieldContainerProps;
  readonly control: GlassFieldControlProps;
  readonly label: GlassFieldText;
  readonly description: GlassFieldText | null;
  readonly error: GlassFieldText | null;
}

const fail = (path: string, reason: string): never => { throw new TypeError(`Invalid glass field ${path}: ${reason}`); };

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) return fail('options', 'expected a plain object');
  const allowed = ['id', 'label', 'description', 'error', 'invalid', 'busy', 'describedBy', 'errorAnnouncement'];
  const result: Record<string, unknown> = Object.create(null);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !allowed.includes(key)) return fail('options', 'unknown property');
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
    if (descriptor.get || descriptor.set) return fail('options', 'accessors are not accepted');
    result[key] = descriptor.value;
  }
  return result;
}

function id(value: unknown, path: string, maximum = 128): string {
  if (typeof value !== 'string' || value.length < 1 || value.length > maximum || !/^[a-zA-Z0-9_:.-]+$/.test(value)) return fail(path, 'expected a bounded ASCII ID without spaces');
  return value;
}

function text(value: unknown, path: string, maximum: number, multiline = false): string {
  if (typeof value !== 'string' || !value.trim() || value.length > maximum || (multiline ? /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/ : /[\x00-\x1f\x7f-\x9f]/).test(value)) return fail(path, `expected nonempty ${multiline ? 'multiline' : 'single-line'} text up to ${maximum} characters`);
  return value;
}

function state(value: unknown, path: string): boolean | undefined {
  if (value !== undefined && typeof value !== 'boolean') return fail(path, 'expected a boolean');
  return value as boolean | undefined;
}

function descriptionTokens(value: unknown): string[] {
  if (value === undefined) return [];
  if (typeof value !== 'string' || value.length > 8192 || /[\x00-\x08\x0b\x0e-\x1f\x7f-\x9f]/.test(value)) return fail('describedBy', 'expected bounded space-separated ID tokens');
  const tokens = value.trim() ? value.trim().split(/[\t\n\f\r ]+/) : [];
  if (tokens.length > 64) return fail('describedBy', 'expected at most 64 input ID tokens');
  return tokens.map(token => id(token, 'describedBy', 147));
}

function node(props: GlassFieldTextProps, content: string): GlassFieldText {
  return Object.freeze({ props: Object.freeze(props), text: content });
}

/**
 * Pure native-field anatomy, with no DOM, listeners, random IDs or form validator.
 * Render one labeled native input/textarea/select. Host authors type/name/value,
 * native constraints, buttons, validation, submit handling and document-unique IDs.
 * Returned props use className/htmlFor casing; map these for raw HTML/DOM adapters.
 * Place the control before addons in DOM; CSS can position their logical edges.
 * Only describedBy tokens are merged. Caller merges other native props deliberately.
 * Recompute with current state; controlled rendering must remove omitted attributes
 * and nodes. A manual setAttribute-only adapter is not sufficient to clear errors.
 * Description/error text remains host-rendered escaped text, never HTML generation.
 * Inline errors do not certify accessibility or replace deliberate form-level focus
 * and announcement timing. Grouped radios/checkboxes need a native fieldset/legend.
 */
export function getGlassFieldProps(input: GlassFieldOptions): GlassFieldProps {
  const config = record(input), controlId = id(config.id, 'id');
  const label = text(config.label, 'label', 240);
  const description = config.description === undefined ? undefined : text(config.description, 'description', 2000, true);
  const error = config.error === undefined ? undefined : text(config.error, 'error', 2000, true);
  const requestedInvalid = state(config.invalid, 'invalid'), busy = state(config.busy, 'busy');
  if (error !== undefined && requestedInvalid === false) return fail('error', 'a current error conflicts with invalid:false');
  const invalid = error !== undefined ? true : requestedInvalid;
  const announcement = config.errorAnnouncement === undefined ? 'off' : config.errorAnnouncement;
  if (announcement !== 'off' && announcement !== 'polite' && announcement !== 'assertive') return fail('errorAnnouncement', 'expected off, polite or assertive');
  const descriptionId = `${controlId}--description`, errorId = `${controlId}--error`;
  const references = new Set(descriptionTokens(config.describedBy));
  if (references.has(controlId)) return fail('describedBy', 'a control cannot describe itself');
  // IDs in this reserved namespace belong to this helper, not to unrelated hints.
  references.delete(descriptionId); references.delete(errorId);
  if (references.size > 32) return fail('describedBy', 'expected at most 32 unrelated ID tokens');
  if (description !== undefined) references.add(descriptionId);
  if (error !== undefined) references.add(errorId);
  const control: GlassFieldControlProps = Object.freeze({ id: controlId, className: 'lg-form-control',
    ...(references.size ? { 'aria-describedby': [...references].join(' ') } : {}),
    ...(invalid !== undefined ? { 'aria-invalid': invalid } : {}), ...(busy !== undefined ? { 'aria-busy': busy } : {}),
  });
  const containerState = {
    ...(invalid !== undefined ? { 'data-lg-field-invalid': String(invalid) as 'true' | 'false' } : {}),
    ...(busy !== undefined ? { 'data-lg-field-busy': String(busy) as 'true' | 'false' } : {}),
  };
  return Object.freeze({
    field: Object.freeze({ className: 'lg-form-field', ...containerState }),
    group: Object.freeze({ className: 'lg-form-input-group', ...containerState }), control,
    label: node({ className: 'lg-form-label', htmlFor: controlId }, label),
    description: description === undefined ? null : node({ className: 'lg-form-description', id: descriptionId }, description),
    error: error === undefined ? null : node({ className: 'lg-form-error', id: errorId,
      ...(announcement === 'off' ? {} : { role: announcement === 'polite' ? 'status' : 'alert', 'aria-atomic': true }),
    }, error),
  });
}

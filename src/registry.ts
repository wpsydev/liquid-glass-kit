export type GlassRegistryType = 'registry:lib' | 'registry:style' | 'registry:ui' | 'registry:component' | 'registry:file';
export type GlassRegistryJson = null | boolean | number | string | readonly GlassRegistryJson[] | { readonly [key: string]: GlassRegistryJson };
/** Optional meta.glass declaration; the host export snapshot is not publication proof. */
export type GlassRegistryPackageMetadata = { readonly version: string; readonly imports: readonly string[]; readonly provenance: 'repository-release' | 'npm-reference' };
export interface GlassRegistryFile { path: string; type: GlassRegistryType; content: string; target: string }
export interface GlassRegistryItemInput {
  name: string;
  type: GlassRegistryType;
  title?: string;
  description?: string;
  author?: string;
  files: readonly GlassRegistryFile[];
  dependencies?: readonly string[];
  devDependencies?: readonly string[];
  registryDependencies?: readonly string[];
  docs?: string;
  categories?: readonly string[];
  /** JSON only. Optional glass:{version,imports,provenance} is checked against policy. */
  meta?: { readonly [key: string]: GlassRegistryJson };
}
export interface GlassRegistryItem extends Readonly<Omit<GlassRegistryItemInput, 'files'>> {
  readonly $schema: 'https://ui.shadcn.com/schema/registry-item.json';
  readonly files: readonly Readonly<GlassRegistryFile>[];
}
export interface GlassRegistryPolicy {
  /** One to eight explicitly host-authorized relative project directories. */
  targetRoots: readonly string[];
  /** Optional declared package-export snapshot, not publication/installation proof. */
  availableExports?: readonly string[];
}
export interface GlassRegistryIssue { readonly path: string; readonly message: string }
export type GlassRegistryValidation = { readonly valid: true; readonly item: GlassRegistryItem } | { readonly valid: false; readonly issues: readonly GlassRegistryIssue[] };
const schema = 'https://ui.shadcn.com/schema/registry-item.json';
const types: readonly GlassRegistryType[] = ['registry:lib', 'registry:style', 'registry:ui', 'registry:component', 'registry:file'];
const semver = '(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)(?:-[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?';
const versionPattern = new RegExp(`^${semver}$`);
const extensionTypes: Record<GlassRegistryType, readonly string[]> = { 'registry:lib': ['ts', 'js', 'mjs'], 'registry:style': ['css'], 'registry:ui': ['tsx', 'jsx', 'ts', 'js'], 'registry:component': ['tsx', 'jsx', 'ts', 'js'], 'registry:file': ['css', 'ts', 'tsx', 'js', 'jsx', 'mjs', 'json', 'md', 'html', 'svg', 'vue', 'svelte'] };
class Invalid extends Error { constructor(readonly path: string, message: string) { super(message); } }
function fail(path: string, message: string): never { throw new Invalid(path, message); }
function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![null, Object.prototype].includes(Object.getPrototypeOf(value))) fail(path, 'Use a plain JSON object');
  const descriptors = Object.getOwnPropertyDescriptors(value), keys = Reflect.ownKeys(descriptors);
  if (keys.length > 40) fail(path, 'Object exceeds 40 fields');
  const output: Record<string, unknown> = Object.create(null);
  for (const key of keys) {
    if (typeof key !== 'string' || ['__proto__', 'prototype', 'constructor'].includes(key) || key.length > 64 || /[\x00-\x1f\x7f]/.test(key)) fail(path, 'Unsupported object key');
    const descriptor = descriptors[key]; if (!('value' in descriptor) || !descriptor.enumerable) fail(`${path}.${key}`, 'Accessors and non-enumerable fields are not supported'); output[key] = descriptor.value;
  }
  return output;
}
function fields(value: Record<string, unknown>, allowed: readonly string[], path: string) { for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(`${path}.${key}`, 'Unsupported field in this registry subset'); }
function array(value: unknown, maximum: number, path: string, minimum = 0): unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length < minimum || value.length > maximum) fail(path, `Use an array containing ${minimum}–${maximum} values`);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).some(key => typeof key !== 'string' || (key !== 'length' && !/^(?:0|[1-9]\d*)$/.test(key)))) fail(path, 'Array custom fields are not supported');
  const result: unknown[] = [];
  for (let index = 0; index < value.length; index++) { const descriptor = descriptors[String(index)]; if (!descriptor || !('value' in descriptor)) fail(`${path}[${index}]`, 'Sparse arrays/accessors are not supported'); result.push(descriptor.value); }
  return result;
}
function string(value: unknown, maximum: number, path: string, multiline = false): string {
  if (typeof value !== 'string' || !value.trim() || value.length > maximum || (multiline ? /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/ : /[\x00-\x1f\x7f]/).test(value)) fail(path, `Use nonempty ${multiline ? 'text' : 'single-line text'} of at most ${maximum} characters`); return value;
}
function utf8(value: string, path: string): number {
  let total = 0;
  for (let index = 0; index < value.length; index++) { const char = value.charCodeAt(index); if (char === 0) fail(path, 'NUL bytes are not supported'); if (char < 128) total++; else if (char < 2048) total += 2; else if (char >= 0xd800 && char <= 0xdbff) { const next = value.charCodeAt(++index); if (!(next >= 0xdc00 && next <= 0xdfff)) fail(path, 'Unpaired Unicode surrogates are not supported'); total += 4; } else { if (char >= 0xdc00 && char <= 0xdfff) fail(path, 'Unpaired Unicode surrogates are not supported'); total += 3; } }
  return total;
}
function name(value: unknown, path: string) { const result = string(value, 64, path); if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(result)) fail(path, 'Use a lowercase kebab-case registry name'); return result; }
function safePath(value: unknown, path: string): string {
  const result = string(value, 240, path);
  const segments = result.split('/');
  if (segments.some(segment => !/^[A-Za-z0-9_-][A-Za-z0-9_.-]*$/.test(segment) || segment.endsWith('.') || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(segment))) fail(path, 'Use a relative ASCII path without hidden/traversal/encoded/reserved segments');
  if (segments.some(segment => ['__proto__', 'constructor', 'prototype', 'node_modules'].includes(segment.toLowerCase()))) fail(path, 'Reserved path segments are not supported');
  const file = segments.at(-1)!;
  if (/^(?:package(?:-lock)?\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?|(?:ts|js)config.*\.json|credentials?\..*|secrets?\..*|.*\.config\..*)$/i.test(file)) fail(path, 'Secret/package/config destinations are outside this subset');
  return result;
}
function exactVersion(value: unknown, path: string) {
  const result = string(value, 96, path); if (!versionPattern.test(result) || result.split('+')[0].split('-').slice(1).join('-').split('.').some(part => /^\d+$/.test(part) && part.length > 1 && part.startsWith('0'))) fail(path, 'Use an exact semantic version, not a range/tag/URL'); return result;
}
function packageDependency(value: unknown, path: string) {
  const result = string(value, 310, path), at = result.lastIndexOf('@'), packageName = result.slice(0, at);
  if (at <= 0 || !/^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/.test(packageName) || packageName.length > 214) fail(path, 'Use an explicitly pinned npm package name@version'); exactVersion(result.slice(at + 1), path); return { value: result, name: packageName };
}
function registryReference(value: unknown, path: string) {
  const result = string(value, 400, path);
  if (/^@[a-z][a-z0-9-]*\/[a-z][a-z0-9-]*$/.test(result)) return result;
  const github = /^([A-Za-z0-9_-]+)\/([A-Za-z0-9_.-]+)\/([a-z][a-z0-9-]*)#(.+)$/.exec(result);
  if (github) { safePath(github.slice(1, 4).join('/'), path); if (/^[a-f0-9]{40}$/i.test(github[4])) return result; exactVersion(github[4].replace(/^v/, ''), path); return result; }
  if (!result.startsWith('https://') || /[\\%\s]/.test(result) || /(?:^|\/)\.{1,2}(?:\/|$)/.test(result)) fail(path, 'Use an explicit namespaced item, individually pinned GitHub ref, or HTTPS JSON URL');
  let url: URL; try { url = new URL(result); } catch { fail(path, 'Invalid registry URL'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || !url.pathname.endsWith('.json')) fail(path, 'Registry URLs must be credential/query/fragment-free HTTPS JSON addresses'); safePath(url.pathname.slice(1), path); return url.href;
}
function exportPath(value: unknown, path: string) { const result = string(value, 160, path); if (!/^@wpsydev\/liquid-glass(?:\/[a-z][a-z0-9-]*(?:\.css)?){0,4}$/.test(result)) fail(path, 'Use an explicit safe Liquid Glass package entrypoint'); return result; }
function metadata(value: unknown, path: string, depth = 0, count = { nodes: 0 }): GlassRegistryJson {
  if (++count.nodes > 256 || depth > 5) fail(path, 'Metadata exceeds 256 values or five nesting levels');
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'number') { if (!Number.isFinite(value)) fail(path, 'Metadata numbers must be finite'); return value; }
  if (typeof value === 'string') { if (value.length > 4000 || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value)) fail(path, 'Metadata text exceeds bounds'); return value; }
  if (Array.isArray(value)) return Object.freeze(array(value, 64, path).map((child, index) => metadata(child, `${path}[${index}]`, depth + 1, count)));
  const input = record(value, path), output: Record<string, GlassRegistryJson> = {};
  for (const key of Object.keys(input).sort()) output[key] = metadata(input[key], `${path}.${key}`, depth + 1, count); return Object.freeze(output);
}
function normalize(value: unknown, policy: GlassRegistryPolicy, allowMissingSchema: boolean): GlassRegistryItem {
  const guard = record(policy, 'policy'); fields(guard, ['targetRoots', 'availableExports'], 'policy');
  const roots = array(guard.targetRoots, 8, 'policy.targetRoots', 1).map((root, index) => safePath(root, `policy.targetRoots[${index}]`));
  const exports = new Set(guard.availableExports === undefined ? [] : array(guard.availableExports, 128, 'policy.availableExports').map((entry, index) => exportPath(entry, `policy.availableExports[${index}]`)));
  const input = record(value, 'item'); fields(input, ['$schema', 'name', 'type', 'title', 'description', 'author', 'files', 'dependencies', 'devDependencies', 'registryDependencies', 'docs', 'categories', 'meta'], 'item');
  if ((!allowMissingSchema && input.$schema !== schema) || (input.$schema !== undefined && input.$schema !== schema)) fail('item.$schema', 'Use the official registry-item schema URL');
  const type = input.type as GlassRegistryType; if (!types.includes(type)) fail('item.type', 'Unsupported registry type in this authored-file subset');
  let sourceBytes = 0; const paths = new Set<string>(), targets = new Set<string>();
  const files = array(input.files, 32, 'item.files', 1).map((entry, index) => {
    const at = `item.files[${index}]`, file = record(entry, at); fields(file, ['path', 'type', 'content', 'target'], at);
    const path = safePath(file.path, `${at}.path`), target = safePath(file.target, `${at}.target`), type = file.type as GlassRegistryType;
    if (!roots.some(root => target.startsWith(`${root}/`))) fail(`${at}.target`, 'Target must stay below an explicitly authorized project directory');
    const extension = path.split('.').at(-1)!.toLowerCase(); if (!types.includes(type) || !extensionTypes[type].includes(extension) || target.split('.').at(-1)!.toLowerCase() !== extension) fail(`${at}.type`, 'File type and source/target extensions must agree in this subset');
    if (typeof file.content !== 'string' || file.content.length > 65536 || !file.content.trim()) fail(`${at}.content`, 'Supply nonempty original content of at most 64KiB per file');
    const bytes = utf8(file.content, `${at}.content`); sourceBytes += bytes; if (bytes > 65536 || sourceBytes > 262144) fail(`${at}.content`, 'Maximum 64KiB per file and 256KiB total UTF-8 source');
    if (paths.has(path.toLowerCase()) || targets.has(target.toLowerCase())) fail(at, 'Source paths and file targets must be unique, including case-insensitive collisions'); paths.add(path.toLowerCase()); targets.add(target.toLowerCase());
    return Object.freeze({ path, type, content: file.content, target });
  }).sort((a, b) => a.target < b.target ? -1 : a.target > b.target ? 1 : a.path < b.path ? -1 : 1);
  const output: Record<string, unknown> = { $schema: schema, name: name(input.name, 'item.name'), type, files: Object.freeze(files) };
  for (const [key, limit] of [['title', 120], ['description', 2000], ['author', 160], ['docs', 4000]] as const) if (input[key] !== undefined) output[key] = string(input[key], limit, `item.${key}`, key === 'docs' || key === 'description');
  const packages = new Set<string>();
  for (const key of ['dependencies', 'devDependencies'] as const) if (input[key] !== undefined) output[key] = Object.freeze(array(input[key], 32, `item.${key}`).map((entry, index) => { const dependency = packageDependency(entry, `item.${key}[${index}]`); if (packages.has(dependency.name)) fail(`item.${key}[${index}]`, 'Declare each npm package once with one exact version and runtime/dev classification'); packages.add(dependency.name); return dependency.value; }).sort());
  if (input.registryDependencies !== undefined) { const references = array(input.registryDependencies, 32, 'item.registryDependencies').map((entry, index) => registryReference(entry, `item.registryDependencies[${index}]`)); if (new Set(references).size !== references.length) fail('item.registryDependencies', 'Registry references must be unique'); output.registryDependencies = Object.freeze(references.sort()); }
  if (input.categories !== undefined) { const categories = array(input.categories, 16, 'item.categories').map((entry, index) => name(entry, `item.categories[${index}]`)); if (new Set(categories).size !== categories.length) fail('item.categories', 'Categories must be unique'); output.categories = Object.freeze(categories.sort()); }
  if (input.meta !== undefined) {
    record(input.meta, 'item.meta'); const meta = metadata(input.meta, 'item.meta') as Record<string, GlassRegistryJson>;
    if (utf8(JSON.stringify(meta), 'item.meta') > 16384) fail('item.meta', 'Maximum 16KiB JSON metadata');
    if (meta.glass !== undefined) { const glass = record(meta.glass, 'item.meta.glass'); fields(glass, ['version', 'imports', 'provenance'], 'item.meta.glass'); exactVersion(glass.version, 'item.meta.glass.version'); if (!['repository-release', 'npm-reference'].includes(glass.provenance as string)) fail('item.meta.glass.provenance', 'Declare repository-release or npm-reference provenance; neither proves publication');
      const imports = array(glass.imports, 32, 'item.meta.glass.imports').map((entry, index) => exportPath(entry, `item.meta.glass.imports[${index}]`)); if (new Set(imports).size !== imports.length || imports.some(entry => !exports.has(entry))) fail('item.meta.glass.imports', 'Imports must be unique members of the host-declared availableExports snapshot'); }
    output.meta = meta;
  }
  if (utf8(JSON.stringify(output), 'item') > 1048576) fail('item', 'Maximum 1MiB serialized registry payload'); return Object.freeze(output) as unknown as GlassRegistryItem;
}

/**
 * Original bounded authoring subset of https://ui.shadcn.com/schema/registry-item.json.
 * All files include inline content and explicit safe relative targets. No alias/~
 * placeholders, envVars, config merging, remote fetching, filesystem reads, installs
 * or code execution. Dependencies/exports/versions are host declarations, not proof
 * of package existence, rights, publication, agent discovery or CLI compatibility.
 * Validate with the upstream schema and a disposable CLI project separately. Safe
 * JSON paths are not a filesystem/symlink sandbox, code audit or npm-script sandbox.
 */
export function createGlassRegistryItem(input: GlassRegistryItemInput, policy: GlassRegistryPolicy): GlassRegistryItem {
  try { return normalize(input, policy, true); } catch (error) { if (error instanceof Invalid) throw new RangeError(`${error.path}: ${error.message}`); throw error; }
}
/** First failure only, bounded and nonthrowing for ordinary malformed JSON values. */
export function validateGlassRegistryItem(value: unknown, policy: GlassRegistryPolicy): GlassRegistryValidation {
  try { return Object.freeze({ valid: true, item: normalize(value, policy, false) }); } catch (error) { return Object.freeze({ valid: false, issues: Object.freeze([Object.freeze(error instanceof Invalid ? { path: error.path, message: error.message } : { path: 'item', message: 'Unsupported object: supply ordinary JSON data without proxies/accessors' })]) }); }
}

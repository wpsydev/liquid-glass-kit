import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const officialVersion = '0.4.0';
const argumentsList = process.argv.slice(2);
const argument = key => { const index = argumentsList.indexOf(key); return index < 0 ? undefined : argumentsList[index + 1]; };
const work = await mkdtemp(join(tmpdir(), 'lg-design-contract-'));
const validator = argument('--validator-dir') ? resolve(argument('--validator-dir')) : join(work, 'validator');
const output = resolve(argument('--output') ?? join(root, 'docs/resource-series/design-contract-validation.json'));
const run = (command, args, cwd = root) => {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
  if (result.error) throw result.error;
  return result;
};
if (!argument('--validator-dir')) {
  const installed = run('npm', ['install', '--prefix', validator, '--ignore-scripts', '--no-audit', '--no-fund', `@google/design.md@${officialVersion}`]);
  if (installed.status !== 0) throw new Error(`Official isolated development linter installation failed: ${installed.stderr}`);
}
const packageRoot = join(validator, 'node_modules/@google/design.md');
const packageJSON = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'));
if (packageJSON.version !== officialVersion) throw new Error(`Expected official linter ${officialVersion}; found ${packageJSON.version}`);
const compiled = join(work, 'compiled');
await mkdir(compiled, { recursive: true }); await writeFile(join(compiled, 'package.json'), '{"type":"module"}\n');
const compilation = run(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), '--ignoreConfig', '--target', 'ES2022', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', '--strict', '--skipLibCheck', '--outDir', compiled, join(root, 'src/design-contract.ts')]);
if (compilation.status !== 0) throw new Error(`Isolated contract compilation failed: ${compilation.stdout}${compilation.stderr}`);
const { createGlassDesignContract, parseGlassDesignContract } = await import(pathToFileURL(join(compiled, 'design-contract.js')).href);
const configurations = [
  { name: 'Field Notes', description: 'A warm reading workspace with restrained terracotta signals', tokens: { colors: { background: '#f5f1e9', foreground: '#262922', primary: '#a34024', accent: '#68755b' }, fontFamily: 'Georgia, serif', radius: 14 }, material: { blur: 16, appearance: 'light' } },
  { name: 'Command Room', description: 'A focused night workspace with clear operational hierarchy', tokens: { colors: { background: '#151e2b', foreground: '#eef3f8', primary: '#8ac7ff', accent: '#ffb567' }, radius: 22 }, material: { blur: 18, appearance: 'dark' } },
  { name: 'Mono Atelier', description: 'A precise studio for notes and code, with a quiet green signal', tokens: { colors: { background: '#f7f7f2', foreground: '#101116', primary: '#53635c', accent: '#846958' }, fontFamily: 'ui-monospace, SFMono-Regular, monospace', radius: 4, spacing: { sm: 6, md: 12, lg: 20 } }, material: { blur: 8, appearance: 'light' } },
];
const results = [];
for (const config of configurations) {
  const contract = createGlassDesignContract(config), markdown = contract.toDesignMarkdown();
  const file = join(work, `${contract.id}.DESIGN.md`); await writeFile(file, markdown);
  const lint = run(process.execPath, [join(packageRoot, packageJSON.bin.designmd), 'lint', '--format', 'json', file]);
  let report;
  try { report = JSON.parse(lint.stdout); } catch { report = { unparsableOutput: lint.stdout, stderr: lint.stderr }; }
  const roundtrip = parseGlassDesignContract(contract.toJSON());
  results.push({ name: config.name, markdownSHA256: createHash('sha256').update(markdown).digest('hex'), markdownBytes: Buffer.byteLength(markdown),
    officialCLIExitCode: lint.status, officialReport: report, stderr: lint.stderr,
    roundtrip: { json: roundtrip.toJSON() === contract.toJSON(), markdown: roundtrip.toDesignMarkdown() === markdown, css: roundtrip.toThemeCSS() === contract.toThemeCSS() }, ownValidation: contract.validate() });
}
const evidence = { observedAt: new Date().toISOString(), tool: '@google/design.md', version: packageJSON.version,
  provenance: 'Official npm CLI installed in an isolated temporary development project; not a library runtime or repository dependency',
  specification: 'https://github.com/google-labs-code/design.md/blob/main/docs/spec.md', command: 'node scripts/validate-design-contract.mjs',
  limitations: ['Checks exported document structure and tokens, not agent adherence or rendered translucent UI accessibility', 'Official DESIGN.md format and CLI remain evolving; this records the pinned version and exact reports'], results };
await mkdir(dirname(output), { recursive: true }); await writeFile(output, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ output, tool: evidence.tool, version: evidence.version, results: results.map(({ name, officialCLIExitCode, roundtrip }) => ({ name, officialCLIExitCode, roundtrip })) }, null, 2));
if (results.some(result => result.officialCLIExitCode !== 0 || Object.values(result.roundtrip).some(value => !value))) process.exitCode = 1;

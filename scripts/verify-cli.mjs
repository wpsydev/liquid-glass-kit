/** Exercise the actual distributed Node binary; runtime code never spawns commands. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { access, readFile, mkdtemp, writeFile, rm, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
assert.equal(pkg.bin['liquid-glass'], './dist/cli.js');
await access(pkg.bin['liquid-glass']);
const source = await readFile(pkg.bin['liquid-glass'], 'utf8');
assert.ok(source.startsWith('#!/usr/bin/env node\n'));
assert.ok((await stat(pkg.bin['liquid-glass'])).mode & 0o111);
const notices = await readFile('dist/cli.LICENSE.txt', 'utf8');
for (const library of ['@lezer/css', '@lezer/common', '@lezer/lr', '@lezer/highlight']) {
  assert.ok(notices.includes(library));
  const metadata = JSON.parse(await readFile(`node_modules/${library}/package.json`, 'utf8'));
  assert.ok(notices.includes(metadata.version));
  assert.ok(notices.includes(await readFile(`node_modules/${library}/LICENSE`, 'utf8')));
}
const root = await mkdtemp(join(tmpdir(), 'glass-cli-distribution-'));
const bin = resolve(pkg.bin['liquid-glass']);
function command(args, input = '') {
  return new Promise((resolveResult, reject) => {
    const child = spawn(process.execPath, [bin, ...args], { cwd: root, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
    child.stdout.on('data', value => { stdout += value; });
    child.stderr.on('data', value => { stderr += value; });
    child.on('error', reject); child.on('close', code => resolveResult({ code, stdout, stderr }));
    child.stdin.end(input);
  });
}
try {
  assert.equal((await command(['--version'])).stdout, pkg.version + '\n');
  assert.equal((await command(['--help'])).code, 0);
  await writeFile(join(root, 'source.css'), '.surface { border-raduis: 20px; transition: all 200ms; }');
  const findings = await command(['lint', 'source.css', '--format', 'json']);
  assert.equal(findings.code, 1); assert.equal(findings.stderr, '');
  assert.deepEqual(JSON.parse(findings.stdout).files[0].diagnostics.map(value => value.rule), ['property-typo', 'explicit-transition']);
  const clean = await command(['lint', '--stdin', '--format', 'json'], '.surface { border-radius: 20px; }');
  assert.equal(clean.code, 0); assert.equal(JSON.parse(clean.stdout).summary.checked, 1);
  const missing = await command(['lint', 'missing.css', '--format', 'json']);
  assert.equal(missing.code, 2); assert.equal(JSON.parse(missing.stdout).summary.errors, 1);
  const advisory = await command(['hook', 'claude-post-tool-use', '--root', root], JSON.stringify({ hook_event_name: 'PostToolUse', tool_name: 'Write', tool_input: { file_path: join(root, 'source.css') } }));
  assert.equal(advisory.code, 0); assert.equal(JSON.parse(advisory.stdout).hookSpecificOutput.hookEventName, 'PostToolUse');
  assert.ok(!advisory.stdout.includes(root));
  for (const name of ['index', 'material', 'dom']) assert.ok(!(await readFile(`dist/${name}.js`, 'utf8')).includes('@lezer/'));
} finally { await rm(root, { recursive: true, force: true }); }
console.log('Distributed CLI: shebang/version, actual file/stdin exit codes, advisory JSON and all parser notices passed.');

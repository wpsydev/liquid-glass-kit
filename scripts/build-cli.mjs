/** Bundle the optional Node command and retain notices for every bundled parser package. */
import { rolldown } from 'rolldown';
import { readFile, writeFile, mkdir, chmod } from 'node:fs/promises';
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const bundle = await rolldown({ input: 'tooling/cli.ts', platform: 'node' });
try {
  const output = await bundle.generate({
    format: 'esm', minify: true,
    banner: `#!/usr/bin/env node\n/* Optional developer command. Bundled parser notices: cli.LICENSE.txt. */\nconst __GLASS_CLI_VERSION__=${JSON.stringify(pkg.version)};`,
  });
  await mkdir('dist', { recursive: true });
  await writeFile('dist/cli.js', output.output.find(file => file.type === 'chunk').code + '\n');
  await chmod('dist/cli.js', 0o755);
} finally { await bundle.close(); }
const notices = [];
for (const library of ['@lezer/css', '@lezer/common', '@lezer/lr', '@lezer/highlight']) {
  const metadata = JSON.parse(await readFile(`node_modules/${library}/package.json`, 'utf8'));
  const license = await readFile(`node_modules/${library}/LICENSE`, 'utf8');
  notices.push(`${library} ${metadata.version}\n${license}`);
}
await writeFile('dist/cli.LICENSE.txt', notices.join('\n\n'));

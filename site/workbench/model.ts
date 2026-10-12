import { inspectGlassCSS as inspect, glassCSSParser } from '../../tooling/css-checker.js';
import type { GlassCSSDiagnostic as Problem } from '../../tooling/css-checker.js';

import {type Workspace} from './state.js';

export { inspect };
export type { Problem };
export function fixSurface(source: string) {
  // Only replace spans diagnosed by the linter, leaving comments/string text alone.
  for (const issue of inspect(source).filter(p => p.rule === 'property-typo' || p.rule === 'explicit-transition').sort((a, b) => b.from - a.from)) {
    source = source.slice(0, issue.from) + (issue.rule === 'property-typo' ? 'border-radius' : 'transition: border-radius') + source.slice(issue.to);
  }
  return source;
}
export function tokens(source: string) {
  // Restricted numeric/color tokens only. Never inject arbitrary CSS or run code.
  const result = {corner:24,accent:'#b8ecc9',padding:24};
  if (source.length > 64000) return result;
  glassCSSParser.parse(source).iterate({enter(node) {
    if (node.name !== 'Declaration') return;
    const declaration = source.slice(node.from, node.to);
    const size = /^(--corner|padding)\s*:\s*(\d+(?:\.\d+)?)px$/.exec(declaration);
    const color = /^--accent\s*:\s*(#[a-f\d]{6})$/i.exec(declaration);
    if (size?.[1] === '--corner') result.corner = Math.min(48, Math.max(0, Number(size[2])));
    else if (size) result.padding = Math.min(36, Math.max(12, Number(size[2])));
    if (color) result.accent = color[1];
  }});
  return result;
}
export function runCommand(workspace: Workspace, command: string): string {
  const [name, ...args] = command.trim().split(/\s+/);
  switch (name) {
    case 'help': return 'Local commands:\nhelp · ls · cat surface.css · lint · fix\ntokens · branch [name] · theme · split · clear\nNo operating-system shell or network commands.';
    case 'ls': return 'surface.css\nREADME.md';
    case 'cat': return args.join(' ') === 'surface.css' ? workspace.source : args.join(' ') === 'README.md' ? 'Glass Workbench: in-memory CSS editing, lint and token preview. Changes are not saved after reload.' : 'Usage: cat surface.css | cat README.md';
    case 'lint': { const issues = inspect(workspace.source); return issues.length ? issues.map(p => `surface.css:${p.line} ${p.severity}\n  ${p.message}`).join('\n') : '✓ surface.css — no diagnostics in the configured rules'; }
    case 'fix': { workspace.source = fixSurface(workspace.source); const count = inspect(workspace.source).length; return count ? `Applied known fixes. ${count} diagnostic(s) remain.` : '✓ Applied known fixes. Configured rules pass.'; }
    case 'tokens': { const t = tokens(workspace.source); return `corner  ${t.corner}px\naccent  ${t.accent}\npadding ${t.padding}px`; }
    case 'branch': {
      if (!args.length) return [...workspace.branches.keys()].map(b => `${b === workspace.branch ? '*' : ' '} ${b}`).join('\n');
      if (args.length !== 1 || !/^[a-zA-Z0-9][\w/-]{0,39}$/.test(args[0])) return 'Use branch NAME (1–40 letters, digits, _, / or -).';
      workspace.branches.set(workspace.branch, workspace.source);
      workspace.source = workspace.branches.get(args[0]) ?? workspace.source;
      workspace.branch = args[0]; workspace.branches.set(workspace.branch, workspace.source);
      return `⑂ Switched to ${workspace.branch}\nIndependent in-memory edits. This is not a Git worktree.`;
    }
    case 'theme': workspace.light = !workspace.light; return `Preview theme: ${workspace.light ? 'light' : 'dark'}`;
    case 'split': workspace.split = !workspace.split; return workspace.split ? 'Second terminal opened.' : 'Second terminal hidden.';
    case 'clear': return '';
    case '': return '';
    default: return `Unknown command: ${name}. Try help.\nThis demo does not execute shell commands.`;
  }
}

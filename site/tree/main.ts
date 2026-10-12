import { mountGlassResourceTree } from '../../src/resource-tree.js';
import type { GlassResourceNode } from '../../src/resource-tree.js';
import './style.css';

const query = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
type Project = { title: string; nodes: GlassResourceNode[]; expanded: string[]; selected: string; files: Record<string, string> };
const projects: Record<string, Project> = {
  lumen: { title: 'Lumen / material library', selected: 'lumen-navigation', expanded: ['lumen', 'lumen-src', 'lumen-ui', 'lumen-docs'], nodes: [{ id: 'lumen', label: 'lumen', children: [
    { id: 'lumen-readme', label: 'README.md', status: 'Reviewed' },
    { id: 'lumen-src', label: 'src', children: [{ id: 'lumen-material', label: 'material.ts', status: 'Modified' }, { id: 'lumen-motion', label: 'motion.ts' }, { id: 'lumen-ui', label: 'ui', children: [{ id: 'lumen-navigation', label: 'navigation.ts', status: 'Ready' }, { id: 'lumen-composer', label: 'composer.ts' }] }] },
    { id: 'lumen-docs', label: 'docs', children: [{ id: 'lumen-guide', label: 'getting-started.md' }, { id: 'lumen-mobile', label: 'mobile.md', status: 'Reviewed' }, { id: 'lumen-accessibility', label: 'accessibility.md' }] },
    { id: 'lumen-tests', label: 'tests', children: [{ id: 'lumen-unit', label: 'material.test.ts' }, { id: 'lumen-keyboard', label: 'keyboard.test.ts', status: 'Ready' }, { id: 'lumen-performance', label: 'performance.md' }] },
    { id: 'lumen-assets', label: 'assets', children: [{ id: 'lumen-palette', label: 'palette.json' }, { id: 'lumen-private-preview', label: 'private-preview.png', disabled: true, status: 'Unavailable' }] },
    { id: 'lumen-env', label: '.env.local', disabled: true, status: 'Host only' },
  ] }], files: {
    'lumen-readme': '# Lumen\n\nA small workspace for reading, notes and useful controls.\n\n- Keep content semantic\n- Start with portable CSS\n- Add motion to one interaction at a time\n- Keep the opaque fallback usable\n\nThis is an original sample inventory, not a repository checkout.',
    'lumen-navigation': "import '@wpsydev/liquid-glass/material.css';\n\n// The host owns routes and selected state.\nexport function navigationLabel(section: string) {\n  return section === 'notes' ? 'Your notes' : 'Overview';\n}\n\n// Use native links or buttons in the actual view.\n// Material adds presentation, not authorization.\nconst sections = ['overview', 'sources', 'notes'];\n\nexport { sections };",
    'lumen-material': "import { getGlassProps } from '@wpsydev/liquid-glass/material';\n\nexport const readingSurface = getGlassProps({\n  variant: 'regular',\n  appearance: 'light',\n  radius: 18,\n  blur: 16,\n  refraction: 0,\n});\n\n// Spread attributes and apply style variables.\n// Check contrast on the actual page backdrop.",
    'lumen-motion': "// Attach optional motion after the host mounts its element.\n// Keep semantic content visible during server rendering.\n\nconst preferences = { reducedMotion: true };\n\n// The host keeps ownership of focus and application state.\n// Destroy any optional controller when its view is removed.\nexport { preferences };",
    'lumen-composer': "// A composer is still a native form.\nconst state = { draft: '', submitting: false };\n\nexport function updateDraft(next: string) {\n  state.draft = next;\n}\n\n// Validate, authorize and submit in the host application.\n// Decorative feedback never means a server action succeeded.",
    'lumen-guide': '# Start small\n\n1. Render a meaningful heading and native controls\n2. Import the portable material stylesheet\n3. Add lg-glass where it creates a useful hierarchy\n4. Check narrow screens, focus and the opaque fallback',
    'lumen-mobile': '# Mobile review\n\n- Exercise 320px, 390px and short landscape layouts\n- Keep touch targets at least 44 CSS pixels\n- Keep inputs at least 16 CSS pixels\n- Preserve zoom and native scrolling\n- Test safe areas and the virtual keyboard',
    'lumen-accessibility': '# Accessibility review\n\nSelection, focus and disclosure are separate states.\n\nKeep names and status text available to assistive technology.\nDo not rely on color or animation alone.\nAn opaque color-pair check cannot certify translucent UI.',
    'lumen-unit': '// Unit checks describe logic, not real-device rendering.\n// Assert bounded options and cleanup.\n// Keep browser validation as separate evidence.',
    'lumen-keyboard': '// Review actual tree keyboard behavior in the browser.\n// Arrow keys move focus; Enter or Space selects.\n// Home and End target visible enabled resources.\n// Collapsing a focused descendant rescues focus to its ancestor.',
    'lumen-performance': '# Performance fixture\n\nRecord node count, depth and expanded branches.\nMeasure mounting, filtering and keyboard navigation separately.\nThe tree renders bounded nodes; it is not a virtualized filesystem.\nSubmission counts are not an FPS benchmark.',
    'lumen-palette': '{\n  "canvas": "#f3f6fb",\n  "ink": "#202c41",\n  "signal": "#356aa7",\n  "meaning": "quiet reading with clear selected state"\n}',
  } },
  northstar: { title: 'Northstar / product story', selected: 'northstar-storyboard', expanded: ['northstar', 'northstar-product', 'northstar-inventory', 'northstar-playback'], nodes: [{ id: 'northstar', label: 'northstar', children: [
    { id: 'northstar-overview', label: 'overview.md', status: 'Reviewed' },
    { id: 'northstar-product', label: 'product', children: [{ id: 'northstar-decisions', label: 'decisions.md' }, { id: 'northstar-spec', label: 'interaction-spec.md', status: 'Ready' }] },
    { id: 'northstar-inventory', label: 'inventory', children: [{ id: 'northstar-components', label: 'components.json' }, { id: 'northstar-layouts', label: 'layouts.md' }, { id: 'northstar-tokens', label: 'tokens.json' }] },
    { id: 'northstar-playback', label: 'playback', children: [{ id: 'northstar-storyboard', label: 'storyboard.md', status: 'Modified' }, { id: 'northstar-camera', label: 'camera.md' }, { id: 'northstar-music', label: 'music.md' }] },
    { id: 'northstar-tests', label: 'checks', children: [{ id: 'northstar-touch', label: 'touch.md' }, { id: 'northstar-contrast', label: 'contrast.md' }] },
    { id: 'northstar-private', label: 'private', disabled: true, status: 'Unavailable', children: [{ id: 'northstar-metrics', label: 'metrics.json', disabled: true }] },
    { id: 'northstar-license', label: 'LICENSE' }, { id: 'northstar-release', label: 'release.md', status: 'Ready' },
  ] }], files: {
    'northstar-overview': '# Northstar\n\nA focused product story with a clear reading rhythm.\n\nShow one useful interaction at a time.\nUse expressive art around the content, not behind every sentence.\nKeep the static story complete without motion.',
    'northstar-decisions': '# Decisions\n\n- Give the content a calm foundation\n- Use one accent for the main action\n- Keep section navigation stable on touch\n- Reserve blur for one small control layer',
    'northstar-spec': '# Interaction states\n\nDefault → focus → selected → pending → completed\n\nThe host reports real completion.\nFeedback is supplementary to a textual state label.\nRespect reduced motion and keep the error path usable.',
    'northstar-components': '{\n  "reading": "semantic article",\n  "navigation": "native links",\n  "disclosure": "host-owned details",\n  "glass": "one small control shell"\n}',
    'northstar-layouts': '# Composition\n\nUse a responsive content-and-media split.\nLet narrow layouts stack in source order.\nKeep paragraph line length bounded.\nBalance only short headings; inherit real application fonts.',
    'northstar-tokens': '{\n  "spacing": [4, 8, 16, 24, 40],\n  "corners": 18,\n  "motion": "subtle and finite"\n}',
    'northstar-storyboard': '# A twelve-second story\n\n00–03  show the useful context\n03–06  reveal one working interaction\n06–09  change the host state\n09–12  show the outcome and a real link\n\nOriginal footage. Original music.\nNo simulated performance or adoption numbers.',
    'northstar-camera': '# Capture\n\nRecord the working browser demo.\nKeep labels legible on a phone.\nAvoid cursor theatre and tiny side panels.\nMake the first frame useful with the sound off.',
    'northstar-music': '# Score\n\nUse an original finite score.\nTry a restrained broken-beat rhythm instead of another identical loop.\nKeep the motion readable without audio.\nDo not reuse reference videos or their music.',
    'northstar-touch': '# Touch check\n\nStable targets, native scrolling, visible focus.\nConfirm no interaction depends on hover.\nTry narrow portrait and short landscape layouts.',
    'northstar-contrast': '# Readability\n\nCheck every actual foreground/background state.\nOpaque token ratios are useful preflight evidence.\nThey do not prove contrast over arbitrary moving imagery.',
    'northstar-license': 'Original sample content created for this demo.\nShared under the library MIT license.\nNo third-party screenshots, fonts or audio are included.',
    'northstar-release': '# Release checklist\n\n- Check actual package exports\n- Run unit and browser checks separately\n- Keep benchmark fixtures explicit\n- Publish working artifacts before promoting them',
  } },
};
let projectId = 'lumen', filter = '', currentText = '';
const host = query('#tree-host'), workspace = query('.workspace');
const flatten = (nodes: readonly GlassResourceNode[], trail: string[] = [], entries = new Map<string, { node: GlassResourceNode; path: string[] }>()) => {
  for (const node of nodes) { entries.set(node.id, { node, path: [...trail, node.label] }); if (node.children) flatten(node.children, [...trail, node.label], entries); } return entries;
};
let entries = flatten(projects.lumen.nodes);
const glyph = (branch: boolean) => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true'); svg.classList.add('file-glyph');
  const path = document.createElementNS(svg.namespaceURI, 'path'); path.setAttribute('d', branch ? 'M3 6h6l2 2h10v11H3z M3 6V4h6l2 2' : 'M6 3h8l4 4v14H6z M14 3v5h4 M9 12h6 M9 16h6');
  path.setAttribute('fill', 'none'); path.setAttribute('stroke', 'currentColor'); path.setAttribute('stroke-width', '1.4'); path.setAttribute('stroke-linejoin', 'round'); svg.append(path); return svg;
};
const decorate = () => {
  for (const row of host.querySelectorAll<HTMLElement>('[data-resource-row]')) {
    const entry = entries.get(row.dataset.resourceRow!); if (!entry) continue;
    row.querySelector('.lg-resource-content')!.prepend(glyph(Boolean(entry.node.children)));
    if (entry.node.children) row.dataset.kind = 'folder';
    const status = row.querySelector<HTMLElement>('.lg-resource-status'); if (status) status.dataset.tone = entry.node.status === 'Modified' ? 'changed' : entry.node.disabled ? 'unavailable' : 'ready';
  }
};
const paint = (id: string | null) => {
  const content = query('#preview-content'); content.replaceChildren();
  const entry = id ? entries.get(id) : undefined; currentText = '';
  query<HTMLButtonElement>('#copy').disabled = !entry || Boolean(entry.node.children);
  if (!entry) {
    query('#file-name').textContent = 'No selected sample'; query('#breadcrumbs').textContent = 'Select a visible resource'; query('#file-meta').textContent = 'Local presentation only';
    const title = document.createElement('h2'); title.textContent = 'A clear space to read.'; const text = document.createElement('p'); text.textContent = filter ? 'The selected sample is not in this host-filtered snapshot. Try another file or clear the filter.' : 'Choose a file from the inventory.';
    const empty = document.createElement('div'); empty.className = 'empty-preview'; empty.append(title, text); content.append(empty); return;
  }
  const { node, path } = entry; query('#file-name').textContent = node.label; query('#breadcrumbs').textContent = path.join(' / ');
  if (node.children) {
    const wrapper = document.createElement('div'); wrapper.className = 'folder-preview'; const h2 = document.createElement('h2'); h2.textContent = node.label; const note = document.createElement('p'); note.textContent = `${node.children.length} original samples in this branch`;
    const list = document.createElement('ul'); for (const child of node.children) {
      const item = document.createElement('li'), button = document.createElement('button'); button.type = 'button'; button.disabled = Boolean(child.disabled); button.append(glyph(Boolean(child.children)), document.createTextNode(child.label)); button.addEventListener('click', () => tree.select(child.id)); item.append(button); list.append(item);
    }
    wrapper.append(h2, note, list); content.append(wrapper); query('#file-meta').textContent = 'Sample inventory · no directory access';
  } else {
    currentText = projects[projectId].files[id!] ?? 'This sample is unavailable in the host inventory.';
    const listing = document.createElement('div'); listing.className = 'code-listing'; const numbers = document.createElement('div'); numbers.className = 'line-numbers'; numbers.setAttribute('aria-hidden', 'true'); numbers.textContent = currentText.split('\n').map((_, index) => String(index + 1)).join('\n');
    const pre = document.createElement('pre'), code = document.createElement('code'); code.textContent = currentText; pre.append(code); listing.append(numbers, pre); content.append(listing);
    query('#file-meta').textContent = `${node.label.endsWith('.ts') ? 'TypeScript' : node.label.endsWith('.json') ? 'JSON' : 'Plain text'} · ${currentText.split('\n').length} lines · local sample`;
  }
  query('#selection-status').textContent = `${node.label} selected`;
};
const callbacks = { onSelect(id: string) { paint(id); }, onExpand(id: string, expanded: boolean) { query('#selection-status').textContent = `${entries.get(id)?.node.label ?? id} ${expanded ? 'expanded' : 'collapsed'}`; } };
const tree = mountGlassResourceTree(host, { nodes: projects.lumen.nodes, label: 'Project resources', selectedId: projects.lumen.selected, expandedIds: projects.lumen.expanded, ...callbacks });
decorate(); paint(tree.selectedId);
const filtered = (nodes: readonly GlassResourceNode[], text: string): GlassResourceNode[] => nodes.flatMap(node => {
  if (!text || `${node.label} ${node.status ?? ''}`.toLowerCase().includes(text)) return [node];
  const children = node.children ? filtered(node.children, text) : undefined; return children?.length ? [{ ...node, children }] : [];
});
const applyFilter = (text: string) => {
  filter = text.trim().toLowerCase(); query<HTMLInputElement>('#filter').value = text;
  const nodes = filtered(projects[projectId].nodes, filter); entries = flatten(nodes); tree.update({ nodes, label: 'Project resources', ...callbacks }); decorate(); paint(tree.selectedId);
  query('#node-count').textContent = `${entries.size} ${filter ? 'matching' : 'sample'} resources`;
  if (!tree.selectedId) query('#selection-status').textContent = filter ? 'Host snapshot filtered; select a matching sample' : 'Select a resource';
};
const preset = (id: string) => {
  if (!Object.hasOwn(projects, id)) throw new TypeError('Unknown original sample project');
  projectId = id; filter = ''; entries = flatten(projects[id].nodes); query<HTMLInputElement>('#filter').value = ''; query<HTMLSelectElement>('#project').value = id; query('#project-title').textContent = projects[id].title;
  tree.update({ nodes: projects[id].nodes, label: 'Project resources', selectedId: projects[id].selected, expandedIds: projects[id].expanded, ...callbacks }); decorate(); paint(tree.selectedId); query('#node-count').textContent = `${entries.size} sample resources`;
};
query('#project').addEventListener('change', () => preset(query<HTMLSelectElement>('#project').value));
query('#filter').addEventListener('input', () => applyFilter(query<HTMLInputElement>('#filter').value));
query('#clear-filter').addEventListener('click', () => applyFilter(''));
for (const key of ['theme', 'solid', 'quiet']) query(`#${key}`).addEventListener('click', () => {
  const button = query(`#${key}`), active = button.getAttribute('aria-pressed') !== 'true'; button.setAttribute('aria-pressed', String(active)); workspace.dataset[key] = key === 'theme' ? active ? 'night' : 'day' : String(active);
});
query('#copy').addEventListener('click', async () => {
  try { if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable'); await navigator.clipboard.writeText(currentText); query('#selection-status').textContent = 'Copied the selected sample text'; }
  catch { query('#selection-status').textContent = 'Clipboard unavailable; sample text remains selectable'; }
});
window.addEventListener('pagehide', () => tree.destroy(), { once: true });
Object.assign(window, { __treeDemo: { preset, select: (id: string, focus = false) => tree.select(id, focus), expand: (id: string, open = true) => tree.setExpanded(id, open), filter: applyFilter,
  get state() { return { project: projectId, selectedId: tree.selectedId, filter, totalNodes: flatten(projects[projectId].nodes).size, snapshotNodes: entries.size, visibleRows: [...host.querySelectorAll<HTMLElement>('[role=treeitem]')].filter(item => !item.closest('[role=group][hidden]')).length, expandedIds: [...host.querySelectorAll<HTMLElement>('[role=treeitem][aria-expanded=true]')].map(item => item.dataset.resourceId), focusedId: document.activeElement instanceof HTMLElement ? document.activeElement.dataset.resourceId ?? null : null }; } } });

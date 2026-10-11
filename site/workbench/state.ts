export const starter = `/* A small surface with two things to fix. */\n.card {\n  --corner: 24px;\n  --accent: #b8ecc9;\n  padding: 24px;\n  border-raduis: var(--corner);\n  transition: all 180ms ease;\n}`;
export interface Workspace { source: string; branch: string; branches: Map<string, string>; split: boolean; light: boolean }
export function createWorkspace(): Workspace { return {source: starter, branch: 'main', branches: new Map([['main', starter]]), split: true, light: false}; }

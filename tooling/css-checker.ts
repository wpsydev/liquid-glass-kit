/** Optional developer checker shared by the browser workbench and read-only Node CLI. */
import { parser } from '@lezer/css';
export { parser as glassCSSParser };
export const GLASS_CSS_CHARACTER_LIMIT = 64000;
export const GLASS_CSS_DIAGNOSTIC_LIMIT = 30;
export interface GlassCSSDiagnostic {
  from: number;
  to: number;
  severity: 'error' | 'warning';
  message: string;
  rule: 'syntax' | 'property-typo' | 'explicit-transition' | 'document-limit';
  /** One-based positions in the decoded source; offsets and columns count UTF-16 code units. */
  line: number;
  column: number;
}
/** Same grammar/rules as the original workbench: syntax, border-raduis and explicit transition:all. */
export function inspectGlassCSS(source: string): GlassCSSDiagnostic[] {
  if (typeof source !== 'string') throw new TypeError('CSS checker requires source text');
  if (source.length > GLASS_CSS_CHARACTER_LIMIT) return [{ from:0,to:0,severity:'warning',message:'Demo lint is limited to 64,000 characters. Reduce this document to enable checks.',rule:'document-limit',line:1,column:1 }];
  const problems: GlassCSSDiagnostic[] = [], starts = [0];
  for (let index=0;index<source.length;index++) if(source[index]==='\n') starts.push(index+1);
  const tree = parser.parse(source);
  const add = (from: number, to: number, severity: GlassCSSDiagnostic['severity'], message: string, rule: GlassCSSDiagnostic['rule']) => {
    if(problems.length>=GLASS_CSS_DIAGNOSTIC_LIMIT || rule!=='syntax' && tree.resolveInner(from,1).name!=='PropertyName') return;
    let low=0,high=starts.length;
    while(low+1<high){const middle=(low+high)>>>1;if(starts[middle]<=from)low=middle;else high=middle;}
    problems.push({from,to:Math.max(from,to),severity,message,rule,line:low+1,column:from-starts[low]+1});
  };
  tree.iterate({enter(node){if(node.type.isError)add(node.from,node.to,'error','CSS syntax needs attention.','syntax');}});
  for(const match of source.matchAll(/\bborder-raduis\b/g))add(match.index!,match.index!+match[0].length,'error','Unknown property. Use border-radius.','property-typo');
  for(const match of source.matchAll(/\btransition\s*:\s*all\b/g))add(match.index!,match.index!+match[0].length,'warning','Name the animated properties to avoid accidental layout animation.','explicit-transition');
  return problems;
}

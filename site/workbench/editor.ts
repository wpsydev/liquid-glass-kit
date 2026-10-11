import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { css } from '@codemirror/lang-css';
import { linter, lintGutter, setDiagnostics } from '@codemirror/lint';
import { inspect } from './model.js';
export function mountEditor(host: HTMLElement, source: string, changed: (value: string) => void, position: (line: number, column: number) => void) {
  host.replaceChildren();
  const view = new EditorView({parent: host, state: EditorState.create({doc: source, extensions: [
    lineNumbers(), highlightActiveLine(), drawSelection(), history(), css(), syntaxHighlighting(HighlightStyle.define([
      {tag:tags.comment,color:'#a4b8b1'}, {tag:[tags.propertyName,tags.variableName],color:'#d6eee3'},
      {tag:[tags.number,tags.color,tags.unit],color:'#a8e7c2'}, {tag:[tags.keyword,tags.typeName],color:'#cfbded'},
      {tag:[tags.className,tags.tagName],color:'#a7d9e8'}, {tag:tags.string,color:'#e6d29c'},
    ])), lintGutter(),
    keymap.of([...defaultKeymap, ...historyKeymap]),
    linter(view => inspect(view.state.doc.toString()), {delay: 200}),
    EditorView.contentAttributes.of({'aria-label':'Edit surface.css',spellcheck:'false'}),
    EditorView.updateListener.of(update => {
      if (update.docChanged) changed(update.state.doc.toString());
      if (update.selectionSet || update.docChanged) { const head = update.state.selection.main.head, line = update.state.doc.lineAt(head); position(line.number, head - line.from + 1); }
    }),
    EditorView.theme({ '&': {color:'#d1e5dc',backgroundColor:'transparent'}, '.cm-gutters':{backgroundColor:'transparent',color:'#748e87',border:'none'}, '.cm-activeLine':{backgroundColor:'#ffffff05'}, '.cm-activeLineGutter':{backgroundColor:'#ffffff08'}, '.cm-cursor':{borderLeftColor:'#9af0c3'}, '&.cm-focused':{outline:'none'}, '.cm-selectionBackground, &.cm-focused .cm-selectionBackground':{backgroundColor:'#80c9a72b'}, '.cm-tooltip':{backgroundColor:'#18372d',color:'#ecf5ee',border:'1px solid #a0eec544'}, '.cm-line':{paddingLeft:'12px'}, '.cm-lintRange-error':{textDecorationColor:'#f09986'}, '.cm-lintRange-warning':{textDecorationColor:'#dfc67d'} }, {dark:true}),
  ]})});
  return {
    set(value: string) { if (view.state.doc.toString() !== value) view.dispatch({changes:{from:0,to:view.state.doc.length,insert:value}}); view.dispatch(setDiagnostics(view.state, inspect(value))); },
    go(offset: number) { const at = Math.max(0,Math.min(offset,view.state.doc.length));view.dispatch({selection:{anchor:at},scrollIntoView:true});view.focus(); },
    destroy(){ view.destroy(); },
  };
}

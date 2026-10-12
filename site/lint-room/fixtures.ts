export const fixtures = {
 draft: {name:'Surface / first draft',source:'.surface {\n  border-raduis: 24px;\n  transition: all 180ms;\n  backdrop-filter: blur(12px);\n}\n'},
 radius: {name:'Radius / corrected',source:'.surface {\n  border-radius: 24px;\n  transition: all 180ms;\n  backdrop-filter: blur(12px);\n}\n'},
 clean: {name:'Properties / intentional',source:'.surface {\n  border-radius: 24px;\n  transition: opacity 180ms, translate 180ms;\n  backdrop-filter: blur(12px);\n}\n'},
 quoted: {name:'Content / kept literal',source:'/* transition: all is a note, not a declaration */\n.label::after {\n  content: "border-raduis";\n}\n'},
 syntax: {name:'Syntax / unfinished',source:'.surface {\n  color: #234;\n  border-radius: 24px;\n'},
 bounded: {name:'Bounds / 30 findings',source:Array.from({length:38},(_,i)=>'.surface-'+i+' { border-raduis: 12px; }').join('\n')+'\n'},
} as const;
export type FixtureName=keyof typeof fixtures;

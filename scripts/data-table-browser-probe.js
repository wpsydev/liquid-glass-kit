/** Native benchmark: original bounded fixtures; pure model work and connected
 * host row authoring/replacement are separate. No asynchronous paint/FPS claim. */
(()=>{
 const stats=values=>{const s=[...values].sort((a,b)=>a-b);return{samples:s.length,medianMs:s[Math.floor(s.length*.5)],p95Ms:s[Math.floor(s.length*.95)],minMs:s[0],maxMs:s.at(-1)}};
 window.__runDataTableBenchmark=()=>{
  const api=window.DataTableBenchmark;
  const columns=[{id:'ref',label:'Ref',sortable:false},{id:'item',label:'Object'},{id:'type',label:'Category'},{id:'stock',label:'On hand'},{id:'stage',label:'Stage'},{id:'owner',label:'Owner'}];
  const rows=Array.from({length:5000},(_,i)=>({id:'BENCH-'+String(i).padStart(5,'0'),values:{ref:'B'+i,item:'Original specimen '+String(i%700).padStart(3,'0'),type:['Print','Tool','Sample'][i%3],stock:i%19===0?null:i%101,stage:['Ready','Review','Hold'][i%3],owner:['Mira','Theo','June'][i%3]}}));
  const input={caption:'Original complete benchmark fixture',columns,rows},model=api.createGlassDataTable(input);
  const options={reuse:{page:12,pageSize:6},filter:{filter:'Print',pageSize:6},sort:{sort:{columnId:'stock',direction:'ascending'},pageSize:6},stringSort:{sort:{columnId:'item',direction:'ascending'},pageSize:6},filterSort:{filter:'Print',sort:{columnId:'stock',direction:'descending'},pageSize:6}};
  function sample(operation,amount=80,warmup=10,callsPerBatch=1){const values=[];for(let i=0;i<amount+warmup;i++){const at=performance.now();for(let call=0;call<callsPerBatch;call++)operation();if(i>=warmup)values.push((performance.now()-at)/callsPerBatch)}return{...stats(values),callsPerBatch,warmupBatches:warmup}}
  const pure={recreateModel5000Rows:sample(()=>api.createGlassDataTable(input),40),reuseModelUnfilteredView:sample(()=>model.getView(options.reuse),80,10,20),cachedFilterView:sample(()=>model.getView(options.filter),80,10,20),cachedNumericSortView:sample(()=>model.getView(options.sort),80,10,4),cachedStringSortView:sample(()=>model.getView(options.stringSort),80,10,4),cachedFilterAndSortView:sample(()=>model.getView(options.filterSort),80,10,4)};
  const shell=document.createElement('div');shell.style.cssText='position:absolute;left:-9999px;top:0;width:850px';shell.setAttribute('aria-hidden','true');const table=document.createElement('table'),caption=document.createElement('caption'),head=document.createElement('thead'),header=document.createElement('tr'),body=document.createElement('tbody');table.className=api.getGlassDataTableProps().className;caption.textContent=model.caption;
  columns.forEach(column=>{const th=document.createElement('th');th.scope='col';th.textContent=column.label;header.append(th)});head.append(header);table.append(caption,head,body);shell.append(table);document.body.append(shell);
  function render(view){const output=view.pageRows.map(row=>{const tr=document.createElement('tr');tr.dataset.rowId=row.id;for(const column of columns){const td=document.createElement('td');td.textContent=row.values[column.id]===null?'Not provided':String(row.values[column.id]);tr.append(td)}return tr});body.replaceChildren(...output)}
  let connected;
  try{const view6=model.getView({pageSize:6}),view200=model.getView({pageSize:200});render(view6);table.getBoundingClientRect();connected={sixRealRows:sample(()=>render(view6),200,20,25),twoHundredRealRows:sample(()=>render(view200),60,10)};const valid=table.isConnected&&table.caption.textContent===model.caption&&table.rows.length===201&&body.children.length===200&&body.querySelectorAll('td').length===1200&&!table.querySelector('[role=grid]');if(!valid)throw Error('Native row postconditions failed')}
  finally{shell.remove()}
  return{browser:navigator.userAgent,authoredRows:5000,columns:6,cells:30000,preparedInputOutsideTiming:true,pure,connectedHostRowAuthoringAndReplacement:connected,
   includes:{creation:'Validation, detached snapshots, cached search/sort strings, allocation/freezing',reusedViews:'Option validation, cached-string matching/sorting when requested, ordered snapshots and page slices',hostRender:'New native tr/td creation, textContent and connected tbody replacement plus any synchronous style/layout work induced'},
   excludes:'Fixture/options construction, initial host shell/preflush, event wiring, async paint/compositor/network; no memoized-view-result, remote total, virtualization, comparative speed-up or FPS claim',timerCaveat:'Quantized performance.now durations and shared-machine noise, not whole-app action latency'};
 };
})();

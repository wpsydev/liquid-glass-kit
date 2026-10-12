(() => {
 const demo=window.__qualityDemo;
 const inspect=()=>{
  const controls=[...document.querySelectorAll('button,a,.check')].map(e=>{const r=e.getBoundingClientRect();return {id:e.id||e.textContent.trim().slice(0,38),width:r.width,height:r.height,kind:e.tagName}});
  const fields=[...document.querySelectorAll('input:not([type=checkbox]),select')].map(e=>{const r=e.getBoundingClientRect();return{id:e.id,width:r.width,height:r.height,font:parseFloat(getComputedStyle(e).fontSize)}});
  return{viewport:[innerWidth,innerHeight],overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,controls,fields,state:demo.state(),dom:{requested:document.querySelector('#requested-name').textContent,applied:document.querySelector('#applied-name').textContent,source:document.querySelector('#source-label').textContent,kind:document.querySelector('#evidence-kind').textContent,legend:document.querySelector('.chart-note').textContent},failures:[...controls.filter(x=>x.width<43.9||x.height<43.9).map(x=>'control '+x.id),...fields.filter(x=>x.width<43.9||x.height<43.9||x.font<16).map(x=>'field '+x.id)]};
 };
 window.__qualityProbe={inspect,all:()=>['baseline','spike','overload','cooldown','recovery','manual','gap'].map(name=>{demo.preset(name);return{name,...inspect()}})};
 return {ready:true};
})()

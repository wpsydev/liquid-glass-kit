/** Native-browser reference math and separate pure/host-authoring workloads. */
(() => {
  const summary=values=>{const sorted=[...values].sort((a,b)=>a-b);return{samples:sorted.length,medianMs:sorted[Math.floor(sorted.length*.5)],p95Ms:sorted[Math.floor(sorted.length*.95)],minMs:sorted[0],maxMs:sorted.at(-1)}};
  window.__compareAnchorReference = () => {
    const s=window.__anchorDemo.state();
    const points={facet:[-1.9,.85,-6],plate:[0,-.2,-5.5],spire:[1.9,.95,-6.4],probe:['x','y','z'].map(axis=>document.querySelector('#point-'+axis).valueAsNumber)};
    const radians=s.yaw*Math.PI/180,c=Math.cos(radians),sin=Math.sin(radians),focal=1/Math.tan(s.fov*Math.PI/360),near=.5,far=30;
    // Independently reconstruct host camera coordinates; do not multiply its matrix.
    const results=Object.entries(points).map(([id,[x,y,z]])=>{
      const cameraX=c*x+sin*(z+6),cameraY=y,cameraZ=-sin*x+c*(z+6)-6,w=-cameraZ;
      const expected=w>0?{x:(1+focal/(s.viewport.width/s.viewport.height)*cameraX/w)*s.viewport.width/2,y:(1-focal*cameraY/w)*s.viewport.height/2,depth:((far+near)/(near-far)*cameraZ+2*far*near/(near-far))/w}:null;
      const actual=s.points[id],label=document.querySelector('#label-'+id);
      const difference=expected&&actual.projectable?Math.max(Math.abs(actual.x-expected.x),Math.abs(actual.y-expected.y),Math.abs(actual.depth-expected.depth)):null;
      return{id,world:[x,y,z],expected,actual,maxDifference:difference,labelHidden:label.hidden,labelPlainHTML:label.namespaceURI==='http://www.w3.org/1999/xhtml',labelInteractive:!!label.querySelector('button,input,a[href]'),labelText:label.textContent};
    });
    const circles=[...document.querySelectorAll('#geometry circle')],svg=document.querySelector('#geometry').getBoundingClientRect();
    const rendered=results.filter(result=>!result.labelHidden).map((result,index)=>{const circle=circles[index],rect=circle.getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;const expectedX=svg.left+result.actual.x,expectedY=svg.top+result.actual.y;return{id:result.id,screenCenter:{x:cx,y:cy},expected:{x:expectedX,y:expectedY},maxScreenDifference:Math.max(Math.abs(cx-expectedX),Math.abs(cy-expectedY))}});
    return{state:s,results,rendered,maxScreenDifference:Math.max(0,...rendered.map(item=>item.maxScreenDifference)),maxDifference:Math.max(0,...results.map(x=>x.maxDifference??0)),decorativeSVG:document.querySelector('#geometry').getAttribute('aria-hidden'),occlusionDisclosure:document.querySelector('.occlusion-note').textContent};
  };
  window.__runAnchorBenchmark = () => {
    const project=window.AnchorBenchmark.projectGlassAnchor;
    const points=Array.from({length:1024},(_,i)=>[(i%32-16)/8,(Math.floor(i/32)-16)/8,-3-(i%13)/3]);
    const matrix=[.8,0,0,0,0,1.4,0,0,0,0,-1.2,-1,0,0,-2.2,0],viewport={width:960,height:640};
    const prepared={array:points.map(point=>({point,viewProjection:matrix,viewport})),float32:points.map(point=>({point,viewProjection:new Float32Array(matrix),viewport})),float64:points.map(point=>({point,viewProjection:new Float64Array(matrix),viewport}))};
    const pure={};let checksum=0;
    for(const [kind,input] of Object.entries(prepared)){
      const values=[];
      for(let batch=0;batch<50;batch++){
        const at=performance.now();for(const options of input){const result=project(options);checksum+=result.x??0}
        const elapsed=performance.now()-at;if(batch>=10)values.push(elapsed);
      }
      pure[kind]={...summary(values),projectionsPerBatch:1024,warmupBatches:10};
    }
    // This is full original host DOM/SVG authoring, not pure projection or paint.
    const values=[];let renders=0;
    try {
      for(let batch=0;batch<45;batch++){
        const before=window.__anchorDemo.state().renders,at=performance.now();
        for(let i=0;i<4;i++)window.__anchorDemo.preset(i%2?'scene':'parallax');
        const elapsed=(performance.now()-at)/4;
        renders+=window.__anchorDemo.state().renders-before;if(batch>=5)values.push(elapsed);
      }
    } finally {window.__anchorDemo.reset()}
    if(!Number.isFinite(checksum)||renders!==180)throw Error('Projection/actual host-render postcondition failed');
    return{browser:navigator.userAgent,pure,checksum,hostSVGAndHTMLAuthoring:{...summary(values),renders,callsPerBatch:4,warmupBatches:5},
      includes:{pure:'All per-call validated point/matrix/viewport descriptors, clip multiplication, positive-W divide, frustum checks and frozen result allocation',host:'Actual original host camera matrix calculation, all geometry and anchor projections, native SVG line/polygon/node authoring/replacement, semantic inspector/controls/style updates and any synchronous style/layout work induced'},
      excludes:'Prepared point/matrix inputs and initial scene fixture, asynchronous paint/compositor/raster/GPU/network; pure workload contains no DOM/renderer/RAF',
      caveat:'Shared-machine batch measurements, no GPU/FPS/occlusion/virtualization claim and no before/after speed-up comparison; 1024 math calls are not 1024 rendered DOM labels'};
  };
})();

/** Native diagnostics only: real compile failure, context loss and pixel readback.
 * Owned original fixtures; no timing, compositor or universal quality assertion. */
(() => {
  const tick=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  window.__runEdgePipelineProbe=async()=>{
    const demo=window.__edgeDemo,canvas=document.querySelector('#chosen'),gl=canvas.getContext('webgl2');
    if(!gl)return{unsupported:true};
    const originalSource=gl.shaderSource,originalCompile=gl.compileShader,sourceMap=new Map(),compiled=[];
    let inject=false,injected=false;
    const source=function(shader,text){if(inject&&!injected&&text.includes('edgeFootprint')){text+='\nforced_native_compile_error;';injected=true}sourceMap.set(shader,text);originalSource.call(gl,shader,text)};
    const compile=function(shader){originalCompile.call(gl,shader);const text=sourceMap.get(shader)||'';compiled.push({pixel:text.includes('edgeFootprint')||text.includes('2.0 * (1.0 / uDpr.x'),fragment:gl.getShaderParameter(shader,gl.SHADER_TYPE)===gl.FRAGMENT_SHADER,passed:gl.getShaderParameter(shader,gl.COMPILE_STATUS),log:gl.getShaderInfoLog(shader).slice(0,1000)})};
    gl.shaderSource=source;gl.compileShader=compile;
    let compileStates,fallback,recovered;
    try{
      demo.preset('legacy');demo.preset('pixel');const lenses=demo.state();demo.preset('field');const field=demo.state();demo.preset('fusion');const fusion=demo.state();compileStates={lenses,field,fusion};
      demo.preset('legacy');inject=true;demo.preset('pixel');fallback=demo.state();inject=false;
      demo.preset('legacy');demo.preset('pixel');recovered=demo.state();
    }finally{if(gl.shaderSource===source)gl.shaderSource=originalSource;if(gl.compileShader===compile)gl.compileShader=originalCompile}
    const extension=gl.getExtension('WEBGL_lose_context');let loss={available:!!extension};
    if(extension){
      const uploads=demo.state().scenes[1].source.uploads;
      const lost=new Promise(resolve=>canvas.addEventListener('webglcontextlost',()=>resolve(true),{once:true}));extension.loseContext();await Promise.race([lost,tick(1500)]);await tick(50);const during=demo.state();
      const restored=new Promise(resolve=>canvas.addEventListener('webglcontextrestored',()=>resolve(true),{once:true}));extension.restoreContext();await Promise.race([restored,tick(1500)]);await tick(100);demo.draw();demo.inspect();const after=demo.state();loss={available:true,uploadsBefore:uploads,during,after,error:gl.getError()};
    }
    const result={browser:navigator.userAgent,gpuTimerExtensionAvailable:!!gl.getExtension('EXT_disjoint_timer_query_webgl2'),timingMeasured:false,compiled,injectedActualInvalidShader:injected,compileStates,fallback,recovered,context:loss,interpretation:'Native compiler/renderer and actual context events; deliberate failure fixture, not an observed spontaneous hardware failure. Source uploads and draw counts are not FPS/GPU timing.'};demo.reset();return result;
  };
  window.__runEdgeCoverageProbe=()=>{
    const canvas=document.createElement('canvas');canvas.width=64;canvas.height=48;canvas.style.cssText='position:absolute;left:-9999px;width:512px;height:384px';canvas.setAttribute('aria-hidden','true');document.body.append(canvas);
    const gl=canvas.getContext('webgl2',{alpha:false,antialias:false,preserveDrawingBuffer:false});if(!gl){canvas.remove();return{unsupported:true}}
    const shaders=[],program=gl.createProgram(),vao=gl.createVertexArray();
    try{
      const sources=[`#version 300 es
      void main(){vec2 points[6]=vec2[6](vec2(-1,-1),vec2(1,-1),vec2(-1,1),vec2(-1,1),vec2(1,-1),vec2(1,1));gl_Position=vec4(points[gl_VertexID],0,1);}`,`#version 300 es
      precision highp float;uniform int uMode;out vec4 color;
      void main(){vec2 dpr=vec2(.125);vec2 point=gl_FragCoord.xy/dpr;float distance=length(point-vec2(256,192))-99.4;float footprint=fwidth(distance);float cap=max(.0001,1.0/dpr.x+1.0/dpr.y);float halfBand=uMode==1?clamp(.5*footprint,.0001,cap):.65;float coverage=1.0-smoothstep(-halfBand,halfBand,distance);color=vec4(vec3(coverage),1);}`];
      sources.forEach((text,index)=>{const shader=gl.createShader(index?gl.FRAGMENT_SHADER:gl.VERTEX_SHADER);shaders.push(shader);gl.shaderSource(shader,text);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));gl.attachShader(program,shader)});
      gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);gl.bindVertexArray(vao);gl.viewport(0,0,64,48);const uniform=gl.getUniformLocation(program,'uMode'),outputs=[];
      for(const mode of [0,1]){gl.uniform1i(uniform,mode);gl.drawArrays(gl.TRIANGLES,0,6);const bytes=new Uint8Array(64*48*4);gl.readPixels(0,0,64,48,gl.RGBA,gl.UNSIGNED_BYTE,bytes);let partial=0,lit=0,total=0;for(let i=0;i<bytes.length;i+=4){if(bytes[i]>0&&bytes[i]<255)partial++;if(bytes[i]>0)lit++;total+=bytes[i]/255}outputs.push({mode:mode?'pixel':'legacy',partialCoveragePixels:partial,nonzeroPixels:lit,coverageSum:total,error:gl.getError()})}
      return{scope:'Original isolated analytic coverage fixture, same distance-band formula as the feature; full renderer differences measured separately',backing:[64,48],logicalCSS:[512,384],scale:[.125,.125],radiusCSS:99.4,shaderCompiled:true,linked:true,outputs,boundary:'More partial pixels demonstrate a broader backing-aware transition here, not universal reconstruction, MSAA or a GPU cost result'};
    }finally{for(const shader of shaders)gl.deleteShader(shader);gl.deleteProgram(program);gl.deleteVertexArray(vao);gl.getExtension('WEBGL_lose_context')?.loseContext();canvas.remove()}
  };
})();

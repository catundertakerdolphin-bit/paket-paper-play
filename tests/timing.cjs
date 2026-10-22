const assert=require('node:assert/strict'),{Worker}=require('node:worker_threads'),load=require('./runtime.cjs'),audit=require('./mesh-audit.cjs');
const {PaperBag,PhysicsRunner}=load({mobile:true});
// A slow display / busy worker must forward elapsed wall time rather than
// advancing the simulation by one fixed frame for each completed message.
{
 let now=100;const sent=[],b=new PaperBag(),runner=new PhysicsRunner(b,()=>({postMessage:m=>sent.push(m),terminate(){}}),()=>now);
 const reply=(sleeping=false,p=new Float32Array(b.pos))=>runner.receive({type:'state',epoch:runner.epoch,p,angles:new Float32Array(b.angles),fries:{...b.fries.snapshot(),sleeping},sleeping,ms:0,simulatedTime:0,energy:0,tearEnergy:0,impacts:0});
 try{
  reply();b.settle(1/60);assert.equal(sent.at(-1).dt,1/60);
  now=140;for(let f=0;f<10;f++)b.settle(1/60);assert.equal(sent.length,2,'One job in flight, regardless of display frames');reply();b.settle(1/60);assert.equal(sent.at(-1).dt,.04);
  now=190;reply();b.settle(1/60);assert.equal(sent.at(-1).dt,.05);
  b.release();now=230;reply(true);b.settle(1/60);now=270;reply(true);b.settle(1/60);const idleCount=sent.length;
  now=10000;b.settle(1/60);assert.equal(sent.length,idleCount,'A sleeping scene sends no work');
  const hit=b.raycast({o:[0,1.8,6],d:[0,0,-1]}),g=b.gesture(hit,b.snapshot());b.press(g,1000);b.settle(1/60);assert.equal(sent.at(-1).dt,1/60,'Waking does not catch up the idle seconds');
  const rotated=new Float32Array(b.pos);for(let a=0;a<rotated.length;a+=3){rotated[a]=b.pos[a+2];rotated[a+2]=-b.pos[a];}
  now+=50;reply(false,rotated);assert.equal(runner.target,null,'The hand must not wait through an extra interpolation');now+=8;b.settle(1/60);assert(Math.abs(b.metrics().areaRatio-1)<.00001,'Rotating a solved pose must not squash the paper halfway between worker responses');
  const snapshot=b.snapshot();b.release();b.restore(snapshot);runner.receive({type:'state',epoch:runner.epoch-1});b.settle(1/60);assert.equal(sent.at(-1).dt,1/60,'Undo starts a fresh clock after rejecting the stale response');
 }finally{runner.dispose();}
}
{
 const b=new PaperBag(),steps=[];b.step=dt=>steps.push(dt);b.rebuild=()=>{};
 for(const dt of [1/60,.04,.05,.5]){steps.length=0;b.settle(dt);assert(steps.length<=3,'A delayed update cannot create an unbounded catch-up queue');assert(steps.every(h=>h<=1/60));assert(Math.abs(steps.reduce((a,c)=>a+c,0)-Math.min(.05,dt))<1e-9,'All elapsed time up to the pause bound is simulated');}
}
{
 const {PaperBag}=load({mobile:false}),b=new PaperBag(),steps=[];b.step=dt=>steps.push(dt);b.rebuild=()=>{};let elapsed=0;
 for(const dt of [1/240,1/60,.04,.05,.5,.003,.021]){
  steps.length=0;b.settle(dt);elapsed+=Math.min(.05,dt);
  assert(steps.length<=6,'Desktop catch-up must remain bounded');
  assert(steps.every(h=>h===1/120),'Dense desktop paper needs a fixed, stable timestep');
  assert(elapsed-(b.simulatedTime||0)<1/120+1e-9,'Fractional time must be retained instead of slowing the simulation');
  assert(Math.abs((b.simulatedTime||0)+b.accumulator-elapsed)<1e-9,'Completed steps and remainder must account for elapsed time');
 }
 b.sleeping=b.fries.sleeping=true;b.settle(10);assert.equal(b.accumulator,0,'A sleeping scene must discard its fractional backlog');
 b.restore(b.snapshot());assert.equal(b.accumulator,0,'Undo must start without a previous frame remainder');
}
// Exercise the larger substep on the actual constrained paper, including a
// change from pressing to lifting, a release, and gravity after a cut.
for(const mobile of [true,false]){
 const {PaperBag}=load({mobile}),b=new PaperBag(),initial=b.snapshot(),dt=.05;
 const check=label=>{assert.equal(audit(b),0,label+' must not introduce intersections');assert(Math.abs(b.metrics().areaRatio-1)<.015,label+' must preserve material area');assert(b.fries.pos.every(Number.isFinite));};
 const hit=b.raycast({o:[0,1.8,6],d:[0,0,-1]}),g=b.gesture(hit,b.snapshot());b.press(g,1000);for(let f=0;f<35;f++)b.settle(dt);check('20 Hz crumpling');b.release();
 b.restore(initial);const high=b.raycast({o:[0,2.5,6],d:[0,0,-1]}),grab=b.gesture(high,b.snapshot());b.grab(grab,[.4,1.1,0]);for(let f=0;f<35;f++)b.settle(dt);assert(Math.min(...Array.from({length:b.count},(_,i)=>b.pos[i*3+1]))>.15,'Real-time lifting must clear the floor');check('20 Hz lifting');b.release();for(let f=0;f<50;f++)b.settle(dt);check('20 Hz falling');
 b.restore(initial);const L=b.raycast({o:[-.4,2,6],d:[0,0,-1]}),R=b.raycast({o:[.4,2,6],d:[0,0,-1]}),tear=b.beginTear(L,R,b.snapshot());b.moveTear(tear,0,[L.p[0]-1,L.p[1]+.25,L.p[2]]);b.moveTear(tear,1,[R.p[0]+1,R.p[1]+.25,R.p[2]]);for(let f=0;f<40;f++)b.settle(dt);assert.equal(b.pieces.length,2);check('20 Hz tearing');b.release();for(let f=0;f<25;f++)b.settle(dt);check('20 Hz fragments');
 console.log('REAL-TIME SHELL CHECKS PASSED:',mobile?'mobile':'desktop');
}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
 let simulated=0,workerMs=0,received=0,waiting;const b=new PaperBag(),worker=new Worker("const {parentPort}=require('node:worker_threads');global.self={postMessage:(m,t)=>parentPort.postMessage(m,t)};parentPort.on('message',data=>self.onmessage({data}));"+load({mobile:true}).physicsWorkerSource(),{eval:true});
 worker.on('message',m=>{if(m.type==='error'){waiting?.reject(Error(m.message));return;}simulated=m.simulatedTime;workerMs+=m.ms;received++;waiting?.resolve(m);waiting=null;});worker.on('error',e=>waiting?.reject(e));
 const send=m=>new Promise((resolve,reject)=>{waiting={resolve,reject};worker.postMessage(m);});
 try{
  await send({type:'init',epoch:0,tear:true});const hit=b.raycast({o:[0,1.8,6],d:[0,0,-1]}),g=b.gesture(hit,b.snapshot());b.press(g,1000);delete g.snapshot;
  // Warm the generated worker before measuring a steady display cadence;
  // module/JIT startup is independently bounded by the pause cap above.
  for(let i=0;i<12;i++)await send({type:'step',id:i+1,epoch:0,dt:1/60,commands:[],control:i===0?{id:1,full:g}:{id:1,update:{depth:g.depth,delta:g.delta}}});
  const start=performance.now(),simStart=simulated,msStart=workerMs;let last=start;
  for(let i=0;i<20;i++){await sleep(Math.max(0,40-(performance.now()-last)));const now=performance.now(),dt=(now-last)/1000;last=now;await send({type:'step',id:i+13,epoch:0,dt,commands:[],control:{id:1,update:{depth:g.depth,delta:g.delta}}});}
  const dispatchSeconds=(last-start)/1000,simulatedSeconds=simulated-simStart,ratio=simulatedSeconds/dispatchSeconds;assert(ratio>.9&&ratio<1.01,'Worker simulation must keep up with elapsed dispatch time at 25 Hz');
  console.log('TIMING CHECKS PASSED:',JSON.stringify({wallDispatchSeconds:+dispatchSeconds.toFixed(3),simulatedSeconds:+simulatedSeconds.toFixed(3),ratio:+ratio.toFixed(3),workerMsPerUpdate:+((workerMs-msStart)/20).toFixed(2)}));
 }finally{await worker.terminate();}
})().catch(error=>{console.error(error);process.exitCode=1;});

const assert=require('node:assert/strict'),{Worker}=require('node:worker_threads'),{createHash}=require('node:crypto'),load=require('./runtime.cjs');
const desktop=load({mobile:false}),mobile=load({mobile:true});
const {PaperBag,PhysicsRunner,V}=desktop;let maxPending=0,pending=0;
const fs=require('node:fs'),path=require('node:path');assert.equal(desktop.physicsWorkerSource(),mobile.physicsWorkerSource(),'Desktop and phone must run identical worker physics');assert.equal(fs.readFileSync(path.join(__dirname,'../dist/physics-worker.js'),'utf8'),desktop.physicsWorkerSource(),'The deployed same-origin worker must match the tested physics source');
function factory(source){
 const bridge={};const worker=new Worker("const {parentPort}=require('node:worker_threads');global.self={postMessage:(message,transfers)=>parentPort.postMessage(message,transfers)};parentPort.on('message',data=>self.onmessage({data}));"+source,{eval:true});
 worker.on('message',data=>{pending--;bridge.onmessage?.({data});});worker.on('error',error=>bridge.onerror?.(error));bridge.postMessage=message=>{pending++;maxPending=Math.max(maxPending,pending);worker.postMessage(message);};bridge.terminate=()=>worker.terminate();return bridge;
}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function assertStanding(b,initial,label){
 let drift=0;for(let a=0;a<b.pos.length;a+=3)drift=Math.max(drift,Math.hypot(...[0,1,2].map(d=>b.pos[a+d]-initial.p[a+d])));
 assert(drift<.08,label+' must keep the untouched paper upright');assert(b.sleeping,label+' must reach sleep');assert(b.fries.floorMask.every(x=>x===0),label+' must retain the fries');
}
async function standingWorker(){
 let now=0;const b=new PaperBag(),initial=b.snapshot(),runner=new PhysicsRunner(b,factory,()=>now);
 b.step=()=>{throw Error('The main thread must not solve the standing shell');};
 async function reply(){const deadline=performance.now()+7000;while(runner.inflight){await sleep(2);assert(!runner.failed);assert(performance.now()<deadline,'Standing worker must reply');}}
 try{
  await reply();for(let frame=0;frame<40;frame++){now+=50;b.settle(.05);await reply();}
  assert.equal(b.count,initial.p.length/3,'Worker startup must preserve the main-thread topology');assert.deepEqual([...b.tri],[...initial.topology.tri]);assertStanding(b,initial,'The actual desktop worker at 20 Hz');
  console.log('STANDING WORKER CHECK PASSED: actual desktop worker, 20 Hz dispatch, matching topology, upright sleep');
 }finally{runner.dispose();}
}
function failedWorker(){
 const b=new PaperBag(),initial=b.snapshot(),original={settle:b.settle,restore:b.restore,release:b.release};let terminated=0;
 const runner=new PhysicsRunner(b,()=>({postMessage(){},terminate(){terminated++;}}));
 runner.receive({type:'error',message:'Simulated worker initialization failure'});
 assert(runner.failed);assert.equal(terminated,1);assert.equal(b.renderOnly,false);for(const key of Object.keys(original))assert.equal(b[key],original[key],'Fallback must restore '+key);
 for(let frame=0;frame<40;frame++)b.settle(.05);assertStanding(b,initial,'The synchronous desktop fallback');
 b.resetShape();assert.deepEqual([...b.pos],[...initial.p]);assert.deepEqual([...b.tri],[...initial.topology.tri]);
 console.log('FALLBACK CHECK PASSED: worker initialization error, restored synchronous methods, upright paper, reset');
}
(async()=>{
 await standingWorker();failedWorker();
 let now=0;
 const b=new PaperBag(true),initial=b.snapshot(),runner=new PhysicsRunner(b,factory,()=>now);let beats=0,workerArea=1;const timer=setInterval(()=>beats++,5),receive=runner.receive;
 runner.receive=function(message){receive.call(this,message);if(message.type==='state'&&message.epoch===this.epoch){const pos=b.pos;try{b.pos=message.p;workerArea=b.metrics().areaRatio;}finally{b.pos=pos;}}};
 // Keep this topology regression deterministic across CPU speeds. The worker
 // and event loop remain real; tests/timing.cjs covers elapsed wall-clock time.
 // Waiting or flooding frames while work is in flight cannot advance physics.
 function advanceFrame(){if(runner.ready&&!runner.inflight)now+=1000/60;b.settle(1/60);}
 async function until(predicate,limit=7000){const start=performance.now();while(!predicate()){advanceFrame();await sleep(12);assert(!runner.failed,'The actual generated browser worker must run');if(performance.now()-start>limit)throw Error('Worker check timed out');}}
 try{
  await until(()=>runner.ready);assert.equal(b.tri.length/3,1400);assert.equal(b.count,717);assert.equal(b.fries.count,6);assert.equal(b.fries.pos.length,36);
  b.step=()=>{throw Error('The main thread must not run shell physics');};
  assert(b.fries.floorMask.every(x=>x===0));const pokeHit=b.raycast({o:[0,1.8,6],d:[0,0,-1]}),poke=b.gesture(pokeHit,b.snapshot()),pokeBefore=new Float32Array(b.pos),stampTime=runner.simulatedTime;b.press(poke,0);const pulse={...poke};delete pulse.snapshot;b.release({poke:pulse});await until(()=>runner.simulatedTime>stampTime+.12&&!runner.inflight);assert(b.pos.some((x,i)=>Math.abs(x-pokeBefore[i])>.002),'A tap released before dispatch must still dent the actual worker');b.restore(initial);await until(()=>runner.commands.length===0&&!runner.inflight);
  const throwHit=b.raycast({o:[.3,.4,6],d:[0,0,-1]}),throwGrip=b.gesture(throwHit,b.snapshot()),height=b.center()[1];b.grab(throwGrip,[0,0,0]);b.release({toss:{velocity:[0,5,0],triangle:throwHit.triangle,weights:throwHit.weights}});await until(()=>b.center()[1]>height+.15);assert.equal(b.fries.floorMask.length,6);b.restore(initial);await until(()=>runner.commands.length===0&&!runner.inflight);
  const hit=b.raycast({o:[0,1.8,6],d:[0,0,-1]}),g=b.gesture(hit,b.snapshot());b.press(g,800);const beatStart=beats;
  for(let frame=0;frame<30;frame++){advanceFrame();for(let i=0;i<20;i++)advanceFrame();await until(()=>!runner.inflight);}
  assert(beats-beatStart>20,'UI heartbeat continues while physics works');assert.equal(maxPending,1,'Physics must have bounded backpressure');
  b.release();b.restore(initial);await until(()=>runner.commands.length===0&&!runner.inflight);
  const L=b.raycast({o:[-.4,2,6],d:[0,0,-1]}),R=b.raycast({o:[.4,2,6],d:[0,0,-1]}),tear=b.beginTear(L,R,b.snapshot());b.moveTear(tear,0,V.add(L.p,[-1,.25,0]));b.moveTear(tear,1,V.add(R.p,[1,.25,0]));
  await until(()=>b.pieces?.length===2);assert(b.broken.size>0);assert.equal(b.tri.length/3,1400);
  function triangleHit(t){const p=[0,0,0];for(let j=0;j<3;j++)for(let d=0;d<3;d++)p[d]+=b.pos[b.tri[t*3+j]*3+d]/3;return{p,n:[0,0,1],triangle:t,face:b.faces[t],weights:[1/3,1/3,1/3]};}
  function largestFaces(){const piece=b.pieces.map((ids,i)=>[ids.length,i]).sort((a,c)=>c[0]-a[0])[0][1],ts=[];for(let t=0;t<b.tri.length/3;t++)if(b.pieceIds[b.tri[t*3]]===piece)ts.push(t);return ts;}
  // Measure gesture duration in simulation time. The fixed dispatch clock
  // makes both the duration and the sequence of solver substeps reproducible.
  async function simulate(seconds){const target=runner.simulatedTime+seconds;await until(()=>runner.simulatedTime>=target&&!runner.inflight,20000);}
  for(let cycle=0;cycle<7;cycle++){
   // Change tools while the previous response is in flight. The torn
   // topology and a fresh press must continue working without a reset.
   advanceFrame();b.release();const ts=largestFaces(),press=b.gesture(triangleHit(ts[Math.floor(ts.length*.5)]),b.snapshot()),before=new Float32Array(b.pos);b.press(press,1200);
   await simulate(35/60);let movement=0;for(let i=0;i<before.length;i++)movement=Math.max(movement,Math.abs(before[i]-b.pos[i]));assert(movement>.015,'The worker must not freeze crumpling after repeated tears');
   b.release();const faces=largestFaces(),pair=[triangleHit(faces[Math.floor(faces.length*.25)]),triangleHit(faces[Math.floor(faces.length*.75)])],g=b.beginTear(...pair,b.snapshot()),axis=V.norm(V.sub(pair[1].p,pair[0].p)),cuts=b.broken.size;
   b.moveTear(g,0,V.add(pair[0].p,V.mul(axis,-1)));b.moveTear(g,1,V.add(pair[1].p,axis));await simulate(75/60);
   assert(b.broken.size>cuts,'A fragment must remain tearable in the actual worker');assert(b.pos.every(Number.isFinite));assert(b.fries.pos.every(Number.isFinite),'Fries must stay finite through repeated worker topology changes');const renderArea=b.metrics().areaRatio,stateHash=createHash('sha256').update(Buffer.from(b.pos.buffer,b.pos.byteOffset,b.pos.byteLength)).update(Buffer.from(b.tri.buffer,b.tri.byteOffset,b.tri.byteLength)).digest('hex').slice(0,16);console.log('worker cycle',cycle,JSON.stringify({renderArea,workerArea,stateHash,physicsMs:runner.ms}));assert(Math.abs(workerArea-1)<.015,'The worker must preserve material area');assert(Math.abs(renderArea-1)<.015,'Rendering must preserve area between worker responses');
  }
  // Restore while an old tear response is still in flight. Epoch filtering
  // must stop that response from resurrecting the torn topology.
  advanceFrame();assert(runner.inflight);b.release();b.restore(initial);assert.deepEqual([...b.fries.pos],[...initial.fries.p]);await until(()=>runner.commands.length===0&&!runner.inflight);assert.equal(b.count,717);assert.equal(b.broken.size,0);assert.deepEqual([...b.tri],[...initial.topology.tri]);assert(b.fries.pos.every(Number.isFinite));
  console.log('WORKER CHECKS PASSED: actual shared worker source, desktop main thread, responsive UI, one in-flight job, repeated tear → crumple → tear, stale-response rejection and topology restore');
 }finally{clearInterval(timer);runner.dispose();}
})().catch(error=>{console.error(error);process.exitCode=1;});

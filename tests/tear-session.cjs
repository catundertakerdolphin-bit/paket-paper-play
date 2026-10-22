const assert=require('node:assert/strict'),load=require('./runtime.cjs'),audit=require('./mesh-audit.cjs');
const {PaperBag,V}=load({mobile:true});
const b=new PaperBag(true);let seed=48;
const rand=()=>((seed=Math.imul(seed,1664525)+1013904223|0)>>>0)/4294967296;
function hit(t){
 const p=[0,0,0];for(let j=0;j<3;j++)for(let d=0;d<3;d++)p[d]+=b.pos[b.tri[t*3+j]*3+d]/3;
 return{p,n:[0,0,1],triangle:t,face:b.faces[t],weights:[1/3,1/3,1/3]};
}
function movement(before){let max=0;for(let i=0;i<before.length;i++)max=Math.max(max,Math.abs(b.pos[i]-before[i]));return max;}
// Two oblique tears followed by a press. The second cut used to lock the
// entire shell at TOI < .002, including pieces nowhere near the contact.
for(let cycle=0;cycle<10;cycle++){
 let L,R,plan;
 for(let attempt=0;attempt<300;attempt++){
  L=hit(Math.floor(rand()*b.tri.length/3));R=hit(Math.floor(rand()*b.tri.length/3));plan=b.tearPlan(L,R);
  if(plan.order.length>3&&V.len(V.sub(L.p,R.p))<2)break;
 }
 const cuts=b.broken.size,g=b.beginTear(L,R,b.snapshot()),axis=V.norm(V.sub(R.p,L.p)),extra=[rand()-.5,(rand()-.5)*.5,rand()-.5];
 b.moveTear(g,0,V.add(V.add(L.p,V.mul(axis,-.3-rand())),extra));b.moveTear(g,1,V.add(R.p,V.mul(axis,.3+rand())));
 let stopped=0;
 for(let f=0;f<70;f++){const before=new Float32Array(b.pos);b.settle(1/60);stopped=movement(before)<1e-7?stopped+1:0;assert(stopped<12,'A tear contact must not freeze the whole bag');}
 assert(b.broken.size>cuts,'An existing fragment must remain tearable');
 assert(b.pos.every(Number.isFinite));assert(Math.abs(b.metrics().areaRatio-1)<.012);
 assert.equal(audit(b),0,'Repeated tearing must not introduce triangle intersections');
 console.log('tear session',cycle,JSON.stringify({cuts:b.broken.size,pieces:b.pieces.length,areaRatio:b.metrics().areaRatio}));
 b.release();const h=hit(Math.floor(rand()*b.tri.length/3)),press=b.gesture(h,b.snapshot()),before=new Float32Array(b.pos);
 for(let f=0;f<25;f++){b.press(press,f*40);b.settle(1/60);}
 assert(movement(before)>.015,'Crumpling must still move the paper after tearing');assert.equal(audit(b),0,'Crumpling torn pieces must remain collision-safe');b.release();
}
console.log('TEAR SESSION CHECKS PASSED: repeated oblique tears and crumpling without reset');

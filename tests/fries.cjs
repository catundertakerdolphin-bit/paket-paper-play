const assert=require('node:assert/strict'),{PaperBag,V}=require('./runtime.cjs')({mobile:true});
function step(b,n,dt=1/120){b.sleeping=true;b.prev.set(b.pos);for(let f=0;f<n;f++)b.fries.step(dt,b);}
function transform(b,fn){for(const points of [b.pos,b.fries.pos])for(let a=0;a<points.length;a+=3)points.set(fn([...points.slice(a,a+3)]),a);b.prev.set(b.pos);b.fries.prev.set(b.fries.pos);b.fries.velocity.fill(0);b.fries.sleeping=false;}
function centres(b){return Array.from({length:b.fries.count},(_,i)=>b.fries.point(i,.5));}
function validate(b){assert.equal(b.fries.count,6);assert(b.fries.pos.every(Number.isFinite));for(let i=0;i<b.fries.count;i++){const L=V.len(V.sub(b.fries.point(i,1),b.fries.point(i,0)));assert(Math.abs(L/b.fries.length[i]-1)<.06,'Fries must remain rigid');for(const p of [b.fries.point(i,0),b.fries.point(i,1)])assert(p[1]>=.008+b.fries.radius[i]-.001,'Fries must stay above the floor');}}
{
 const b=new PaperBag(),snapshot=b.snapshot(),start=performance.now();
 assert.equal(b.fries.scale,.25*1.35,'Fries are 35% larger than the previous quarter-scale version');
 for(let i=0;i<b.fries.count;i++){assert(b.fries.length[i]>=1.05*.3375&&b.fries.length[i]<=1.57*.3375,'Length follows the new scale');assert(b.fries.radius[i]>=.073*.3375&&b.fries.radius[i]<=.082*.3375,'Thickness follows the same scale');const A=b.fries.point(i,0),B=b.fries.point(i,1);assert(Math.max(A[1],B[1])<.05,'Fries start at the bottom, not at the mouth');assert(Math.abs(A[1]-B[1])<.01,'Fries start lying horizontally');for(const p of [A,B])assert(Math.abs(p[0])+.04<.94&&Math.abs(p[2])+.04<.535,'Six enlarged fries fit inside the bottom');}
 step(b,480);validate(b);
 assert(b.fries.floorMask.every(x=>x===0),'Fries still resting inside the intact bottom cannot count as on the floor');
 for(const p of centres(b)){assert(Math.abs(p[0])<1&&Math.abs(p[2])<.57,'An intact upright bag must retain its contents');assert(p[1]<2);}
 console.log('fries simulation ms/step',((performance.now()-start)/480).toFixed(2));
 step(b,480);assert(b.fries.sleeping,'A resting pile must sleep instead of spending CPU indefinitely');
 b.sleeping=false;b.fries.step(1/120,b);assert(!b.fries.sleeping,'Moving the bag must wake its contents');
 const data=b.fries.rebuild();assert.equal(data.length,6*44*3*8);assert(data.every(Number.isFinite));for(let a=0;a<data.length;a+=8){assert(Math.abs(Math.hypot(data[a+3],data[a+4],data[a+5])-1)<.0001);assert(data[a+6]>0&&data[a+6]<1&&data[a+7]>0&&data[a+7]<1);}
 assert(b.fries.shadows().every(Number.isFinite));b.restore(snapshot);assert.deepEqual([...b.fries.pos],[...snapshot.fries.p]);b.fries.pos[0]+=4;b.resetShape();assert.deepEqual([...b.fries.pos],[...snapshot.fries.p]);assert(b.fries.floorMask.every(x=>x===0));
}
{
 const b=new PaperBag();transform(b,p=>[p[0],6.7-p[1],-p[2]]);step(b,240,1/60);validate(b);
 assert(centres(b).every(p=>p[1]<2.7),'All six fries must pour out through the inverted open rim at the largest worker substep');
 assert(b.fries.floorMask.every(x=>x===1),'All six spilled fries must be detected on the world floor');
}
{
 const b=new PaperBag(),L=b.raycast({o:[0,.25,6],d:[0,0,-1]}),R=b.raycast({o:[0,.65,6],d:[0,0,-1]}),plan=b.tearPlan(L,R);b.cutEdges(plan.order.map(e=>e.key),[0,1,0],plan.sides);assert.equal(b.pieces.length,2);
 transform(b,p=>[p[0],p[1]+2.5,p[2]]);
 const bottom=b.pieces.find(ids=>ids.some(i=>b.rest[i*3+1]<.02));for(const i of bottom)b.pos[i*3]+=3;b.prev.set(b.pos);step(b,400);validate(b);
 assert(centres(b).every(p=>p[1]<2),'All six fries must escape through an actual opened bottom tear');
 assert(b.fries.floorMask.every(x=>x===1),'A torn-bottom spill must count without a false initial-floor completion');
}
console.log('FRIES CHECKS PASSED: 6 fries enlarged by 35%, lying at the bottom, intact containment, rim pour, torn-bottom spill, floor contacts, mesh and undo/reset');

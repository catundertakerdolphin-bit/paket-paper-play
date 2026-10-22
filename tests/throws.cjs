const assert=require('node:assert/strict'),{PaperBag,V}=require('./runtime.cjs')({mobile:true}),audit=require('./mesh-audit.cjs');
{
 const b=new PaperBag(),hit=b.raycast({o:[.35,.4,6],d:[0,0,-1]}),g=b.gesture(hit,b.snapshot()),start=b.center();b.grab(g,[0,0,0]);b.release({toss:{velocity:[.5,6.5,0],triangle:hit.triangle,weights:hit.weights}});
 for(let f=0;f<24;f++)b.settle(1/60);assert(b.center()[1]>start[1]+1,'A flick must produce free flight after release');assert(Math.min(...Array.from({length:b.count},(_,i)=>b.pos[i*3+1]))>.15);assert.equal(audit(b),0);assert(Math.abs(b.metrics().areaRatio-1)<.015);
 for(let f=0;f<150;f++)b.settle(1/60);assert.equal(audit(b),0);assert(Math.min(...Array.from({length:b.count},(_,i)=>b.pos[i*3+1]))>=.0079);assert(b.fries.pos.every(Number.isFinite));
}
{
 const b=new PaperBag(),L=b.raycast({o:[-.4,2,6],d:[0,0,-1]}),R=b.raycast({o:[.4,2,6],d:[0,0,-1]}),plan=b.tearPlan(L,R);b.cutEdges(plan.order.map(e=>e.key),[1,0,0],plan.sides);assert.equal(b.pieces.length,2);const t=0,piece=b.pieceIds[b.tri[t*3]];b.release({toss:{velocity:[2,4,0],triangle:t,weights:[1/3,1/3,1/3]}});assert(b.pieces[piece].some(i=>b.velocity[i*3+1]>2));for(let k=0;k<b.pieces.length;k++)if(k!==piece)for(const i of b.pieces[k])assert.deepEqual([...b.velocity.subarray(i*3,i*3+3)],[0,0,0],'Throwing one fragment must not launch other pieces');
}
{
 const b=new PaperBag(),hit=b.raycast({o:[0,1.8,6],d:[0,0,-1]}),g=b.gesture(hit,b.snapshot()),before=g.hand.map(m=>[...m.start]);b.smear(g,[.5,.1,0]);for(let f=0;f<55;f++)b.settle(1/60);let dx=0,dz=0;g.hand.forEach((m,i)=>{dx+=b.pos[m.i*3]-before[i][0];dz+=b.pos[m.i*3+2]-before[i][2];});assert(dx/g.hand.length>.08,'Dragging must fold the patch in the finger direction');assert(dz/g.hand.length<-.025,'Directional dragging keeps inward pressure');assert(Math.abs(b.metrics().areaRatio-1)<.01);assert.equal(audit(b),0);
}
console.log('THROW CHECKS PASSED: actual free flight, landing, metric and collision safety, fragment-local momentum and directional crumpling');

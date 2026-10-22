const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../dist/index.html'),'utf8'),win={};
new Function('window','document','setTimeout','clearTimeout',html.match(/<script>([\s\S]*?)<\/script>/)[1].replace('setTimeout(init,20);','window.T={PaperBag,V,makeTearSound};'))(win,{},()=>{},()=>{});
const {PaperBag,V,makeTearSound}=win.T,audit=require('./mesh-audit.cjs');
const hit=(b,x,y)=>b.raycast({o:[x,y,6],d:[0,0,-1]});
function checkMaterial(b){assert.equal(b.tri.length,6752*3);assert(Math.abs(b.area0.reduce((a,c)=>a+c,0)/b.initialArea-1)<1e-7);assert([...b.pos].every(Number.isFinite));for(let h=0;h<b.angles.length;h++)assert(!b.broken.has(b.materialKey(b.origin[b.hinges[h*5]],b.origin[b.hinges[h*5+1]])),'A severed edge cannot retain a bending hinge');}
const b=new PaperBag(true),initial=b.snapshot(),left=hit(b,-.43,2),right=hit(b,.43,2),plan=b.tearPlan(left,right);assert(plan.order.length>50);
const g=b.beginTear(left,right,initial);b.advanceTear(g);assert.equal(b.broken.size,0);
// Translation and inward pinching must never tear the paper.
for(const a of g.anchors)a.current=V.add(a.hit.p,[.7,.4,0]);b.advanceTear(g);assert.equal(b.broken.size,0);
g.anchors[0].current=V.add(left.p,[.2,0,0]);g.anchors[1].current=V.add(right.p,[-.2,0,0]);b.advanceTear(g);assert.equal(b.broken.size,0);
g.anchors[0].current=V.add(left.p,[-.16,0,0]);g.anchors[1].current=V.add(right.p,[.16,0,0]);b.advanceTear(g);assert(b.broken.size>=3);assert(b.count>initial.p.length/3);checkMaterial(b);
const partial=b.snapshot();b.restore(initial);assert.equal(b.broken.size,0);assert.deepEqual([...b.pos],[...initial.p]);assert.deepEqual([...b.tri],[...initial.topology.tri]);b.restore(partial);assert.equal(b.broken.size,partial.topology.broken.length);assert.deepEqual([...b.tri],[...partial.topology.tri]);
b.cutEdges(plan.order.map(e=>e.key),[1,0,0],plan.sides);checkMaterial(b);assert.equal(b.pieces.length,2,'A complete tear must disconnect the paper');assert.notEqual(b.pieceIds[b.tri[left.triangle*3]],b.pieceIds[b.tri[right.triangle*3]]);assert.equal(audit(b),0);
for(let k=0;k<b.pieces.length;k++)for(const i of b.pieces[k])b.velocity[i*3]=k?1:-1;b.dampInternal(1/60);for(let k=0;k<b.pieces.length;k++){const avg=b.pieces[k].reduce((sum,i)=>sum+b.velocity[i*3],0)/b.pieces[k].length;assert(Math.abs(avg)>.95,'Separate fragments retain independent rigid motion');}
const halves=b.snapshot();
for(const [x,expected] of [[-.5,3],[.5,4]]){const a=hit(b,x,1.4),c=hit(b,x,2.2),next=b.tearPlan(a,c);b.cutEdges(next.order.map(e=>e.key),[0,1,0],next.sides);assert.equal(b.pieces.length,expected,'An already detached fragment can be torn again');checkMaterial(b);assert.equal(audit(b),0);}
b.restore(halves);assert.equal(b.pieces.length,2);
b.resetShape();assert.equal(b.count,3415);assert.equal(b.broken.size,0);assert.deepEqual([...b.pos],[...initial.p]);
const lower=hit(b,0,1.4),upper=hit(b,0,2.2),ring=b.tearPlan(lower,upper);b.cutEdges(ring.order.map(e=>e.key),[0,1,0],ring.sides);checkMaterial(b);assert.equal(b.pieces.length,2,'A closed tear can detach a section');assert.equal(audit(b),0);
console.log('TOPOLOGY CHECKS PASSED: partial slit, full split, closed tear, conserved material, undo/redo/reset, independent fragments');
const sounds=[1,2,3].map(seed=>makeTearSound(24000,seed));for(const s of sounds){assert(s.length>6000);assert([...s].every(Number.isFinite));assert(Math.max(...s.map(Math.abs))<=.65);}assert.notDeepEqual(sounds[0],sounds[1]);
console.log('TEAR SOUND CHECKS PASSED');
// Exercise the complete speed-limited hand and evolving topology in physics.
const c=new PaperBag(true),L=hit(c,-.43,2),R=hit(c,.43,2),tear=c.beginTear(L,R,c.snapshot());
c.moveTear(tear,0,V.add(L.p,[-.95,.25,0]));c.moveTear(tear,1,V.add(R.p,[.95,.25,0]));
for(let f=0;f<75;f++)c.settle(1/60);
console.log('physical tear',JSON.stringify({cuts:c.broken.size,pieces:c.pieces?.length,vertices:c.count,...c.metrics()}));
assert.equal(c.pieces.length,2);assert.equal(audit(c),0,'Moving torn mesh must not intersect itself');assert(Math.abs(c.metrics().areaRatio-1)<.01);checkMaterial(c);
const handErrors=tear.anchors.map(a=>{const point=[0,0,0];for(let j=0;j<3;j++)for(let d=0;d<3;d++)point[d]+=c.pos[c.tri[a.triangle*3+j]*3+d]*a.weights[j];return V.len(V.sub(point,a.target));});console.log('hand errors',handErrors);assert(handErrors.every(error=>error<.35),'Torn paper must visibly follow both hands');
c.release();const heights=c.pieces.map(ids=>ids.reduce((sum,i)=>sum+c.pos[i*3+1],0)/ids.length);for(let f=0;f<45;f++)c.settle(1/60);assert.equal(audit(c),0,'Released fragments must not intersect');assert(c.pieces.some((ids,k)=>ids.reduce((sum,i)=>sum+c.pos[i*3+1],0)/ids.length<heights[k]-.1),'Released fragments must fall');
console.log('TEARING PHYSICS CHECKS PASSED');

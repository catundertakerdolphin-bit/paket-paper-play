const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(require('node:path').join(__dirname,'../dist/index.html'),'utf8');
const context={window:{},document:{},console,setTimeout(){},clearTimeout(){}};vm.createContext(context);
vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1].replace('setTimeout(init,20);','window.T={PaperContact,PaperBag,V};'),context);
const {PaperContact,PaperBag,V}=context.window.T;
function toy(prev,pos,tri){const map=new Map(),edges=[];for(let k=0;k<tri.length;k+=3)for(let j=0;j<3;j++){const a=tri[k+j],b=tri[k+(j+1)%3],key=Math.min(a,b)+'/'+Math.max(a,b);if(!map.has(key)){map.set(key,true);edges.push(a,b,1);}}return{count:pos.length/3,pos:new Float32Array(pos),rest:new Float32Array(prev),prev:new Float32Array(prev),invMass:new Float32Array(pos.length/3).fill(1),tri:new Uint16Array(tri),edges:new Float32Array(edges)};}
// One particle crosses entirely through a face between consecutive steps.
{
 const before=[-1,-1,0,1,-1,0,0,1,0,0,0,.4],after=[...before];after[11]=-.4;
 const b=toy(before,after,[0,1,2]),c=new PaperContact(b);assert(Math.abs(c.build(true)-.5)<.00002,'Final swept validation must catch the crossing');c.build();assert(c.ccd>0);assert(c.vf.some(x=>x.i===3));
 for(let j=0;j<12;j++)c.solve();const n=c.normal(0,1,2),A=c.point(0,1),P=c.point(3,1);assert(V.dot(V.sub(P,A),n)>=c.thickness-.0001,'Swept particle must end on its original side');
}
// A translating face crosses a stationary particle: relative motion matters.
{
 const before=[-1,-1,-.3,1,-1,-.3,0,1,-.3,0,0,0],after=[...before];for(const i of [2,5,8])after[i]=.3;
 const b=toy(before,after,[0,1,2]),c=new PaperContact(b);assert(Math.abs(c.build(true)-.5)<.00002);c.build();assert(c.ccd>0);for(let j=0;j<12;j++)c.solve();assert(V.dot(V.sub(c.point(3,1),c.point(0,1)),c.normal(0,1,2))>=c.thickness-.0001);
}
// Two edges cross while their endpoints are outside the opposite faces.
{
 const before=[-1,0,.3,1,0,.3,0,-1,0,0,1,0,-1,.5,.3,.5,-1,0],after=[...before];for(const i of [2,5,14])after[i]=-.3;
 const b=toy(before,after,[0,1,4,2,3,5]),c=new PaperContact(b);c.edgeEdge(0,3);assert(c.ccd>0);assert.equal(c.ee.length,1);
 for(let j=0;j<12;j++)c.solve();const contact=c.ee[0],a=V.add(V.mul(c.point(contact.a,1),1-contact.s),V.mul(c.point(contact.b,1),contact.s)),d=V.add(V.mul(c.point(contact.c,1),1-contact.t),V.mul(c.point(contact.d,1),contact.t));assert(V.dot(V.sub(a,d),contact.n)>=c.thickness-.0001,'Edges may not swap sides');
}
// Cubic coplanarity has all three roots, even if endpoint signs hide two.
{
 const before=[0,0,0,0,-.5,0,0,0,-.8,-.2,0,0],after=[0,0,0,0,.5,0,0,0,.2,.8,0,0],b=toy(before,after,[0,1,2]),c=new PaperContact(b),roots=c.roots(3,0,1,2);assert.equal(roots.length,3);for(let i=0;i<3;i++)assert(Math.abs(roots[i]-[.2,.5,.8][i])<.00002);
}
// Connected faces in the original paper must not repel themselves.
{
 const b=new PaperBag(),c=b.collision;c.build();assert.equal(c.ccd,0);assert.equal(c.vf.length,0);assert.equal(c.ee.length,0);
 // Rigid translation survives internal damping, internal flutter does not.
 for(let a=0;a<b.velocity.length;a+=3){b.velocity[a]=1;b.velocity[a+1]=(a%2?1:-1)*.4;}
 const initial=b.velocity.reduce((sum,x,i)=>sum+(i%3===1?x*x:0),0);b.dampInternal(1/60);const final=b.velocity.reduce((sum,x,i)=>sum+(i%3===1?x*x:0),0);assert(final<initial*.3);assert(b.velocity[0]>.95);
}
// End-of-step edge contact is not a crossing at the start of the step.
// A later collision must also not overwrite an earlier, unrelated TOI.
{
 const before=[-1,0,.3,1,0,.3,0,-1,0,0,1,0,-1,.5,.3,.5,-1,0],after=[...before];for(const i of [2,5,14])after[i]=0;
 const b=toy(before,after,[0,1,4,2,3,5]),c=new PaperContact(b);assert.deepEqual([...c.roots(0,2,3,1)],[1]);c.refit();c.safety=true;c.minTOI=.2;c.motionLimit.fill(1);c.edgeEdge(0,3);assert.equal(c.minTOI,.2,'Contact at t=1 must not become a false t=0 collision');
}
// A conservative collision clamp is local. An awkward torn-corner contact
// must stay collision-safe without stopping a disconnected particle.
{
 const before=[0,0,0,1,0,0,0,1,0,.004,.004,.01,4,0,1],after=[...before];after[11]=-.01;after[12]=5;
 const b=toy(before,after,[0,1,2]);b.origin=new Uint16Array([0,1,2,0,4]);const c=new PaperContact(b);
 assert(Math.abs(c.build(true)-.5)<.00002);c.clipMotion();assert.equal(c.build(true),1);assert(b.pos[11]>0);assert.equal(b.pos[12],5,'Unrelated material must keep its full displacement');
 b.prev[9]=b.pos[9]=.3;b.prev[10]=b.pos[10]=.3;b.prev[11]=.01;b.pos[11]=-.01;
 assert(Math.abs(c.build(true)-.5)<.00002,'A torn corner must still collide with face interiors');c.build();assert(c.vf.some(x=>x.i===3));
}
{
 const before=[-1,0,.3,1,0,.3,0,-1,0,0,1,0,-1,.5,.3,.5,-1,0],after=[...before];for(const i of [2,5,14])after[i]=-.3;
 const b=toy(before,after,[0,1,4,2,3,5]);b.origin=new Uint16Array([0,1,0,3,4,5]);const c=new PaperContact(b);c.edgeEdge(0,3);assert(c.ccd>0,'Matching corner origins must not disable crossings away from the seam tip');
}
console.log('CONTACT CHECKS PASSED: swept vertex/face, moving faces, swept edge/edge, three-root CCD, topology, deformation damping');

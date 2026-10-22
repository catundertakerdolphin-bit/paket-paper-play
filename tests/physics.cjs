const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(require('node:path').join(__dirname,'../dist/index.html'),'utf8');
let code=html.match(/<script>([\s\S]*?)<\/script>/)[1].replace('setTimeout(init,20);','window.physics={PaperBag,V,FLOOR};');
const runtimeWindow={};new Function('window','document','setTimeout','clearTimeout',code)(runtimeWindow,{},()=>{},()=>{});const {PaperBag,V}=runtimeWindow.physics;
function bounds(b){const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(let a=0;a<b.pos.length;a+=3)for(let j=0;j<3;j++){lo[j]=Math.min(lo[j],b.pos[a+j]);hi[j]=Math.max(hi[j],b.pos[a+j]);}return{lo,hi};}
function info(name,b){console.log(name,JSON.stringify({...b.metrics(),center:b.center(),bounds:bounds(b)}));}
const audit=require('./mesh-audit.cjs');const bag=new PaperBag();const materialEdges=new Float32Array(bag.edges);console.log('vertices',bag.count,'triangles',bag.tri.length/3);info('initial',bag);
// Analytic signed hinge gradients must match finite differences.
for(const h of [0,60,100,bag.angles.length-1]){
 const k=h*5,vertex=bag.hinges[k+2],a=vertex*3;bag.pos[a+2]+=.017;
 const angle=bag.hingeGeometry(h),gradient=[...bag.grad];
 for(let j=0;j<4;j++)for(let d=0;d<3;d++){const ix=bag.hinges[k+j]*3+d,old=bag.pos[ix],eps=.00001;bag.pos[ix]=old+eps;const x=bag.hingeGeometry(h);bag.pos[ix]=old-eps;const y=bag.hingeGeometry(h);bag.pos[ix]=old;const numeric=Math.atan2(Math.sin(x-y),Math.cos(x-y))/(2*eps);assert(Math.abs(numeric-gradient[j*3+d])<.13,`gradient h${h},${j},${d}: ${numeric} / ${gradient[j*3+d]}`);}
 bag.pos.set(bag.rest);
}
const start=performance.now();for(let f=0;f<240;f++)bag.settle(1/60);console.log('ms per frame',(performance.now()-start)/240);info('standing 4s',bag);assert(bag.center()[1]>1.4,'Unforced bag must stand');assert(Math.abs(bag.metrics().areaRatio-1)<.004);
const hit=bag.raycast({o:[0,1.55,6],d:[0,0,-1]});assert(hit);const gesture=bag.gesture(hit,bag.snapshot());
for(let f=0;f<180;f++){bag.press(gesture,f*1000/60);bag.settle(1/60);}info('pressed 3s',bag);assert.equal(audit(bag),0,'Pressed mesh cannot intersect itself');assert(Math.abs(bag.metrics().areaRatio-1)<.005);assert([...bag.edges].every((x,i)=>x===materialEdges[i]));bag.release();for(let f=0;f<120;f++)bag.settle(1/60);info('released',bag);
const corner=bag.raycast({o:[0,2.5,6],d:[0,0,-1]})||bag.raycast({o:[0,1.2,6],d:[0,0,-1]});
if(corner){const startHeight=bag.center()[1],g=bag.gesture(corner,bag.snapshot());for(let f=0;f<180;f++){bag.grab(g,[Math.min(f/90,1),Math.min(f/90,1)*1.6,0]);bag.settle(1/60);}info('lift',bag);assert(bounds(bag).lo[1]>.2&&bag.center()[1]>startHeight+.5,'Shift grab must lift the whole bag clear of the floor, across different folded poses');assert.equal(audit(bag),0,'Lifted mesh cannot intersect itself');bag.release();for(let f=0;f<240;f++)bag.settle(1/60);info('drop',bag);assert.equal(audit(bag),0,'Dropped mesh cannot intersect itself');assert(bag.center()[1]<.85,'Released bag should fall on its side');assert(bounds(bag).lo[1]>=.0079,'Ground contact');assert(Math.abs(bag.metrics().areaRatio-1)<.005);assert(bag.metrics().edgeRMS<.012);}


const saved=bag.snapshot();const savedMetrics=bag.metrics();bag.resetShape();assert(bag.center()[1]>1.4);bag.restore(saved);assert.deepEqual([...bag.pos],[...saved.p]);assert.deepEqual([...bag.angles],[...saved.angles]);assert.equal(bag.metrics().areaRatio,savedMetrics.areaRatio);console.log('PHYSICS CHECKS PASSED');

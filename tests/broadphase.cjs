const assert=require('node:assert/strict'),{PaperBag}=require('./runtime.cjs')({mobile:true});
const b=new PaperBag(true),c=b.collision,edges=b.edges,tri=b.tri,edgeCount=edges.length/3,faceCount=tri.length/3;
const box=ids=>{const out=[Infinity,Infinity,Infinity,-Infinity,-Infinity,-Infinity];for(const id of ids)for(const p of [b.pos,b.prev])for(let d=0;d<3;d++){out[d]=Math.min(out[d],p[id*3+d]);out[d+3]=Math.max(out[d+3],p[id*3+d]);}return out;};
const overlaps=(a,d,m)=>a[0]<=d[3]+m&&a[1]<=d[4]+m&&a[2]<=d[5]+m&&a[3]+m>=d[0]&&a[4]+m>=d[1]&&a[5]+m>=d[2];
// Independent brute-force geometry checks the fast candidate traversal. The
// second deformation also exercises rebuilding the spatial partitions.
for(const frame of [0,40]){
 b.frame=frame;
 for(let i=0;i<b.count;i++){const a=i*3,x=b.rest[a],y=b.rest[a+1],z=b.rest[a+2],phase=frame*.02;b.pos[a]=Math.sin(x*1.8+y*.5+phase)*.8;b.pos[a+1]=.8+Math.sin(y*1.5+phase)*.6+z*.05;b.pos[a+2]=Math.sin(y*2+x*.4-phase)*.7+z*.12;for(let d=0;d<3;d++)b.prev[a+d]=b.pos[a+d]+Math.sin(i*.13+d)*.025;}
 const edgeBoxes=Array.from({length:edgeCount},(_,i)=>box([edges[i*3],edges[i*3+1]])),faceBoxes=Array.from({length:faceCount},(_,i)=>box([tri[i*3],tri[i*3+1],tri[i*3+2]])),vertexBoxes=Array.from({length:b.count},(_,i)=>box([i]));
 for(const safety of [false,true]){
  const m=safety?.00001:c.margin,expectedEdges=new Set(),expectedFaces=new Set(),actualEdges=new Set(),actualFaces=new Set();
  for(let i=0;i<edgeCount;i++)for(let j=i+1;j<edgeCount;j++)if(overlaps(edgeBoxes[i],edgeBoxes[j],m))expectedEdges.add(i*edgeCount+j);
  for(let i=0;i<b.count;i++)for(let t=0;t<faceCount;t++)if(overlaps(vertexBoxes[i],faceBoxes[t],m))expectedFaces.add(i*faceCount+t);
  c.edgeEdge=(i,j)=>{assert(i<j);if(!overlaps(edgeBoxes[i],edgeBoxes[j],m))return;const key=i*edgeCount+j;assert(!actualEdges.has(key),'An edge pair is visited once');actualEdges.add(key);};
  c.vertexFace=(i,t)=>{const key=i*faceCount+t;assert(!actualFaces.has(key),'A vertex/face pair is visited once');actualFaces.add(key);};
  c.build(safety);assert.deepEqual(actualEdges,expectedEdges,'The edge hierarchy must retain every swept AABB candidate');assert.deepEqual(actualFaces,expectedFaces,'The face hierarchy must retain every swept AABB candidate');
 }
}
console.log('BROADPHASE CHECKS PASSED: complete and unique swept edge/edge and vertex/face candidates before and after repartitioning');

"use strict";const MOBILE=true,TEAR_MODE=true,QUALITY={"nx":10,"nz":6,"ny":20,"iterations":16,"contacts":8,"dpr":1.25,"shadow":512,"taps":4};const WIDTH=2,HEIGHT=3.35,DEPTH=1.14,NX=10,NZ=6,NY=20,RING=32,PERIM=6.279999999999999,FLOOR=0.008;const V={add:(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],sub:(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],mul:(a,s)=>[a[0]*s,a[1]*s,a[2]*s],dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],len:a=>Math.hypot(a[0],a[1],a[2]),norm:a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l);}};const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),mix=(a,b,t)=>a+(b-a)*t,smooth=(t)=>{t=clamp(t,0,1);return t*t*(3-2*t);},wrapAngle=a=>a>Math.PI?a-Math.PI*2:a< -Math.PI?a+Math.PI*2:a;function seeded(seed){let s=seed>>>0;return ()=>{s+=0x6D2B79F5;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}class PaperContact {
 constructor(bag){
  this.bag=bag;this.thickness=.008;this.margin=.024;this.vf=[];this.ee=[];this.ccd=0;this.safety=false;this.minTOI=1;this.motionLimit=new Float32Array(bag.count);this.fadeLimit=new Float32Array(bag.count);
  const n=bag.tri.length/3;
  this.currentNormals=new Float64Array(n*3);this.oldNormals=new Float64Array(n*3);this.baryAxes=new Float64Array(n*6);this.edgeBoxes=new Float64Array(bag.edges.length*2);this.emptyRoots=[];this.boxes=new Float64Array(n*6);this.candidates=[];this.nodes=[];this.edgeNodes=[];this.treeFrame=-Infinity;this.refit();
 }
 makeTree(boxes){
  const n=boxes.length/6,order=Array.from({length:n},(_,i)=>i),centers=new Float64Array(n*3),nodes=[];
  for(let i=0;i<n;i++)for(let j=0;j<3;j++)centers[i*3+j]=(boxes[i*6+j]+boxes[i*6+j+3])*.5;
  const build=(start,end)=>{
   const index=nodes.length,node={start,count:end-start,size:end-start,left:-1,right:-1,box:new Float64Array(6)};nodes.push(node);
   if(end-start>8){
    const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
    for(let k=start;k<end;k++)for(let j=0;j<3;j++){const c=centers[order[k]*3+j];lo[j]=Math.min(lo[j],c);hi[j]=Math.max(hi[j],c);}
    let axis=0;for(let j=1;j<3;j++)if(hi[j]-lo[j]>hi[axis]-lo[axis])axis=j;
    const sorted=order.slice(start,end).sort((a,b)=>centers[a*3+axis]-centers[b*3+axis]);for(let k=0;k<sorted.length;k++)order[start+k]=sorted[k];
    const mid=(start+end)>>1;node.left=build(start,mid);node.right=build(mid,end);node.count=0;
   }return index;
  };build(0,n);return{nodes,order:new Uint16Array(order)};
 }
 refitTree(nodes,order,boxes){
  for(let i=nodes.length-1;i>=0;i--){const n=nodes[i],box=n.box;for(let j=0;j<3;j++){box[j]=Infinity;box[j+3]=-Infinity;}
   if(n.count){for(let k=n.start;k<n.start+n.count;k++){const t=order[k]*6;for(let j=0;j<3;j++){box[j]=Math.min(box[j],boxes[t+j]);box[j+3]=Math.max(box[j+3],boxes[t+3+j]);}}}
   else{const a=nodes[n.left].box,c=nodes[n.right].box;for(let j=0;j<3;j++){box[j]=Math.min(a[j],c[j]);box[j+3]=Math.max(a[j+3],c[j+3]);}}
  }
 }
 refit(){
  const {pos:p,prev:q,tri}=this.bag,b=this.boxes;
  for(let t=0;t<tri.length;t+=3){const k=t*2,a=tri[t]*3,c=tri[t+1]*3,d=tri[t+2]*3;for(let j=0;j<3;j++){b[k+j]=Math.min(p[a+j],p[c+j],p[d+j],q[a+j],q[c+j],q[d+j]);b[k+3+j]=Math.max(p[a+j],p[c+j],p[d+j],q[a+j],q[c+j],q[d+j]);}}
  for(let phase=0;phase<2;phase++){const src=phase?q:p,out=phase?this.oldNormals:this.currentNormals;for(let t=0;t<tri.length;t+=3){const a=tri[t]*3,c=tri[t+1]*3,d=tri[t+2]*3,x=src[c]-src[a],y=src[c+1]-src[a+1],z=src[c+2]-src[a+2],u=src[d]-src[a],v=src[d+1]-src[a+1],w=src[d+2]-src[a+2],nx=y*w-z*v,ny=z*u-x*w,nz=x*v-y*u,l=Math.sqrt(nx*nx+ny*ny+nz*nz)||1;out[t]=nx/l;out[t+1]=ny/l;out[t+2]=nz/l;
   if(!phase){const uu=x*x+y*y+z*z,uv=x*u+y*v+z*w,vv=u*u+v*v+w*w,den=uu*vv-uv*uv,k=t*2,C=this.baryAxes;if(den>1e-16){C[k]=(vv*x-uv*u)/den;C[k+1]=(vv*y-uv*v)/den;C[k+2]=(vv*z-uv*w)/den;C[k+3]=(uu*u-uv*x)/den;C[k+4]=(uu*v-uv*y)/den;C[k+5]=(uu*w-uv*z)/den;}else C[k]=NaN;}
  }}
  const edges=this.bag.edges,E=this.edgeBoxes;for(let k=0;k<edges.length;k+=3){const a=edges[k]*3,c=edges[k+1]*3,o=k*2;for(let j=0;j<3;j++){E[o+j]=Math.min(p[a+j],p[c+j],q[a+j],q[c+j]);E[o+3+j]=Math.max(p[a+j],p[c+j],q[a+j],q[c+j]);}}
  // Rest-space partitions become poor after crumpling. Repartition from
  // current swept bounds, once per 32 substeps rather than per CCD pass.
  const frame=this.bag.frame||0;
  if(frame-this.treeFrame>=32){
   const faces=this.makeTree(b),edges=this.makeTree(E);this.nodes=faces.nodes;this.order=faces.order;this.stack=new Int32Array(faces.nodes.length);this.edgeNodes=edges.nodes;this.edgeOrder=edges.order;this.pairStack=new Int32Array(edges.nodes.length*2);this.treeFrame=frame;
  }
  this.refitTree(this.nodes,this.order,b);this.refitTree(this.edgeNodes,this.edgeOrder,E);
 }
 query(x0,y0,z0,x1,y1,z1){
  const out=this.candidates,nodes=this.nodes,stack=this.stack,order=this.order,B=this.boxes;out.length=0;let size=1;stack[0]=0;
  while(size){const node=nodes[stack[--size]],b=node.box;if(b[0]>x1||b[1]>y1||b[2]>z1||b[3]<x0||b[4]<y0||b[5]<z0)continue;
   if(node.count){for(let k=node.start;k<node.start+node.count;k++){const t=order[k],a=t*6;if(B[a]>x1||B[a+1]>y1||B[a+2]>z1||B[a+3]<x0||B[a+4]<y0||B[a+5]<z0)continue;out.push(t);}}
   else{stack[size++]=node.left;stack[size++]=node.right;}
  }return out;
 }
 edgePairs(m){
  // Traverse two branches together instead of searching the whole tree once
  // for every edge. Self branches split into LL, LR and RR exactly once.
  const nodes=this.edgeNodes,order=this.edgeOrder,stack=this.pairStack;let size=2;stack[0]=stack[1]=0;
  while(size){const j=stack[--size],i=stack[--size],A=nodes[i],B=nodes[j],a=A.box,b=B.box;
   if(a[0]>b[3]+m||a[1]>b[4]+m||a[2]>b[5]+m||a[3]+m<b[0]||a[4]+m<b[1]||a[5]+m<b[2])continue;
   if(A.count&&B.count){
    for(let x=A.start;x<A.start+A.count;x++)for(let y=i===j?x+1:B.start;y<B.start+B.count;y++){const u=order[x],v=order[y];this.edgeEdge(Math.min(u,v),Math.max(u,v));}
   }else if(i===j){stack[size++]=A.left;stack[size++]=A.left;stack[size++]=A.left;stack[size++]=A.right;stack[size++]=A.right;stack[size++]=A.right;}
   else if(!A.count&&(B.count||A.size>=B.size)){stack[size++]=A.left;stack[size++]=j;stack[size++]=A.right;stack[size++]=j;}
   else{stack[size++]=i;stack[size++]=B.left;stack[size++]=i;stack[size++]=B.right;}
  }
 }
 point(i,t){const a=i*3,p=this.bag.pos,q=this.bag.prev;return[q[a]+(p[a]-q[a])*t,q[a+1]+(p[a+1]-q[a+1])*t,q[a+2]+(p[a+2]-q[a+2])*t];}
 recordTOI(a,b,c,d,time){
  this.minTOI=Math.min(this.minTOI,time);this.ccd++;const fraction=Math.max(0,time-.002),limit=this.motionLimit;
  for(const id of [a,b,c,d])limit[id]=Math.min(limit[id],fraction);
 }
 clipMotion(){
  // Conservative advancement is local: a difficult contact at one torn lip
  // must not stop other folds, or an entirely disconnected paper fragment.
  const {pos:p,prev:q,edges}=this.bag,limit=this.motionLimit,fade=this.fadeLimit;
  // Feather through material neighbours so clipping a contact does not
  // stretch the next row of triangles. Broken seams are not neighbours.
  for(let pass=0;pass<3;pass++){
   fade.set(limit);for(let k=0;k<edges.length;k+=3){const a=edges[k],b=edges[k+1];fade[a]=Math.min(fade[a],limit[b]+.25);fade[b]=Math.min(fade[b],limit[a]+.25);}limit.set(fade);
  }
  for(let i=0;i<limit.length;i++)if(limit[i]<1)for(let j=0;j<3;j++){const a=i*3+j;p[a]=q[a]+(p[a]-q[a])*limit[i];}
 }
 normal(a,b,c,t=1){
  const p=this.bag.pos,q=this.bag.prev; a*=3;b*=3;c*=3;
  const ax=q[a]+(p[a]-q[a])*t,ay=q[a+1]+(p[a+1]-q[a+1])*t,az=q[a+2]+(p[a+2]-q[a+2])*t;
  const x=q[b]+(p[b]-q[b])*t-ax,y=q[b+1]+(p[b+1]-q[b+1])*t-ay,z=q[b+2]+(p[b+2]-q[b+2])*t-az,u=q[c]+(p[c]-q[c])*t-ax,v=q[c+1]+(p[c+1]-q[c+1])*t-ay,w=q[c+2]+(p[c+2]-q[c+2])*t-az;
  const nx=y*w-z*v,ny=z*u-x*w,nz=x*v-y*u,l=Math.sqrt(nx*nx+ny*ny+nz*nz)||1;return[nx/l,ny/l,nz/l];
 }
 bary(i,a,b,c,t=1,face=-1){
  if(t===1&&face>=0){const p=this.bag.pos,A=a*3,I=i*3,k=face*6,C=this.baryAxes;if(!Number.isFinite(C[k]))return null;const x=p[I]-p[A],y=p[I+1]-p[A+1],z=p[I+2]-p[A+2],v=x*C[k]+y*C[k+1]+z*C[k+2],w=x*C[k+3]+y*C[k+4]+z*C[k+5],u=1-v-w;return u<-.0001||v<-.0001||w<-.0001?null:[u,v,w];}
  const p=this.bag.pos,q=this.bag.prev; i*=3;a*=3;b*=3;c*=3;
  const ax=q[a]+(p[a]-q[a])*t,ay=q[a+1]+(p[a+1]-q[a+1])*t,az=q[a+2]+(p[a+2]-q[a+2])*t;
  const ux=q[b]+(p[b]-q[b])*t-ax,uy=q[b+1]+(p[b+1]-q[b+1])*t-ay,uz=q[b+2]+(p[b+2]-q[b+2])*t-az,vx=q[c]+(p[c]-q[c])*t-ax,vy=q[c+1]+(p[c+1]-q[c+1])*t-ay,vz=q[c+2]+(p[c+2]-q[c+2])*t-az,wx=q[i]+(p[i]-q[i])*t-ax,wy=q[i+1]+(p[i+1]-q[i+1])*t-ay,wz=q[i+2]+(p[i+2]-q[i+2])*t-az;
  const uu=ux*ux+uy*uy+uz*uz,uv=ux*vx+uy*vy+uz*vz,vv=vx*vx+vy*vy+vz*vz,wu=wx*ux+wy*uy+wz*uz,wv=wx*vx+wy*vy+wz*vz,den=uu*vv-uv*uv;
  if(den<1e-16)return null;const y=(vv*wu-uv*wv)/den,z=(uu*wv-uv*wu)/den,x=1-y-z;if(x<-.0001||y<-.0001||z<-.0001)return null;return[x,y,z];
 }
 roots(i,a,b,c){
  // Exact cubic coplanarity of four linearly moving points. Its derivative
  // extrema split [0,1] into monotone intervals, including double crossings.
  const p=this.bag.pos,q=this.bag.prev,I=i*3,A=a*3,B=b*3,C=c*3;
  const rx=q[I]-q[A],ry=q[I+1]-q[A+1],rz=q[I+2]-q[A+2],ux=q[B]-q[A],uy=q[B+1]-q[A+1],uz=q[B+2]-q[A+2],vx=q[C]-q[A],vy=q[C+1]-q[A+1],vz=q[C+2]-q[A+2];
  const drx=p[I]-p[A]-rx,dry=p[I+1]-p[A+1]-ry,drz=p[I+2]-p[A+2]-rz,dux=p[B]-p[A]-ux,duy=p[B+1]-p[A+1]-uy,duz=p[B+2]-p[A+2]-uz,dvx=p[C]-p[A]-vx,dvy=p[C+1]-p[A+1]-vy,dvz=p[C+2]-p[A+2]-vz;
  const n0x=uy*vz-uz*vy,n0y=uz*vx-ux*vz,n0z=ux*vy-uy*vx,n1x=uy*dvz-uz*dvy+duy*vz-duz*vy,n1y=uz*dvx-ux*dvz+duz*vx-dux*vz,n1z=ux*dvy-uy*dvx+dux*vy-duy*vx,n2x=duy*dvz-duz*dvy,n2y=duz*dvx-dux*dvz,n2z=dux*dvy-duy*dvx;
  const d=rx*n0x+ry*n0y+rz*n0z,cc=drx*n0x+dry*n0y+drz*n0z+rx*n1x+ry*n1y+rz*n1z,bb=drx*n1x+dry*n1y+drz*n1z+rx*n2x+ry*n2y+rz*n2z,aa=drx*n2x+dry*n2y+drz*n2z;
  const scale=Math.abs(aa)+Math.abs(bb)+Math.abs(cc)+Math.abs(d);if(scale<1e-13)return this.emptyRoots;
  const b1=d+cc/3,b2=d+cc*2/3+bb/3,b3=d+cc+bb+aa;
  if(Math.min(d,b1,b2,b3)>0||Math.max(d,b1,b2,b3)<0)return this.emptyRoots;
  const knots=[0,1],f=t=>((aa*t+bb)*t+cc)*t+d;
  if(Math.abs(aa)<1e-14){if(Math.abs(bb)>1e-14){const t=-cc/(2*bb);if(t>0&&t<1)knots.push(t);}}
  else{const disc=4*bb*bb-12*aa*cc;if(disc>=0){const s=Math.sqrt(disc);for(const t of [(-2*bb-s)/(6*aa),(-2*bb+s)/(6*aa)])if(t>0&&t<1)knots.push(t);}}
  knots.sort((a,b)=>a-b);const out=[];
  for(let k=0;k<knots.length-1;k++){
   let lo=knots[k],hi=knots[k+1],fl=f(lo),fh=f(hi);if(Math.abs(fl)<scale*1e-9&&lo>1e-6)out.push(lo);if(fl*fh>=0)continue;
   for(let n=0;n<17;n++){const mid=(lo+hi)*.5,fm=f(mid);if(fl*fm<=0){hi=mid;fh=fm;}else{lo=mid;fl=fm;}}const root=(lo+hi)*.5;if(root>1e-6)out.push(root);
  }
  // Reaching contact exactly at the end is t=1, not an unknown crossing
  // at t=0. Keep this endpoint so edge validation cannot freeze the step.
  if(Math.abs(f(1))<scale*1e-9)out.push(1);return out;
 }
 vertexFace(i,t){
  const tr=this.bag.tri,a=tr[t*3],b=tr[t*3+1],c=tr[t*3+2];if(i===a||i===b||i===c)return;
  const p=this.bag.pos,q=this.bag.prev,I=i*3,A=a*3,N=t*3,n=this.currentNormals,oldN=this.oldNormals;
  const distance=(p[I]-p[A])*n[N]+(p[I+1]-p[A+1])*n[N+1]+(p[I+2]-p[A+2])*n[N+2];
  const oldD=(q[I]-q[A])*oldN[N]+(q[I+1]-q[A+1])*oldN[N+1]+(q[I+2]-q[A+2])*oldN[N+2];let bw=null,crossed=false;
  if(Math.abs(distance)<this.margin)bw=this.bary(i,a,b,c,1,t);
  if(this.safety){
   const reach=Math.sqrt(Math.max(this.motion2(i,a),this.motion2(i,b),this.motion2(i,c)))+.000001;
   if(Math.abs(distance)>reach||(!bw&&Math.min(this.pointEdge2(i,a,b),this.pointEdge2(i,b,c),this.pointEdge2(i,c,a))>reach*reach))return;
   for(const root of this.roots(i,a,b,c))if(this.bary(i,a,b,c,root))this.recordTOI(i,a,b,c,root);return;
  }
  if(!bw){
   // Conservative relative-motion bound: if the current separation exceeds
   // every possible relative endpoint displacement, there was no crossing.
   const reach=this.margin+Math.sqrt(Math.max(this.motion2(i,a),this.motion2(i,b),this.motion2(i,c)));
   if(Math.abs(distance)>reach)return;
   if(Math.min(this.pointEdge2(i,a,b),this.pointEdge2(i,b,c),this.pointEdge2(i,c,a))>reach*reach)return;
  }
  if(oldD*distance<0||(!bw&&Math.abs(distance)<.12))for(const root of this.roots(i,a,b,c)){const hit=this.bary(i,a,b,c,root);if(hit){bw=hit;crossed=true;break;}}
  if(!bw)return;const side=Math.abs(oldD)>1e-9?Math.sign(oldD):(distance<0?-1:1);
  this.vf.push({i,a,b,c,bw,side});if(crossed)this.ccd++;
 }
 motion2(i,j){const p=this.bag.pos,q=this.bag.prev,a=i*3,b=j*3,x=(p[a]-q[a])-(p[b]-q[b]),y=(p[a+1]-q[a+1])-(p[b+1]-q[b+1]),z=(p[a+2]-q[a+2])-(p[b+2]-q[b+2]);return x*x+y*y+z*z;}
 pointEdge2(i,a,b){
  const p=this.bag.pos; i*=3;a*=3;b*=3;const x=p[b]-p[a],y=p[b+1]-p[a+1],z=p[b+2]-p[a+2],u=p[i]-p[a],v=p[i+1]-p[a+1],w=p[i+2]-p[a+2],len=x*x+y*y+z*z;
  const t=len>1e-16?clamp((x*u+y*v+z*w)/len,0,1):0,dx=u-t*x,dy=v-t*y,dz=w-t*z;return dx*dx+dy*dy+dz*dz;
 }
 closest(a,b,c,d,t=1){
  const p=this.bag.pos,q=this.bag.prev; a*=3;b*=3;c*=3;d*=3;
  const ax=q[a]+(p[a]-q[a])*t,ay=q[a+1]+(p[a+1]-q[a+1])*t,az=q[a+2]+(p[a+2]-q[a+2])*t,cx=q[c]+(p[c]-q[c])*t,cy=q[c+1]+(p[c+1]-q[c+1])*t,cz=q[c+2]+(p[c+2]-q[c+2])*t;
  const ux=q[b]+(p[b]-q[b])*t-ax,uy=q[b+1]+(p[b+1]-q[b+1])*t-ay,uz=q[b+2]+(p[b+2]-q[b+2])*t-az,vx=q[d]+(p[d]-q[d])*t-cx,vy=q[d+1]+(p[d+1]-q[d+1])*t-cy,vz=q[d+2]+(p[d+2]-q[d+2])*t-cz,wx=ax-cx,wy=ay-cy,wz=az-cz;
  const uu=ux*ux+uy*uy+uz*uz,uv=ux*vx+uy*vy+uz*vz,vv=vx*vx+vy*vy+vz*vz,uw=ux*wx+uy*wy+uz*wz,vw=vx*wx+vy*wy+vz*wz,den=uu*vv-uv*uv;if(uu<1e-14||vv<1e-14)return null;
  let s=den>1e-16?clamp((uv*vw-vv*uw)/den,0,1):0,tb=(uv*s+vw)/vv;if(tb<0){tb=0;s=clamp(-uw/uu,0,1);}else if(tb>1){tb=1;s=clamp((uv-uw)/uu,0,1);}
  const dx=wx+ux*s-vx*tb,dy=wy+uy*s-vy*tb,dz=wz+uz*s-vz*tb;return{s,t:tb,delta:[dx,dy,dz],length:Math.sqrt(dx*dx+dy*dy+dz*dz)};
 }
 edgeEdge(i,j){
  const box=this.edgeBoxes,A=i*6,B=j*6,m=this.safety?.00001:this.margin;
  if(box[A]>box[B+3]+m||box[A+1]>box[B+4]+m||box[A+2]>box[B+5]+m||box[A+3]+m<box[B]||box[A+4]+m<box[B+1]||box[A+5]+m<box[B+2])return;
  const e=this.bag.edges,a=e[i*3],b=e[i*3+1],c=e[j*3],d=e[j*3+1];
  if(a===c||a===d||b===c||b===d)return;
  let close=this.closest(a,b,c,d);if(!close)return;let crossed=false,n=null;
  if(this.safety){
   const reach=Math.sqrt(Math.max(this.motion2(a,c),this.motion2(a,d),this.motion2(b,c),this.motion2(b,d)))+.000001;if(close.length>reach)return;
   let found=false;
   for(const root of this.roots(a,c,d,b)){const q=this.closest(a,b,c,d,root);if(q&&q.length<.00002){this.recordTOI(a,b,c,d,root);found=true;}}
   if(!found&&close.length<.000001&&close.s>.0001&&close.s<.9999&&close.t>.0001&&close.t<.9999){const old=this.closest(a,b,c,d,0);if(old&&old.length>.00001)this.recordTOI(a,b,c,d,0);}
   return;
  }
  if(close.length>=this.margin){
   const reach=this.margin+Math.sqrt(Math.max(this.motion2(a,c),this.motion2(a,d),this.motion2(b,c),this.motion2(b,d)));if(close.length>reach)return;
   for(const root of this.roots(a,c,d,b)){const q=this.closest(a,b,c,d,root);if(q&&q.length<.00002){close=q;crossed=true;n=V.norm(V.cross(V.sub(this.point(b,root),this.point(a,root)),V.sub(this.point(d,root),this.point(c,root))));break;}}
   if(!crossed)return;
  }
  if(!n){if(close.length>1e-8)n=V.mul(close.delta,1/close.length);else n=V.norm(V.cross(V.sub(this.point(b,1),this.point(a,1)),V.sub(this.point(d,1),this.point(c,1))));}
  if(V.len(n)<.1)return;
  const oldP=V.add(V.mul(this.point(a,0),1-close.s),V.mul(this.point(b,0),close.s)),oldQ=V.add(V.mul(this.point(c,0),1-close.t),V.mul(this.point(d,0),close.t));
  if(V.dot(V.sub(oldP,oldQ),n)<0)n=V.mul(n,-1);
  this.ee.push({a,b,c,d,s:close.s,t:close.t,n});if(crossed)this.ccd++;
 }
 build(safety=false){
  this.safety=safety;this.minTOI=1;if(safety)this.motionLimit.fill(1);else{this.vf.length=0;this.ee.length=0;}this.ccd=0;this.refit();const b=this.bag,p=b.pos,q=b.prev,m=safety?.00001:this.margin;
  for(let i=0;i<b.count;i++){
   const a=i*3,list=this.query(Math.min(p[a],q[a])-m,Math.min(p[a+1],q[a+1])-m,Math.min(p[a+2],q[a+2])-m,Math.max(p[a],q[a])+m,Math.max(p[a+1],q[a+1])+m,Math.max(p[a+2],q[a+2])+m);
   for(const t of list)this.vertexFace(i,t);
  }
  this.edgePairs(m);
  this.safety=false;return this.minTOI;
 }
 solve(){
  const p=this.bag.pos,w=this.bag.invMass,thickness=this.thickness;
  for(const c of this.vf){
   const ids=[c.i,c.a,c.b,c.c],weights=[1,-c.bw[0],-c.bw[1],-c.bw[2]],n=this.normal(c.a,c.b,c.c);let distance=0,den=0;
   for(let k=0;k<4;k++){const a=ids[k]*3;distance+=weights[k]*(p[a]*n[0]+p[a+1]*n[1]+p[a+2]*n[2])*c.side;den+=w[ids[k]]*weights[k]*weights[k];}
   if(distance>=thickness||den<1e-9)continue;const f=Math.min(.07,thickness-distance)/den;
   for(let k=0;k<4;k++){const a=ids[k]*3,s=w[ids[k]]*weights[k]*f*c.side;p[a]+=s*n[0];p[a+1]+=s*n[1];p[a+2]+=s*n[2];}
  }
  for(const c of this.ee){
   const ids=[c.a,c.b,c.c,c.d],weights=[1-c.s,c.s,-(1-c.t),-c.t],n=c.n;let distance=0,den=0;
   for(let k=0;k<4;k++){const a=ids[k]*3;distance+=weights[k]*(p[a]*n[0]+p[a+1]*n[1]+p[a+2]*n[2]);den+=w[ids[k]]*weights[k]*weights[k];}
   if(distance>=thickness||den<1e-9)continue;const f=Math.min(.07,thickness-distance)/den;
   for(let k=0;k<4;k++){const a=ids[k]*3,s=w[ids[k]]*weights[k]*f;p[a]+=s*n[0];p[a+1]+=s*n[1];p[a+2]+=s*n[2];}
  }
 }
}class Fries {
 constructor(){
  this.count=6;this.scale=.3375;this.pos=new Float32Array(this.count*6);this.prev=new Float32Array(this.pos.length);this.velocity=new Float32Array(this.pos.length);this.length=new Float32Array(this.count);this.radius=new Float32Array(this.count);this.side=new Float32Array(this.count*3);this.touching=new Uint8Array(this.count);this.sleepMask=new Uint8Array(this.count);this.restClock=new Float32Array(this.count);this.floorMask=new Uint8Array(this.count);this.floorClock=new Float32Array(this.count);this.sleeping=false;this.quiet=0;
  const rand=seeded(53122);
  for(let i=0;i<this.count;i++){
   const a=i*6,L=this.length[i]=(1.05+rand()*.52)*this.scale,r=this.radius[i]=(.073+rand()*.009)*this.scale,yaw=(rand()-.5)*.9,axis=V.norm([Math.cos(yaw),(rand()-.5)*.025,Math.sin(yaw)]);
   const center=[(i%3-1)*.6+(rand()-.5)*.015,FLOOR+r+Math.abs(axis[1])*L*.5+.001,(Math.floor(i/3)-.5)*.44+(rand()-.5)*.02];
   for(let d=0;d<3;d++){this.pos[a+d]=center[d]-axis[d]*L*.5;this.pos[a+3+d]=center[d]+axis[d]*L*.5;}const angle=rand()*6.283;this.side.set([Math.cos(angle),0,Math.sin(angle)],i*3);
  }
  this.prev.set(this.pos);this.restPose=new Float32Array(this.pos);this.initial=this.snapshot();
 }
 snapshot(){return{p:new Float32Array(this.pos),v:new Float32Array(this.velocity),side:new Float32Array(this.side),rest:new Float32Array(this.restPose),mask:new Uint8Array(this.sleepMask),clocks:new Float32Array(this.restClock),floor:new Uint8Array(this.floorMask),floorClocks:new Float32Array(this.floorClock),sleeping:this.sleeping,quiet:this.quiet};}
 restore(s){this.pos.set(s.p);this.prev.set(s.p);this.velocity.set(s.v);if(s.side)this.side.set(s.side);this.restPose.set(s.rest||s.p);this.sleepMask.fill(0);this.restClock.fill(0);this.floorMask.fill(0);this.floorClock.fill(0);if(s.mask)this.sleepMask.set(s.mask);if(s.clocks)this.restClock.set(s.clocks);if(s.floor)this.floorMask.set(s.floor);if(s.floorClocks)this.floorClock.set(s.floorClocks);this.sleeping=!!s.sleeping;this.quiet=s.quiet||0;}
 point(i,t,p=this.pos){const a=i*6;return[mix(p[a],p[a+3],t),mix(p[a+1],p[a+4],t),mix(p[a+2],p[a+5],t)];}
 trianglePoint(P,A,B,C){
  const ab=V.sub(B,A),ac=V.sub(C,A),ap=V.sub(P,A),d1=V.dot(ab,ap),d2=V.dot(ac,ap);
  if(d1<=0&&d2<=0)return{p:A,w:[1,0,0]};
  const bp=V.sub(P,B),d3=V.dot(ab,bp),d4=V.dot(ac,bp);if(d3>=0&&d4<=d3)return{p:B,w:[0,1,0]};
  const vc=d1*d4-d3*d2;if(vc<=0&&d1>=0&&d3<=0){const t=d1/(d1-d3);return{p:V.add(A,V.mul(ab,t)),w:[1-t,t,0]};}
  const cp=V.sub(P,C),d5=V.dot(ab,cp),d6=V.dot(ac,cp);if(d6>=0&&d5<=d6)return{p:C,w:[0,0,1]};
  const vb=d5*d2-d1*d6;if(vb<=0&&d2>=0&&d6<=0){const t=d2/(d2-d6);return{p:V.add(A,V.mul(ac,t)),w:[1-t,0,t]};}
  const va=d3*d6-d5*d4;if(va<=0&&d4-d3>=0&&d5-d6>=0){const t=(d4-d3)/(d4-d3+d5-d6);return{p:V.add(B,V.mul(V.sub(C,B),t)),w:[0,1-t,t]};}
  const den=va+vb+vc;if(Math.abs(den)<1e-15)return{p:A,w:[1,0,0]};const v=vb/den,w=vc/den;return{p:V.add(A,V.add(V.mul(ab,v),V.mul(ac,w))),w:[1-v-w,v,w]};
 }
 segments(A,B,C,D){
  const u=V.sub(B,A),v=V.sub(D,C),w=V.sub(A,C),aa=V.dot(u,u),bb=V.dot(u,v),cc=V.dot(v,v),dd=V.dot(u,w),ee=V.dot(v,w),den=aa*cc-bb*bb;
  let s=den>1e-14?clamp((bb*ee-cc*dd)/den,0,1):0,t=cc>1e-14?(bb*s+ee)/cc:0;
  if(t<0){t=0;s=aa?clamp(-dd/aa,0,1):0;}else if(t>1){t=1;s=aa?clamp((bb-dd)/aa,0,1):0;}
  const p=V.add(A,V.mul(u,s)),q=V.add(C,V.mul(v,t)),delta=V.sub(p,q);return{s,t,p,q,delta,d2:V.dot(delta,delta)};
 }
 rodTriangle(i,ids,bag){
  const A=this.point(i,0),B=this.point(i,1),p=bag.pos,q=bag.prev,key=ids[0]+'|'+ids[1]+'|'+ids[2];let face=this.faceCache.get(key);
  if(!face){const T=ids.map(id=>[p[id*3],p[id*3+1],p[id*3+2]]),oldT=ids.map(id=>[q[id*3],q[id*3+1],q[id*3+2]]);face={T,oldT,N:V.norm(V.cross(V.sub(T[1],T[0]),V.sub(T[2],T[0]))),oldN:V.norm(V.cross(V.sub(oldT[1],oldT[0]),V.sub(oldT[2],oldT[0])))};this.faceCache.set(key,face);}
  const {T,oldT,N,oldN}=face,r=this.radius[i]+.003*this.scale,da=V.dot(V.sub(A,T[0]),N),db=V.dot(V.sub(B,T[0]),N),oa=V.dot(V.sub(this.point(i,0,this.prev),oldT[0]),oldN),ob=V.dot(V.sub(this.point(i,1,this.prev),oldT[0]),oldN);
  if((da>r&&db>r&&oa>r&&ob>r)||(da< -r&&db< -r&&oa< -r&&ob< -r))return null;
  let best=null;
  const consider=(s,P,Q,w)=>{const delta=V.sub(P,Q),d2=V.dot(delta,delta);if(!best||d2<best.d2)best={s,p:P,q:Q,w,delta,d2};};
  for(const s of [0,1]){const P=s?B:A,hit=this.trianglePoint(P,...T);consider(s,P,hit.p,hit.w);}
  for(let j=0;j<3;j++){const hit=this.segments(A,B,T[j],T[(j+1)%3]),w=[0,0,0];w[j]=1-hit.t;w[(j+1)%3]=hit.t;consider(hit.s,hit.p,hit.q,w);}
  const axis=V.sub(B,A),den=V.dot(axis,N);
  if(Math.abs(den)>1e-10){const s=V.dot(V.sub(T[0],A),N)/den;if(s>=0&&s<=1){const P=V.add(A,V.mul(axis,s)),hit=this.trianglePoint(P,...T);if(V.len(V.sub(P,hit.p))<1e-6)consider(s,P,hit.p,hit.w);}}
  // Swept endpoint/midpoint checks also catch a fast moving paper wall.
  for(const s of [0,.5,1]){
   const P=this.point(i,s),Q=this.point(i,s,this.prev),before=V.dot(V.sub(Q,oldT[0]),oldN),after=V.dot(V.sub(P,T[0]),N);
   if(before*after<0){const time=Math.abs(before)/(Math.abs(before)+Math.abs(after)),at=V.add(Q,V.mul(V.sub(P,Q),time)),face=oldT.map((x,k)=>V.add(x,V.mul(V.sub(T[k],x),time))),hit=this.trianglePoint(at,...face);
    if(V.len(V.sub(at,hit.p))<.0005*this.scale){const wall=[0,0,0];for(let k=0;k<3;k++)for(let d=0;d<3;d++)wall[d]+=T[k][d]*hit.w[k];return{s,p:P,q:wall,w:hit.w,n:V.mul(N,before<0?-1:1),crossed:true};}
   }
  }
  if(best.d2>this.radius[i]**2)return null;
  if(best.d2>1e-12)best.n=V.mul(best.delta,1/Math.sqrt(best.d2));
  else{const old=this.point(i,best.s,this.prev),oldFace=[0,0,0];for(let k=0;k<3;k++)for(let d=0;d<3;d++)oldFace[d]+=oldT[k][d]*best.w[k];best.n=V.mul(N,V.dot(V.sub(old,oldFace),oldN)<0?-1:1);}
  return best;
 }
 movePoint(i,s,delta,strength=1){if(this.sleepMask[i])return;const a=i*6,w0=1-s,w1=s,den=w0*w0+w1*w1;for(let d=0;d<3;d++){this.pos[a+d]+=delta[d]*w0/den*strength;this.pos[a+3+d]+=delta[d]*w1/den*strength;}}
 rods(){
  for(let i=0;i<this.count;i++){if(this.sleepMask[i])continue;const a=i*6,axis=V.sub(this.point(i,1),this.point(i,0)),len=V.len(axis)||1,f=(len-this.length[i])*.5/len;for(let d=0;d<3;d++){this.pos[a+d]+=axis[d]*f;this.pos[a+3+d]-=axis[d]*f;}}
 }
 pairs(){
  for(let i=0;i<this.count;i++)for(let j=0;j<i;j++){
   if(this.sleepMask[i]&&this.sleepMask[j])continue;
   const A=this.point(i,0),B=this.point(i,1),C=this.point(j,0),D=this.point(j,1),radius=this.radius[i]+this.radius[j];
   if(Math.min(A[0],B[0])>Math.max(C[0],D[0])+radius||Math.max(A[0],B[0])+radius<Math.min(C[0],D[0])||Math.min(A[1],B[1])>Math.max(C[1],D[1])+radius||Math.max(A[1],B[1])+radius<Math.min(C[1],D[1])||Math.min(A[2],B[2])>Math.max(C[2],D[2])+radius||Math.max(A[2],B[2])+radius<Math.min(C[2],D[2]))continue;
   const hit=this.segments(A,B,C,D);if(hit.d2>=radius*radius)continue;const len=Math.sqrt(hit.d2),n=len>1e-7?V.mul(hit.delta,1/len):V.norm(V.sub(V.add(A,B),V.add(C,D))),correction=V.mul(V.len(n)>.1?n:[1,0,0],(radius-len)*.5);
   if(radius-len>.01*this.scale){this.sleepMask[i]=this.sleepMask[j]=0;this.restClock[i]=this.restClock[j]=0;}
   this.touching[i]=this.touching[j]=1;this.movePoint(i,hit.s,correction,this.sleepMask[j]?2:1);this.movePoint(j,hit.t,V.mul(correction,-1),this.sleepMask[i]?2:1);
  }
 }
 walls(bag,friction=false){
  const collider=bag.collision,p=this.pos,q=this.prev;
  for(let i=0;i<this.count;i++){
   if(this.sleepMask[i])continue;
   const a=i*6,margin=.002*this.scale,r=this.radius[i]+margin,lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
   for(let d=0;d<3;d++){lo[d]=Math.min(p[a+d],p[a+3+d],q[a+d],q[a+3+d])-r;hi[d]=Math.max(p[a+d],p[a+3+d],q[a+d],q[a+3+d])+r;}
   const triangles=collider.query(...lo,...hi);
   for(const t of triangles){const ids=[bag.tri[t*3],bag.tri[t*3+1],bag.tri[t*3+2]],hit=this.rodTriangle(i,ids,bag);if(!hit)continue;
    const gap=V.dot(V.sub(this.point(i,hit.s),hit.q),hit.n),depth=r-gap;if(depth<=0)continue;this.touching[i]=1;this.movePoint(i,hit.s,V.mul(hit.n,Math.min(.18,depth)));
    if(friction){const wall=[0,0,0];for(let k=0;k<3;k++)for(let d=0;d<3;d++)wall[d]+=(bag.pos[ids[k]*3+d]-bag.prev[ids[k]*3+d])*hit.w[k];const slip=V.sub(V.sub(this.point(i,hit.s),this.point(i,hit.s,this.prev)),wall),normal=V.dot(slip,hit.n),tangent=V.sub(slip,V.mul(hit.n,normal)),travel=V.len(tangent),f=travel?Math.min(.24,Math.max(0,depth-margin)*.32/travel):0;this.movePoint(i,hit.s,V.mul(tangent,-f));}
   }
  }
 }
 ground(friction=false){for(let i=0;i<this.count;i++){if(this.sleepMask[i])continue;for(let e=0;e<2;e++){const a=i*6+e*3,y=FLOOR+this.radius[i];if(this.pos[a+1]<y+.004*this.scale){this.touching[i]=1;this.pos[a+1]=Math.max(this.pos[a+1],y);if(friction){this.pos[a]-=(this.pos[a]-this.prev[a])*.22;this.pos[a+2]-=(this.pos[a+2]-this.prev[a+2])*.22;}}}}}
 paperBelow(i,bag){
  const A=this.point(i,0),B=this.point(i,1),r=this.radius[i],tr=bag.tri,p=bag.pos;
  const list=bag.collision.query(Math.min(A[0],B[0])-r,FLOOR-.003,Math.min(A[2],B[2])-r,Math.max(A[0],B[0])+r,FLOOR+.025,Math.max(A[2],B[2])+r);
  for(const t of list){const T=[0,1,2].map(j=>[...p.subarray(tr[t*3+j]*3,tr[t*3+j]*3+3)]),N=V.norm(V.cross(V.sub(T[1],T[0]),V.sub(T[2],T[0])));if(Math.abs(N[1])<.2)continue;
   for(const s of [0,.5,1]){const P=this.point(i,s);P[1]=FLOOR;const hit=this.trianglePoint(P,...T).p;if(hit[1]<=FLOOR+.012&&Math.hypot(hit[0]-P[0],hit[2]-P[2])<r*.8)return true;}
  }return false;
 }
 updateFloor(dt,bag){
  for(let i=0;i<this.count;i++){const a=i*6,y=FLOOR+this.radius[i],near=Math.max(this.pos[a+1],this.pos[a+4])<y+.018&&Math.abs((this.velocity[a+1]+this.velocity[a+4])*.5)<.65;
   this.floorClock[i]=near&&!this.paperBelow(i,bag)?this.floorClock[i]+dt:0;this.floorMask[i]=this.floorClock[i]>=.10?1:0;
  }
 }
 step(dt,bag){
  if(this.sleeping&&bag.sleeping&&!bag.control)return false;
  const moving=!bag.sleeping||!!bag.control;if(moving){this.sleepMask.fill(0);this.restClock.fill(0);this.restPose.set(this.pos);}this.sleeping=false;this.prev.set(this.pos);this.touching.fill(0);const drag=Math.exp(-dt*.65);
  for(let a=0;a<this.pos.length;a+=3){if(this.sleepMask[Math.floor(a/6)])continue;this.velocity[a+1]-=9.81*dt;for(let d=0;d<3;d++)this.pos[a+d]+=clamp(this.velocity[a+d]*drag,-7,7)*dt;}
  bag.collision.refit();this.faceCache=new Map();
  for(let iter=0;iter<3;iter++){this.rods();this.pairs();this.walls(bag,iter===2);this.ground(iter===2);}
  this.rods();this.walls(bag);this.ground();
  for(let a=0;a<this.pos.length;a++)this.velocity[a]=(this.pos[a]-this.prev[a])/dt;
  const angular=Math.exp(-dt*1.8),linear=Math.exp(-dt*.6);
  for(let i=0;i<this.count;i++){const a=i*6,axis=V.norm(V.sub(this.point(i,1),this.point(i,0))),mean=[0,0,0],turn=[0,0,0];for(let d=0;d<3;d++){mean[d]=(this.velocity[a+d]+this.velocity[a+3+d])*.5;turn[d]=(this.velocity[a+3+d]-this.velocity[a+d])*.5;}const stretch=V.dot(turn,axis),contact=this.touching[i];for(let d=0;d<3;d++){const spin=(turn[d]-axis[d]*stretch)*angular*(contact?.99:1),translation=mean[d]*linear;this.velocity[a+d]=translation-spin;this.velocity[a+3+d]=translation+spin;}}
  // Contact iterations can leave sub-pixel jitter. Sleep by actual pose
  // stability over time, rather than keeping a resting pile awake forever.
  for(let i=0;i<this.count;i++){
   if(this.sleepMask[i]||moving)continue;const a=i*6;let drift=0;for(let d=0;d<6;d++)drift=Math.max(drift,Math.abs(this.pos[a+d]-this.restPose[a+d]));
   if(drift>.03*this.scale){this.restPose.set(this.pos.subarray(a,a+6),a);this.restClock[i]=0;}else this.restClock[i]+=dt;
   if(this.restClock[i]>.6&&this.touching[i]){this.sleepMask[i]=1;this.velocity.fill(0,a,a+6);}
  }
  this.updateFloor(dt,bag);this.sleeping=this.sleepMask.every(value=>value===1);this.quiet=this.sleeping?Math.min(...this.restClock):0;return true;
 }
 rebuild(){
  const data=this.data||(this.data=new Float32Array(this.count*44*3*8));let offset=0;
  const ring=[[-.72,-1],[.72,-1],[1,-.72],[1,.72],[.72,1],[-.72,1],[-1,.72],[-1,-.72]];
  for(let i=0;i<this.count;i++){
   let A=this.point(i,0),B=this.point(i,1);const axis=V.norm(V.sub(B,A)),old=[...this.side.slice(i*3,i*3+3)];A=V.add(A,V.mul(axis,-this.radius[i]*.6));B=V.add(B,V.mul(axis,this.radius[i]*.6));let U=V.sub(old,V.mul(axis,V.dot(old,axis)));if(V.len(U)<.01)U=V.cross(axis,Math.abs(axis[2])<.8?[0,0,1]:[1,0,0]);U=V.norm(U);this.side.set(U,i*3);const W=V.cross(axis,U),width=this.radius[i]*.79,vertices=[];
   for(let k=0;k<3;k++)for(let j=0;j<8;j++){const t=k*.5,scale=k===1?1:.87,bow=k===1?Math.sin(i*2.7)*.015*this.scale:0;vertices.push(V.add(V.add(A,V.mul(V.sub(B,A),t)),V.add(V.mul(U,ring[j][0]*width*scale+bow),V.mul(W,ring[j][1]*width*scale))));}
   const vertex=(id,n,u,v)=>{const P=vertices[id],inset=.006,tx=(i%4+inset+u*(1-inset*2))/4,ty=(Math.floor(i/4)+inset+v*(1-inset*2))/4;data.set([...P,...n,tx,ty],offset);offset+=8;};
   const triangle=(a,b,c,uv)=>{const n=V.norm(V.cross(V.sub(vertices[b],vertices[a]),V.sub(vertices[c],vertices[a])));vertex(a,n,...uv[0]);vertex(b,n,...uv[1]);vertex(c,n,...uv[2]);};
   for(let k=0;k<2;k++)for(let j=0;j<8;j++){const a=k*8+j,b=k*8+(j+1)%8,c=a+8,d=b+8,u=j/8,v=k/2;triangle(a,b,d,[[u,v],[u+.125,v],[u+.125,v+.5]]);triangle(a,d,c,[[u,v],[u+.125,v+.5],[u,v+.5]]);}
   for(let j=1;j<7;j++){triangle(0,j+1,j,[[.5,.005],[.5,.005],[.5,.005]]);triangle(16,16+j,17+j,[[.5,.995],[.5,.995],[.5,.995]]);}
  }return data;
 }
 shadows(){
  const data=this.shadowData||(this.shadowData=new Float32Array(this.count*6*8));let offset=0;
  for(let i=0;i<this.count;i++){
   const A=this.point(i,0),B=this.point(i,1),dx=B[0]-A[0],dz=B[2]-A[2],length=Math.hypot(dx,dz),ux=length>.01?dx/length:1,uz=length>.01?dz/length:0,pad=.17*this.scale,fade=.15*Math.exp(-Math.max(0,Math.min(A[1],B[1])-FLOOR-this.radius[i])*6/this.scale);
   const points=[[A[0]-ux*pad-uz*pad,A[2]-uz*pad+ux*pad],[B[0]+ux*pad-uz*pad,B[2]+uz*pad+ux*pad],[B[0]+ux*pad+uz*pad,B[2]+uz*pad-ux*pad],[A[0]-ux*pad+uz*pad,A[2]-uz*pad-ux*pad]],uv=[[0,-1],[1,-1],[1,1],[0,1]];
   for(const j of [0,1,2,0,2,3]){data.set([points[j][0],-.006,points[j][1],fade,0,0,...uv[j]],offset);offset+=8;}
  }return data;
 }
}class PaperBag {
 constructor(allowTear=TEAR_MODE){
  const rest=[],uv=[],wall=[],tri=[],faces=[],rand=seeded(80723);
  for(let j=0;j<=NY;j++)for(let i=0;i<RING;i++){
   let side,k,steps,start,len;
   if(i<NX){side=0;k=i;steps=NX;start=0;len=WIDTH;}
   else if(i<NX+NZ){side=1;k=i-NX;steps=NZ;start=WIDTH;len=DEPTH;}
   else if(i<2*NX+NZ){side=2;k=i-NX-NZ;steps=NX;start=WIDTH+DEPTH;len=WIDTH;}
   else{side=3;k=i-2*NX-NZ;steps=NZ;start=2*WIDTH+DEPTH;len=DEPTH;}
   const q=(k+(k&&j&&j<NY?(rand()-.5)*.20:0))/steps,t=j/NY,s=.94+.06*smooth(t/.09);
   let x,z;
   if(side===0){x=(q-.5)*WIDTH*s;z=DEPTH*.5*s;}
   if(side===1){x=WIDTH*.5*s-.045*Math.sin(q*Math.PI)*smooth(t/.13);z=(.5-q)*DEPTH*s;}
   if(side===2){x=(.5-q)*WIDTH*s;z=-DEPTH*.5*s;}
   if(side===3){x=-WIDTH*.5*s+.045*Math.sin(q*Math.PI)*smooth(t/.13);z=(q-.5)*DEPTH*s;}
   rest.push(x,FLOOR+HEIGHT*t,z);uv.push((start+q*len)/PERIM,t);wall.push(side);
  }
  const add=(a,b,c,f)=>{tri.push(a,b,c);faces.push(f);};
  for(let j=0;j<NY;j++)for(let i=0;i<RING;i++){
   const a=j*RING+i,b=j*RING+(i+1)%RING,c=a+RING,d=j*RING+(i+1)%RING+RING,f=wall[a];
   if((i+j)%2){add(a,b,c,f);add(b,d,c,f);}else{add(a,b,d,f);add(a,d,c,f);}
  }
  // A proper tessellated bottom, welded to the same wall vertices. No fixed
  // particles, long triangle fan, invisible anchor or fixed world-space axes.
  const bottom=[];
  for(let z=0;z<=NZ;z++)for(let x=0;x<=NX;x++){
   let id;if(z===0)id=x;else if(x===NX)id=NX+z;else if(z===NZ)id=NX+NZ+(NX-x);else if(x===0)id=(2*NX+NZ+(NZ-z))%RING;
   else{id=rest.length/3;rest.push((x/NX-.5)*WIDTH*.94,FLOOR,(.5-z/NZ)*DEPTH*.94);uv.push(.45+x/NX*.08,.015+z/NZ*.04);wall.push(4);}bottom.push(id);
  }
  for(let z=0;z<NZ;z++)for(let x=0;x<NX;x++){const a=bottom[z*(NX+1)+x],b=bottom[z*(NX+1)+x+1],c=bottom[(z+1)*(NX+1)+x],d=bottom[(z+1)*(NX+1)+x+1];add(a,c,b,4);add(b,c,d,4);}
  this.count=rest.length/3;this.rest=new Float32Array(rest);this.pos=new Float32Array(rest);this.prev=new Float32Array(rest);this.velocity=new Float32Array(rest.length);this.goal=this.pos;
  this.uv=new Float32Array(uv);this.wall=new Uint8Array(wall);this.tri=new Uint16Array(tri);this.faces=new Uint8Array(faces);
  this.area0=new Float32Array(faces.length);this.mass=new Float32Array(this.count);const edgeMap=new Map(),edges=[],hinges=[];
  for(let t=0;t<tri.length;t+=3){
   const ids=tri.slice(t,t+3),area=this.triangleArea(ids[0],ids[1],ids[2],this.rest);this.area0[t/3]=area;
   for(const id of ids)this.mass[id]+=area/3;
   for(let k=0;k<3;k++){
    const a=ids[k],b=ids[(k+1)%3],c=ids[(k+2)%3],key=Math.min(a,b)*this.count+Math.max(a,b),old=edgeMap.get(key);
    if(old)hinges.push(old.a,old.b,old.c,c,faces[old.t]===4||faces[t/3]===4?1:0);
    else{edgeMap.set(key,{a,b,c,t:t/3});edges.push(a,b,Math.hypot(rest[a*3]-rest[b*3],rest[a*3+1]-rest[b*3+1],rest[a*3+2]-rest[b*3+2]));}
   }
  }
  const avg=this.mass.reduce((a,b)=>a+b,0)/this.count;this.invMass=new Float32Array(this.mass.map(m=>avg/m));
  this.edges=new Float32Array(edges);this.hinges=new Uint16Array(hinges);this.angles=new Float32Array(hinges.length/5);this.elasticAngles=new Float32Array(this.angles.length);this.bendLambda=new Float32Array(this.angles.length);
  this.grad=new Float64Array(12);for(let h=0;h<this.angles.length;h++)this.angles[h]=this.hingeGeometry(h);this.elasticAngles.set(this.angles);
  this.normals=new Float32Array(this.count*3*5);this.flat=new Float32Array(tri.length);this.data=new Float32Array(tri.length*8);
  this.contacts=new Float32Array(this.count);this.accumulator=0;this.control=null;this.sleeping=false;this.quiet=0;this.motion=true;this.impacts=0;this.soundEnergy=0;this.frame=0;
  this.initialArea=this.area0.reduce((a,b)=>a+b,0);this.collision=new PaperContact(this);this.rebuild();
  this.tearingEnabled=allowTear;this.tearEnergy=0;this.fries=new Fries();
  if(allowTear)this.initTearing();
 }
 // A tear cuts the shared material edges. Connected corner fans are then
 // split into independent particles; no triangles or paper area are deleted.
 initTearing(){
  this.materialCount=this.count;this.materialTri=new Uint16Array(this.tri);
  this.materialRest=new Float32Array(this.rest);this.origin=Uint16Array.from({length:this.count},(_,i)=>i);this.broken=new Set();this.pieces=null;this.pieceIds=null;
  const map=new Map();this.materialEdges=[];
  for(let k=0;k<this.materialTri.length;k+=3)for(let j=0;j<3;j++){
   const ca=k+j,cb=k+(j+1)%3,a=this.materialTri[ca],b=this.materialTri[cb],key=this.materialKey(a,b),old=map.get(key);
   if(old){old.fb=k/3;old.links=[[old.ca,this.materialTri[ca]===old.a?ca:cb],[old.cb,this.materialTri[cb]===old.b?cb:ca]];}
   else{const edge={a,b,key,fa:k/3,fb:-1,ca,cb,links:null,length:Math.hypot(this.rest[a*3]-this.rest[b*3],this.rest[a*3+1]-this.rest[b*3+1],this.rest[a*3+2]-this.rest[b*3+2])};map.set(key,edge);this.materialEdges.push(edge);}
  }
  this.pristine=this.snapshot();
 }
 materialKey(a,b){return Math.min(a,b)*this.materialCount+Math.max(a,b);}
 refreshTopology(memory=null){
  const tr=this.tri,rest=this.rest,map=new Map(),edges=[],hinges=[];this.area0=new Float32Array(tr.length/3);this.mass=new Float32Array(this.count);
  for(let k=0;k<tr.length;k+=3){
   const area=this.triangleArea(tr[k],tr[k+1],tr[k+2],rest);this.area0[k/3]=area;
   for(let j=0;j<3;j++)this.mass[tr[k+j]]+=area/3;
   for(let j=0;j<3;j++){
    const a=tr[k+j],b=tr[k+(j+1)%3],c=tr[k+(j+2)%3],key=Math.min(a,b)*this.count+Math.max(a,b),old=map.get(key);
    if(old){if(!this.broken.has(this.materialKey(this.origin[a],this.origin[b])))hinges.push(old.a,old.b,old.c,c,this.faces[old.t]===4||this.faces[k/3]===4?1:0);}
    else{map.set(key,{a,b,c,t:k/3});edges.push(a,b,Math.hypot(rest[a*3]-rest[b*3],rest[a*3+1]-rest[b*3+1],rest[a*3+2]-rest[b*3+2]));}
   }
  }
  const avg=this.mass.reduce((a,b)=>a+b,0)/this.count;this.invMass=Float32Array.from(this.mass,m=>avg/Math.max(m,1e-10));
  this.edges=new Float32Array(edges);this.hinges=new Uint16Array(hinges);this.angles=new Float32Array(hinges.length/5);this.bendLambda=new Float32Array(this.angles.length);
  for(let h=0;h<this.angles.length;h++){const a=hinges[h*5],b=hinges[h*5+1],key=this.materialKey(this.origin[a],this.origin[b]);this.angles[h]=memory?.get(key)??this.hingeGeometry(h);}
  this.elasticAngles=new Float32Array(this.angles);this.normals=new Float32Array(this.count*15);this.contacts=new Float32Array(this.count);this.goal=this.pos;
  const parent=Int32Array.from({length:this.count},(_,i)=>i),find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
  for(let k=0;k<edges.length;k+=3){const a=find(edges[k]),b=find(edges[k+1]);if(a!==b)parent[b]=a;}
  const groups=new Map();this.pieceIds=new Int32Array(this.count);
  for(let i=0;i<this.count;i++){const root=find(i);if(!groups.has(root))groups.set(root,[]);groups.get(root).push(i);}
  this.pieces=[...groups.values()];this.pieces.forEach((ids,k)=>{for(const id of ids)this.pieceIds[id]=k;});
  if(!this.renderOnly)this.collision=new PaperContact(this);this.topologyRevision=(this.topologyRevision||0)+1;this.wake();
 }
 cutEdges(keys,axis=[1,0,0],faceSides=null){
  if(!this.tearingEnabled)return 0;const fresh=keys.filter(key=>!this.broken.has(key));if(!fresh.length)return 0;
  const memory=new Map();for(let h=0;h<this.angles.length;h++)memory.set(this.materialKey(this.origin[this.hinges[h*5]],this.origin[this.hinges[h*5+1]]),this.angles[h]);
  fresh.forEach(key=>this.broken.add(key));
  const tr=this.tri,parent=Int32Array.from({length:tr.length},(_,i)=>i),find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
  for(const edge of this.materialEdges)if(edge.links&&!this.broken.has(edge.key))for(const [a,b] of edge.links){const ra=find(a),rb=find(b);if(ra!==rb)parent[rb]=ra;}
  const fans=new Map();for(let k=0;k<tr.length;k++){const old=tr[k],root=find(k);if(!fans.has(old))fans.set(old,new Map());const groups=fans.get(old);if(!groups.has(root))groups.set(root,[]);groups.get(root).push(k);}
  const oldTri=new Uint16Array(tr),pos=[...this.pos],prev=[...this.pos],velocity=[...this.velocity],rest=[...this.rest],uv=[...this.uv],wall=[...this.wall],origin=[...this.origin];
  for(const [old,groups] of fans){
   let index=0;const base=Array.from(this.pos.slice(old*3,old*3+3));
   for(const corners of groups.values()){
    const id=index++===0?old:origin.length;
    if(id!==old){for(let j=0;j<3;j++){pos.push(base[j]);prev.push(base[j]);velocity.push(this.velocity[old*3+j]);rest.push(this.rest[old*3+j]);}uv.push(this.uv[old*2],this.uv[old*2+1]);wall.push(this.wall[old]);origin.push(this.origin[old]);}
    if(groups.size>1){
     let side=0;for(const corner of corners){const t=Math.floor(corner/3);if(faceSides)side+=faceSides[t]?1:-1;else for(let j=0;j<3;j++)side+=(this.pos[oldTri[t*3+j]*3]-base[0])*axis[0]+(this.pos[oldTri[t*3+j]*3+1]-base[1])*axis[1]+(this.pos[oldTri[t*3+j]*3+2]-base[2])*axis[2];}
     side=side<0?-1:1;for(let j=0;j<3;j++)pos[id*3+j]=prev[id*3+j]=base[j]+axis[j]*side*.005;
    }
    for(const corner of corners)tr[corner]=id;
   }
  }
  this.pos=new Float32Array(pos);this.prev=new Float32Array(prev);this.velocity=new Float32Array(velocity);this.rest=new Float32Array(rest);this.uv=new Float32Array(uv);this.wall=new Uint8Array(wall);this.origin=new Uint16Array(origin);this.count=origin.length;
  this.refreshTopology(memory);
  const toi=this.collision.build(true);if(toi<1){const fraction=Math.max(0,toi-.002);for(let a=0;a<this.pos.length;a++)this.pos[a]=this.prev[a]+(this.pos[a]-this.prev[a])*fraction;}
  this.tearEnergy+=fresh.length;return fresh.length;
 }
 materialPoint(hit){const out=[0,0,0];for(let j=0;j<3;j++){const a=this.materialTri[hit.triangle*3+j]*3;for(let k=0;k<3;k++)out[k]+=this.materialRest[a+k]*hit.weights[j];}return out;}
 tearPlan(left,right){
  const A=this.materialPoint(left),B=this.materialPoint(right),axis=V.norm(V.sub(B,A)),mid=V.mul(V.add(A,B),.5),tr=this.materialTri,p=this.materialRest,sides=new Uint8Array(tr.length/3);
  if(V.len(V.sub(A,B))<.12)return{order:[],sides};
  let centerA=0,centerB=0;for(let k=0;k<3;k++)for(let d=0;d<3;d++){centerA+=p[tr[left.triangle*3+k]*3+d]*axis[d]/3;centerB+=p[tr[right.triangle*3+k]*3+d]*axis[d]/3;}const plane=(centerA+centerB)/2;
  for(let k=0;k<tr.length;k+=3){let dot=0;for(let j=0;j<3;j++)for(let d=0;d<3;d++)dot+=p[tr[k+j]*3+d]*axis[d]/3;sides[k/3]=dot>plane?1:0;}
  const piece=this.pieceIds?.[this.tri[left.triangle*3]],other=this.pieceIds?.[this.tri[right.triangle*3]];if(piece!==other)return{order:[],sides};
  const edges=this.materialEdges.filter(e=>e.fb>=0&&!this.broken.has(e.key)&&sides[e.fa]!==sides[e.fb]&&(!this.pieceIds||(this.pieceIds[this.tri[e.fa*3]]===piece&&this.pieceIds[this.tri[e.fb*3]]===piece)));
  if(!edges.length)return{order:[],sides};
  let nearest=0,best=Infinity;const incident=new Map();
  edges.forEach((e,k)=>{let d=0;for(let j=0;j<3;j++)d+=((p[e.a*3+j]+p[e.b*3+j])*.5-mid[j])**2;if(d<best){best=d;nearest=k;}for(const v of [e.a,e.b]){if(!incident.has(v))incident.set(v,[]);incident.get(v).push(k);}});
  const queue=[nearest],seen=new Set(queue),order=[];for(let k=0;k<queue.length;k++){const e=edges[queue[k]];order.push(e);for(const v of [e.a,e.b])for(const next of incident.get(v))if(!seen.has(next)){seen.add(next);queue.push(next);}}
  return{order,sides};
 }
 beginTear(left,right,snapshot){
  if(!this.tearingEnabled)return null;const plan=this.tearPlan(left,right),anchors=[left,right].map(hit=>({hit,triangle:hit.triangle,weights:[...hit.weights],target:[...hit.p],current:[...hit.p]}));
  const g={kind:'tear',snapshot,anchors,plan,index:0,cutLength:0,startDistance:V.len(V.sub(right.p,left.p)),hit:left};this.control=g;this.wake();return g;
 }
 moveTear(g,index,target){g.anchors[index].target=[...target];this.control=g;this.wake();}
 advanceTear(g,dt=null){
  if(dt!==null){g.cutClock=(g.cutClock||0)+dt;if(g.cutClock<.075)return;}
  const axis=V.sub(g.anchors[1].current,g.anchors[0].current),extension=Math.min(V.len(axis)-g.startDistance,g.inputOpening??Infinity),opening=Math.max(0,extension-(MOBILE?.07:.11)),budget=opening*6,keys=[];let length=g.cutLength,index=g.index;
  while(index<g.plan.order.length&&keys.length<12){const e=g.plan.order[index];if(length+e.length>budget)break;keys.push(e.key);length+=e.length;index++;}
  if(keys.length<(MOBILE?2:3)&&index<g.plan.order.length)return;
  if(keys.length){this.cutEdges(keys,V.norm(axis),g.plan.sides);g.index=index;g.cutLength=length;g.cutClock=0;}
 }
 projectTear(g,dt=1/120){
  for(const anchor of g.anchors){const ids=[this.tri[anchor.triangle*3],this.tri[anchor.triangle*3+1],this.tri[anchor.triangle*3+2]],w=anchor.weights,actual=[0,0,0];let denom=0;
   for(let j=0;j<3;j++){denom+=w[j]*w[j]*this.invMass[ids[j]];for(let d=0;d<3;d++)actual[d]+=this.pos[ids[j]*3+d]*w[j];}
   const delta=V.sub(anchor.current,actual),len=V.len(delta),limit=len>.09?.09/len:1;
   for(let j=0;j<3;j++){const f=w[j]*this.invMass[ids[j]]/Math.max(denom,1e-9)*(1-Math.pow(.8,dt*120))*limit;for(let d=0;d<3;d++)this.pos[ids[j]*3+d]+=delta[d]*f;}
  }
 }
 triangleArea(a,b,c,p=this.pos){a*=3;b*=3;c*=3;const x=p[b]-p[a],y=p[b+1]-p[a+1],z=p[b+2]-p[a+2],u=p[c]-p[a],v=p[c+1]-p[a+1],w=p[c+2]-p[a+2];return Math.hypot(y*w-z*v,z*u-x*w,x*v-y*u)*.5;}
 hingeGeometry(h){
  const H=this.hinges,p=this.pos,k=h*5,a=H[k]*3,b=H[k+1]*3,c=H[k+2]*3,d=H[k+3]*3;
  const ex=p[b]-p[a],ey=p[b+1]-p[a+1],ez=p[b+2]-p[a+2],l2=ex*ex+ey*ey+ez*ez,l=Math.sqrt(l2);if(l<1e-8){this.grad.fill(0);return 0;}
  const cx=p[c]-p[a],cy=p[c+1]-p[a+1],cz=p[c+2]-p[a+2],dx=p[d]-p[a],dy=p[d+1]-p[a+1],dz=p[d+2]-p[a+2];
  const ux=ey*cz-ez*cy,uy=ez*cx-ex*cz,uz=ex*cy-ey*cx,vx=dy*ez-dz*ey,vy=dz*ex-dx*ez,vz=dx*ey-dy*ex;
  const un=ux*ux+uy*uy+uz*uz,vn=vx*vx+vy*vy+vz*vz;if(un<1e-14||vn<1e-14){this.grad.fill(0);return 0;}
  const s=(cx*ex+cy*ey+cz*ez)/l2,t=(dx*ex+dy*ey+dz*ez)/l2,q=this.grad;
  q[6]=-l*ux/un;q[7]=-l*uy/un;q[8]=-l*uz/un;q[9]=-l*vx/vn;q[10]=-l*vy/vn;q[11]=-l*vz/vn;
  for(let j=0;j<3;j++){q[j]=-(1-s)*q[6+j]-(1-t)*q[9+j];q[3+j]=-s*q[6+j]-t*q[9+j];}
  return Math.atan2(((uy*vz-uz*vy)*ex+(uz*vx-ux*vz)*ey+(ux*vy-uy*vx)*ez)/l,ux*vx+uy*vy+uz*vz);
 }
 projectEdges(reverse=false){
  const p=this.pos,e=this.edges,w=this.invMass;
  for(let k=reverse?e.length-3:0;reverse?k>=0:k<e.length;k+=reverse?-3:3){
   const ia=e[k],ib=e[k+1],a=ia*3,b=ib*3,dx=p[b]-p[a],dy=p[b+1]-p[a+1],dz=p[b+2]-p[a+2],len=Math.sqrt(dx*dx+dy*dy+dz*dz);if(len<1e-9)continue;
   const f=(len-e[k+2])/len/(w[ia]+w[ib]),fa=f*w[ia],fb=f*w[ib];
   p[a]+=dx*fa;p[a+1]+=dy*fa;p[a+2]+=dz*fa;p[b]-=dx*fb;p[b+1]-=dy*fb;p[b+2]-=dz*fb;
  }
 }
 projectAreas(){
  const p=this.pos,w=this.invMass,tr=this.tri;
  for(let t=0;t<tr.length;t+=3){
   const ia=tr[t],ib=tr[t+1],ic=tr[t+2],a=ia*3,b=ib*3,c=ic*3,x=p[b]-p[a],y=p[b+1]-p[a+1],z=p[b+2]-p[a+2],u=p[c]-p[a],v=p[c+1]-p[a+1],s=p[c+2]-p[a+2];
   let nx=y*s-z*v,ny=z*u-x*s,nz=x*v-y*u,l=Math.sqrt(nx*nx+ny*ny+nz*nz);if(l<1e-10)continue;nx/=l;ny/=l;nz/=l;
   const bx=(v*nz-s*ny)*.5,by=(s*nx-u*nz)*.5,bz=(u*ny-v*nx)*.5,cx=(ny*z-nz*y)*.5,cy=(nz*x-nx*z)*.5,cz=(nx*y-ny*x)*.5,ax=-bx-cx,ay=-by-cy,az=-bz-cz;
   const denom=w[ia]*(ax*ax+ay*ay+az*az)+w[ib]*(bx*bx+by*by+bz*bz)+w[ic]*(cx*cx+cy*cy+cz*cz);if(denom<1e-12)continue;
   const f=-(l*.5-this.area0[t/3])/denom;
   p[a]+=w[ia]*f*ax;p[a+1]+=w[ia]*f*ay;p[a+2]+=w[ia]*f*az;p[b]+=w[ib]*f*bx;p[b+1]+=w[ib]*f*by;p[b+2]+=w[ib]*f*bz;p[c]+=w[ic]*f*cx;p[c+1]+=w[ic]*f*cy;p[c+2]+=w[ic]*f*cz;
  }
 }
 projectBends(dt){
  const p=this.pos,H=this.hinges,w=this.invMass,g=this.grad,active=this.control,soft=active&&(active.kind==='press'||active.kind==='pull'||active.kind==='smear');
  for(let h=0;h<this.angles.length;h++){
   const angle=this.hingeGeometry(h),C=wrapAngle(angle-this.angles[h]),k=h*5;
   const compliance=(soft&&active.softHinges[h]?.12:.000008)*(H[k+4]?.20:1),alpha=compliance/(dt*dt);
   let denom=alpha;for(let j=0;j<4;j++){const id=H[k+j];denom+=w[id]*(g[j*3]**2+g[j*3+1]**2+g[j*3+2]**2);}
   if(denom<1e-8)continue;const dl=clamp((-C-alpha*this.bendLambda[h])/denom,-.035,.035);this.bendLambda[h]+=dl;
   for(let j=0;j<4;j++){const id=H[k+j],a=id*3,f=w[id]*dl;p[a]+=f*g[j*3];p[a+1]+=f*g[j*3+1];p[a+2]+=f*g[j*3+2];}
  }
 }
 projectHand(dt){
  const g=this.control;if(!g)return;const p=this.pos,w=this.invMass;
  if(g.kind==='tear'){this.projectTear(g,dt);return;}
  // A compliant, speed-limited hand gives way before the paper can stretch.
  for(const m of g.hand){
   const a=m.i*3,pressing=g.kind==='press'||g.kind==='smear',profile=pressing?m.weight:1;
   const offset=pressing?V.add(V.mul(g.n,-g.currentDepth*profile),g.currentDelta):g.currentDelta;
   const tx=m.start[0]+offset[0],ty=m.start[1]+offset[1],tz=m.start[2]+offset[2],strength=1-Math.pow(1-(g.kind==='grab'?.115:.055)*m.weight,dt*120);
   p[a]+=(tx-p[a])*strength;p[a+1]+=(ty-p[a+1])*strength;p[a+2]+=(tz-p[a+2])*strength;
  }
 }
 ground(){const p=this.pos;for(let i=0;i<this.count;i++){const a=i*3;if(p[a+1]<FLOOR){this.contacts[i]+=FLOOR-p[a+1];p[a+1]=FLOOR;}}}
 selfContact(){this.collision.build();this.collision.solve();}
 dampInternal(dt){
  if(this.pieces?.length>1){let energy=0;for(const ids of this.pieces)energy+=this.dampPiece(dt,ids);return Math.sqrt(energy/this.count);}
  const p=this.pos,v=this.velocity,m=this.mass,c=this.center(),mean=[0,0,0];let total=0;
  for(let i=0;i<this.count;i++){total+=m[i];for(let j=0;j<3;j++)mean[j]+=m[i]*v[i*3+j];}for(let j=0;j<3;j++)mean[j]/=total;
  let xx=0,yy=0,zz=0,xy=0,xz=0,yz=0,lx=0,ly=0,lz=0;
  for(let i=0;i<this.count;i++){
   const a=i*3,x=p[a]-c[0],y=p[a+1]-c[1],z=p[a+2]-c[2],vx=v[a]-mean[0],vy=v[a+1]-mean[1],vz=v[a+2]-mean[2],w=m[i];
   xx+=w*(y*y+z*z);yy+=w*(x*x+z*z);zz+=w*(x*x+y*y);xy-=w*x*y;xz-=w*x*z;yz-=w*y*z;lx+=w*(y*vz-z*vy);ly+=w*(z*vx-x*vz);lz+=w*(x*vy-y*vx);
  }
  const A=yy*zz-yz*yz,B=xz*yz-xy*zz,C=xy*yz-xz*yy,D=xx*zz-xz*xz,E=xy*xz-xx*yz,F=xx*yy-xy*xy,det=xx*A+xy*B+xz*C;
  const wx=det>1e-12?(A*lx+B*ly+C*lz)/det:0,wy=det>1e-12?(B*lx+D*ly+E*lz)/det:0,wz=det>1e-12?(C*lx+E*ly+F*lz)/det:0;
  const internal=Math.exp(-dt*95),linear=Math.exp(-dt*.75),angular=Math.exp(-dt*1.8);let speed=0;
  for(let i=0;i<this.count;i++){
   const a=i*3,x=p[a]-c[0],y=p[a+1]-c[1],z=p[a+2]-c[2],rot=[wy*z-wz*y,wz*x-wx*z,wx*y-wy*x];
   for(let j=0;j<3;j++){v[a+j]=mean[j]*linear+rot[j]*angular+(v[a+j]-mean[j]-rot[j])*internal;speed+=v[a+j]*v[a+j];}
  }return Math.sqrt(speed/this.count);
 }
 dampPiece(dt,ids){
  const p=this.pos,v=this.velocity,m=this.mass,c=[0,0,0],mean=[0,0,0];let total=0;
  for(const i of ids){total+=m[i];for(let j=0;j<3;j++){c[j]+=m[i]*p[i*3+j];mean[j]+=m[i]*v[i*3+j];}}for(let j=0;j<3;j++){c[j]/=total;mean[j]/=total;}
  let xx=0,yy=0,zz=0,xy=0,xz=0,yz=0,lx=0,ly=0,lz=0;
  for(const i of ids){const a=i*3,x=p[a]-c[0],y=p[a+1]-c[1],z=p[a+2]-c[2],vx=v[a]-mean[0],vy=v[a+1]-mean[1],vz=v[a+2]-mean[2],w=m[i];xx+=w*(y*y+z*z);yy+=w*(x*x+z*z);zz+=w*(x*x+y*y);xy-=w*x*y;xz-=w*x*z;yz-=w*y*z;lx+=w*(y*vz-z*vy);ly+=w*(z*vx-x*vz);lz+=w*(x*vy-y*vx);}
  const A=yy*zz-yz*yz,B=xz*yz-xy*zz,C=xy*yz-xz*yy,D=xx*zz-xz*xz,E=xy*xz-xx*yz,F=xx*yy-xy*xy,det=xx*A+xy*B+xz*C;
  const wx=det>1e-12?(A*lx+B*ly+C*lz)/det:0,wy=det>1e-12?(B*lx+D*ly+E*lz)/det:0,wz=det>1e-12?(C*lx+E*ly+F*lz)/det:0;
  const internal=Math.exp(-dt*95),linear=Math.exp(-dt*.75),angular=Math.exp(-dt*1.8);let energy=0;
  for(const i of ids){const a=i*3,x=p[a]-c[0],y=p[a+1]-c[1],z=p[a+2]-c[2],rot=[wy*z-wz*y,wz*x-wx*z,wx*y-wy*x];for(let j=0;j<3;j++){v[a+j]=mean[j]*linear+rot[j]*angular+(v[a+j]-mean[j]-rot[j])*internal;energy+=v[a+j]*v[a+j];}}return energy;
 }
 plasticity(dt=1/120){
  const g=this.control;if(!g||g.kind==='grab'||g.kind==='tear')return;let energy=0;
  for(let h=0;h<this.angles.length;h++){
   const k=h*5,a=this.hinges[k]*3,b=this.hinges[k+1]*3;
   const dx=(this.pos[a]+this.pos[b])*.5-g.hit.p[0],dy=(this.pos[a+1]+this.pos[b+1])*.5-g.hit.p[1],dz=(this.pos[a+2]+this.pos[b+2])*.5-g.hit.p[2];
   if(dx*dx+dy*dy+dz*dz>1.15*1.15)continue;
   if(!g.softHinges[h])continue;
   const angle=this.hingeGeometry(h),d=wrapAngle(angle-this.angles[h]),yieldAngle=this.hinges[k+4]?.16:.045;
   if(Math.abs(d)>yieldAngle){const change=(Math.abs(d)-yieldAngle)*Math.sign(d)*(1-Math.pow(.35,dt*120));this.angles[h]=wrapAngle(this.angles[h]+change);energy+=Math.abs(change);}
  }
  this.soundEnergy+=energy;
 }
 step(dt){
  if(this.control?.kind==='tear'){
   const g=this.control;for(const a of g.anchors){const d=V.sub(a.target,a.current),l=V.len(d),s=l?Math.min(1,dt*3/l):0;for(let j=0;j<3;j++)a.current[j]+=d[j]*s;}this.advanceTear(g,dt);
  }
  const p=this.pos,v=this.velocity,prev=this.prev;prev.set(p);this.contacts.fill(0);this.bendLambda.fill(0);
  if(this.control&&this.control.kind!=='tear'){const g=this.control;g.currentDepth+=clamp(g.depth-g.currentDepth,-dt*2,dt*2);const d=V.sub(g.delta,g.currentDelta),l=V.len(d),s=l>0?Math.min(1,dt*3/l):0;for(let j=0;j<3;j++)g.currentDelta[j]+=d[j]*s;}
  for(let a=0;a<p.length;a+=3){v[a+1]-=9.81*dt;for(let j=0;j<3;j++)p[a+j]+=clamp(v[a+j],-10,10)*dt;}
  for(let iter=0;iter<QUALITY.iterations;iter++){
   this.projectHand(dt);if(iter%3===0)this.projectBends(dt);this.projectEdges(iter%2===1);if(iter%3===2)this.projectAreas();this.ground();
  }
  this.collision.build();
  for(let iter=0;iter<QUALITY.contacts;iter++){this.projectEdges(iter%2===1);if(iter%2)this.projectAreas();this.collision.solve();this.ground();}
  this.collision.solve();this.ground();
  let contact=0;
  for(let i=0;i<this.count;i++){
   const a=i*3;if(this.contacts[i]>0||p[a+1]<FLOOR+.0003){
    const dx=p[a]-prev[a],dz=p[a+2]-prev[a+2],len=Math.hypot(dx,dz),cut=Math.min(len,this.contacts[i]*.95+dt*dt*3);
    if(len>1e-10){p[a]-=dx/len*cut;p[a+2]-=dz/len*cut;}contact++;
    if(v[a+1]<-1.2)this.impacts=Math.max(this.impacts,-v[a+1]);
   }
  }
  // Friction also moves the sheet, so continuous collision validation must
  // follow it as well as the floor, material and contact projections.
  let toi=this.collision.build(true);
  // New contacts can appear during metric/floor projections. Resolve those
  // locally before resorting to shortening the whole step.
  for(let pass=0;toi<1&&pass<4;pass++){
   this.collision.build();
   for(let iter=0;iter<6;iter++){this.projectEdges(iter%2===1);if(iter%2)this.projectAreas();this.ground();this.collision.solve();this.ground();}
   toi=this.collision.build(true);
  }
  for(let pass=0;toi<1&&pass<8;pass++){this.collision.clipMotion();toi=this.collision.build(true);}
  if(toi<1){const fraction=Math.max(0,toi-.002);for(let a=0;a<p.length;a++)p[a]=prev[a]+(p[a]-prev[a])*fraction;}
  if(this.control)this.plasticity(dt);
  for(let a=0;a<p.length;a++)v[a]=(p[a]-prev[a])/dt;
  const rms=this.dampInternal(dt),supported=!this.pieces||this.pieces.every(ids=>ids.some(i=>p[i*3+1]<FLOOR+.001));this.quiet=!this.control&&supported&&contact>4&&rms<.030?this.quiet+dt:0;
  if(this.quiet>.35){this.sleeping=true;v.fill(0);}this.fries.step(dt,this);this.frame++;
  if(this.control?.pulseTime){this.control.pulseTime-=dt;if(this.control.pulseTime<=0)this.release();}
 }
 settle(dt){
  if(this.sleeping&&!this.control&&this.fries.sleeping){this.accumulator=0;return false;}
  // The dense desktop mesh needs a fixed 120 Hz solve to stay upright and
  // reach sleep. Retain fractional time, but never catch up more than 50 ms.
  // Keep the lighter mobile solver's existing budget of at most three steps.
  const span=clamp(Number.isFinite(dt)?dt:1/60,0,.05);if(!span)return false;
  let steps=Math.max(2,Math.ceil(span/(1/60))),h=span/steps;
  if(!MOBILE){
   h=1/120;this.accumulator+=span;steps=Math.min(6,Math.floor((this.accumulator+1e-12)/h));
   this.accumulator=Math.max(0,this.accumulator-steps*h);if(!steps)return false;
  }
  for(let i=0;i<steps;i++){if(this.sleeping&&!this.control){this.prev.set(this.pos);this.fries.step(h,this);}else this.step(h);}
  this.simulatedTime=(this.simulatedTime||0)+steps*h;this.rebuild();return true;
 }
 wake(){this.sleeping=false;this.quiet=0;this.motion=true;}
 snapshot(){const s={p:new Float32Array(this.pos),angles:new Float32Array(this.angles),fries:this.fries.snapshot()};if(this.tearingEnabled)s.topology={rest:new Float32Array(this.rest),tri:new Uint16Array(this.tri),uv:new Float32Array(this.uv),wall:new Uint8Array(this.wall),origin:new Uint16Array(this.origin),broken:[...this.broken]};return s;}
 restore(s){
  if(s.topology){const t=s.topology;this.count=s.p.length/3;this.pos=new Float32Array(s.p);this.prev=new Float32Array(s.p);this.velocity=new Float32Array(s.p.length);this.rest=new Float32Array(t.rest);this.tri=new Uint16Array(t.tri);this.uv=new Float32Array(t.uv);this.wall=new Uint8Array(t.wall);this.origin=new Uint16Array(t.origin);this.broken=new Set(t.broken);this.refreshTopology();}
  else{this.pos.set(s.p);this.prev.set(s.p);this.velocity.fill(0);}
  this.angles.set(s.angles);if(s.fries)this.fries.restore(s.fries);this.control=null;this.accumulator=0;this.tearEnergy=0;this.wake();this.rebuild();
 }
 resetShape(){this.restore(this.tearingEnabled?this.pristine:{p:this.rest,angles:this.elasticAngles,fries:this.fries.initial});}
 gesture(hit,snapshot){
  const hand=[],radius=.34;let nearest=-1,best=Infinity;
  for(let i=0;i<this.count;i++){
   const a=i*3,d=Math.hypot(this.pos[a]-hit.p[0],this.pos[a+1]-hit.p[1],this.pos[a+2]-hit.p[2]);if(d<best){best=d;nearest=i;}
   if(d<radius&&this.wall[i]===hit.face)hand.push({i,start:[...this.pos.slice(a,a+3)],weight:Math.max(.12,1-d/radius)});
  }
  if(!hand.length){const a=nearest*3;hand.push({i:nearest,start:[...this.pos.slice(a,a+3)],weight:1});}
  const softHinges=new Uint8Array(this.angles.length);
  for(let h=0;h<softHinges.length;h++){const a=this.hinges[h*5]*3,b=this.hinges[h*5+1]*3;softHinges[h]=Math.hypot((this.pos[a]+this.pos[b])*.5-hit.p[0],(this.pos[a+1]+this.pos[b+1])*.5-hit.p[1],(this.pos[a+2]+this.pos[b+2])*.5-hit.p[2])<1.02?1:0;}
  return{hit,n:hit.n,snapshot,hand,softHinges,seed:Math.random()*6.28,level:-1,depth:.08,currentDepth:0,kind:'press',delta:[0,0,0],currentDelta:[0,0,0],lastDelta:[0,0,0],soundTravel:0,soundAt:0};
 }
 press(g,elapsed){
  const thresholds=[0,120,290,500,800,1200,1740,2400];let level=0;while(level<7&&elapsed>=thresholds[level+1])level++;
  const snapped=level!==g.level;g.level=level;g.kind='press';g.depth=.10+.10*level;this.control=g;this.wake();return{snapped,depth:g.depth,radius:.34,level};
 }
 pull(g,delta){if(g.kind==='press'){for(const m of g.hand)m.start=[...this.pos.slice(m.i*3,m.i*3+3)];g.dragOrigin=[...delta];g.currentDelta=[0,0,0];}g.kind='pull';g.delta=g.dragOrigin?V.sub(delta,g.dragOrigin):delta;this.control=g;this.wake();}
 smear(g,delta){g.kind='smear';g.delta=delta;g.depth=.18;this.control=g;this.wake();}
 grab(g,delta){g.kind='grab';g.delta=delta;this.control=g;this.wake();}
 toss(impulse){
  if(!impulse||!Array.isArray(impulse.velocity)||!impulse.velocity.every(Number.isFinite))return;
  const t=impulse.triangle;if(!Number.isInteger(t)||t<0||t>=this.tri.length/3)return;
  let velocity=[...impulse.velocity],speed=V.len(velocity);if(speed<.15)return;if(speed>8)velocity=V.mul(velocity,8/speed);
  const piece=this.pieceIds?.[this.tri[t*3]],ids=this.pieces?this.pieces[piece]:Array.from({length:this.count},(_,i)=>i),center=[0,0,0],mean=[0,0,0],point=[0,0,0];let total=0,radius2=0;
  for(const i of ids){const mass=this.mass[i];total+=mass;for(let d=0;d<3;d++){center[d]+=this.pos[i*3+d]*mass;mean[d]+=this.velocity[i*3+d]*mass;}}
  for(let d=0;d<3;d++){center[d]/=total;mean[d]/=total;for(let j=0;j<3;j++)point[d]+=this.pos[this.tri[t*3+j]*3+d]*(impulse.weights?.[j]??1/3);}
  for(const i of ids)for(let d=0;d<3;d++)radius2+=(this.pos[i*3+d]-center[d])**2*this.mass[i]/total;
  let omega=V.mul(V.cross(V.sub(point,center),velocity),.85/Math.max(radius2,.06)),spin=V.len(omega);if(spin>5)omega=V.mul(omega,5/spin);
  for(const i of ids){const a=i*3,turn=V.cross(omega,V.sub([...this.pos.subarray(a,a+3)],center));for(let d=0;d<3;d++)this.velocity[a+d]=(this.velocity[a+d]-mean[d])*.25+velocity[d]*.9+mean[d]*.1+turn[d];}this.wake();
 }
 release(options=null){
  const g=this.control;
  // A paper crease retains the angle at release; it does not store a spring
  // pulling the pressed zone back towards the original flat sheet.
  if(g&&g.kind!=='grab'&&g.kind!=='tear')for(let h=0;h<this.angles.length;h++)if(g.softHinges[h])this.angles[h]=this.hingeGeometry(h);
  this.control=null;if(options?.toss)this.toss(options.toss);
  if(options?.poke){this.control=options.poke;this.control.kind='press';this.control.depth=.12;this.control.pulseTime=.08;}
  this.wake();
 }
 deformation(){let sum=0;for(let a=0;a<this.pos.length;a++)sum+=(this.pos[a]-this.rest[a])**2;return Math.sqrt(sum/this.count);}
 metrics(){let area=0,maxAreaError=0,maxStretch=0,sum=0;for(let t=0;t<this.tri.length;t+=3){const a=this.triangleArea(this.tri[t],this.tri[t+1],this.tri[t+2]);area+=a;maxAreaError=Math.max(maxAreaError,Math.abs(a/this.area0[t/3]-1));}for(let k=0;k<this.edges.length;k+=3){const a=this.edges[k]*3,b=this.edges[k+1]*3,s=Math.hypot(this.pos[a]-this.pos[b],this.pos[a+1]-this.pos[b+1],this.pos[a+2]-this.pos[b+2])/this.edges[k+2]-1;maxStretch=Math.max(maxStretch,Math.abs(s));sum+=s*s;}return{areaRatio:area/this.initialArea,maxAreaError,maxEdgeError:maxStretch,edgeRMS:Math.sqrt(sum/(this.edges.length/3)),sleeping:this.sleeping};}
 center(){const c=[0,0,0];let mass=0;for(let i=0;i<this.count;i++){mass+=this.mass[i];for(let j=0;j<3;j++)c[j]+=this.pos[i*3+j]*this.mass[i];}return c.map(x=>x/mass);}
 rebuild(){
  const p=this.pos,tri=this.tri,n=this.normals,flat=this.flat,data=this.data;n.fill(0);
  for(let t=0;t<tri.length;t+=3){
   const a=tri[t]*3,b=tri[t+1]*3,c=tri[t+2]*3;
   const ux=p[b]-p[a],uy=p[b+1]-p[a+1],uz=p[b+2]-p[a+2],vx=p[c]-p[a],vy=p[c+1]-p[a+1],vz=p[c+2]-p[a+2];
   let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,l=Math.hypot(nx,ny,nz)||1;
   const f=this.faces[t/3]*this.count*3;
   for(let k=0;k<3;k++){const o=f+tri[t+k]*3;n[o]+=nx;n[o+1]+=ny;n[o+2]+=nz;}
   flat[t]=nx/l;flat[t+1]=ny/l;flat[t+2]=nz/l;
  }
  for(let k=0;k<n.length;k+=3){const l=Math.hypot(n[k],n[k+1],n[k+2])||1;n[k]/=l;n[k+1]/=l;n[k+2]/=l;}
  for(let t=0;t<tri.length;t+=3){
   const f=this.faces[t/3]*this.count*3;const us=[this.uv[tri[t]*2],this.uv[tri[t+1]*2],this.uv[tri[t+2]*2]];const wrap=Math.max(...us)-Math.min(...us)>.5&&this.faces[t/3]!==4;
   for(let k=0;k<3;k++){
    const id=tri[t+k],o=id*3,d=(t+k)*8,a=f+o;
    data[d]=p[o];data[d+1]=p[o+1];data[d+2]=p[o+2];
    const dot=flat[t]*n[a]+flat[t+1]*n[a+1]+flat[t+2]*n[a+2];
    const s=dot<.78?.28:.84;
    data[d+3]=mix(flat[t],n[a],s);data[d+4]=mix(flat[t+1],n[a+1],s);data[d+5]=mix(flat[t+2],n[a+2],s);
    data[d+6]=us[k]+(wrap&&us[k]<.5?1:0);data[d+7]=this.uv[id*2+1];
   }
  }
 }
 raycast(ray){
  const p=this.pos,tri=this.tri,o=ray.o,d=ray.d;let near=1e6,hit=null;
  for(let t=0;t<tri.length;t+=3){
   const a=tri[t]*3,b=tri[t+1]*3,c=tri[t+2]*3;
   const e1x=p[b]-p[a],e1y=p[b+1]-p[a+1],e1z=p[b+2]-p[a+2],e2x=p[c]-p[a],e2y=p[c+1]-p[a+1],e2z=p[c+2]-p[a+2];
   const hx=d[1]*e2z-d[2]*e2y,hy=d[2]*e2x-d[0]*e2z,hz=d[0]*e2y-d[1]*e2x,det=e1x*hx+e1y*hy+e1z*hz;if(Math.abs(det)<1e-9)continue;
   const inv=1/det,sx=o[0]-p[a],sy=o[1]-p[a+1],sz=o[2]-p[a+2],u=inv*(sx*hx+sy*hy+sz*hz);if(u<0||u>1)continue;
   const qx=sy*e1z-sz*e1y,qy=sz*e1x-sx*e1z,qz=sx*e1y-sy*e1x,v=inv*(d[0]*qx+d[1]*qy+d[2]*qz);if(v<0||u+v>1)continue;
   const dist=inv*(e2x*qx+e2y*qy+e2z*qz);if(dist<=0||dist>=near)continue;near=dist;
   let n=V.norm([e1y*e2z-e1z*e2y,e1z*e2x-e1x*e2z,e1x*e2y-e1y*e2x]);if(V.dot(n,d)>0)n=V.mul(n,-1);
   const ids=[tri[t],tri[t+1],tri[t+2]],uvs=ids.map(i=>this.uv[i*2]),wrap=Math.max(...uvs)-Math.min(...uvs)>.5;
   const weights=[1-u-v,u,v];let arc=0,y=0;for(let k=0;k<3;k++){arc+=(uvs[k]+(wrap&&uvs[k]<.5?1:0))*weights[k];y+=this.uv[ids[k]*2+1]*weights[k];}
   hit={p:V.add(o,V.mul(d,dist)),n,arc:arc%1,y,face:this.faces[t/3],triangle:t/3,weights};
  }
  return hit;
 }

}(function physicsWorkerMain(){
 let body,epoch=0,revision=-1,controlId=0;
 function send(id,ms){
  const p=new Float32Array(body.pos),angles=new Float32Array(body.angles),fries=body.fries.snapshot(),transfer=[p.buffer,angles.buffer,fries.p.buffer,fries.v.buffer,fries.side.buffer,fries.rest.buffer,fries.mask.buffer,fries.clocks.buffer,fries.floor.buffer,fries.floorClocks.buffer];let topology=null;
  if((body.topologyRevision||0)!==revision&&body.tearingEnabled){topology={rest:new Float32Array(body.rest),tri:new Uint16Array(body.tri),uv:new Float32Array(body.uv),wall:new Uint8Array(body.wall),origin:new Uint16Array(body.origin),broken:[...body.broken]};for(const value of Object.values(topology))if(ArrayBuffer.isView(value))transfer.push(value.buffer);}
  revision=body.topologyRevision||0;
  self.postMessage({type:'state',id,epoch,revision,p,angles,fries,topology,sleeping:body.sleeping,simulatedTime:body.simulatedTime||0,ms,controlId,progress:body.control?.kind==='tear'?body.control.index:0,tearEnergy:body.tearEnergy,energy:body.soundEnergy,impacts:body.impacts},transfer);body.tearEnergy=0;body.soundEnergy=0;body.impacts=0;
 }
 self.onmessage=event=>{const message=event.data;try{
  if(message.type==='init'){body=new PaperBag(message.tear);body.rebuild=()=>{};epoch=message.epoch;send(0,0);return;}
  if(message.type!=='step'||!body)return;epoch=message.epoch;
  for(const command of message.commands){if(command.type==='restore')body.restore(command.snapshot);else if(command.type==='release')body.release(command.options);}
  const packet=message.control;
  if(packet){controlId=packet.id;if(packet.full){body.control=packet.full;body.wake();}else if(body.control){const g=body.control,u=packet.update;if(u.depth!==undefined)g.depth=u.depth;if(u.delta)g.delta=u.delta;if(u.targets){u.targets.forEach((p,k)=>g.anchors[k].target=p);g.inputOpening=u.inputOpening;}body.wake();}}
  const start=performance.now();body.settle(message.dt??1/60);send(message.id,performance.now()-start);
 }catch(error){self.postMessage({type:'error',message:error.message||String(error)});}};
})();
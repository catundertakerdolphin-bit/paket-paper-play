// Exact segment/triangle intersection audit, independent of contact distance.
module.exports=function audit(bag){
 const p=bag.pos,e=bag.edges,tri=bag.tri,solver=bag.collision;solver.refit();let count=0;
 for(let k=0;k<e.length;k+=3){
  const ia=e[k],ib=e[k+1],a=ia*3,b=ib*3,dx=p[b]-p[a],dy=p[b+1]-p[a+1],dz=p[b+2]-p[a+2];
  const candidates=solver.query(Math.min(p[a],p[b]),Math.min(p[a+1],p[b+1]),Math.min(p[a+2],p[b+2]),Math.max(p[a],p[b]),Math.max(p[a+1],p[b+1]),Math.max(p[a+2],p[b+2]));
  for(const t of candidates){
   const i=tri[t*3],j=tri[t*3+1],l=tri[t*3+2];if(i===ia||i===ib||j===ia||j===ib||l===ia||l===ib)continue;
   const c=i*3,d=j*3,f=l*3,ux=p[d]-p[c],uy=p[d+1]-p[c+1],uz=p[d+2]-p[c+2],vx=p[f]-p[c],vy=p[f+1]-p[c+1],vz=p[f+2]-p[c+2];
   const hx=dy*vz-dz*vy,hy=dz*vx-dx*vz,hz=dx*vy-dy*vx,det=ux*hx+uy*hy+uz*hz;if(Math.abs(det)<1e-11)continue;
   const sx=p[a]-p[c],sy=p[a+1]-p[c+1],sz=p[a+2]-p[c+2],u=(sx*hx+sy*hy+sz*hz)/det;if(u<1e-5||u>1-1e-5)continue;
   const qx=sy*uz-sz*uy,qy=sz*ux-sx*uz,qz=sx*uy-sy*ux,v=(dx*qx+dy*qy+dz*qz)/det;if(v<1e-5||u+v>1-1e-5)continue;
   const along=(vx*qx+vy*qy+vz*qz)/det;if(along>1e-5&&along<1-1e-5)count++;
  }
 }return count;
};

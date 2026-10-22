const fs=require('node:fs'),path=require('node:path');
module.exports=function load({mobile=false,file=path.join(__dirname,'../dist/index.html')}={}){
 const window={},code=fs.readFileSync(file,'utf8').match(/<script>([\s\S]*?)<\/script>/)[1].replace('setTimeout(init,20);','window.T={PaperBag,PaperContact,Fries,V,PhysicsRunner,physicsWorkerSource,BagChallenge,MOBILE,QUALITY,TEAR_MODE,Stage,shaders:[[VERT,PAPER_FRAG],[VERT,FLOOR_FRAG],[VERT,FRIES_FRAG],[VERT,FRIES_AO_FRAG],[DEPTH_VERT,DEPTH_FRAG]]};');
 new Function('window','document','setTimeout','clearTimeout','navigator','matchMedia','location','URLSearchParams',code)(window,{},()=>{},()=>{},mobile?{maxTouchPoints:5,userAgent:'iPhone'}:{maxTouchPoints:0,userAgent:'desktop'},()=>({matches:mobile}),{search:'?tear=1'},URLSearchParams);return window.T;
};

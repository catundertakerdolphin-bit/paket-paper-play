const fs=require('node:fs'),path=require('node:path');
module.exports=function setup({mobile=true}={}){
 const html=fs.readFileSync(path.join(__dirname,'../dist/index.html'),'utf8'),els=new Map(),win={};let now=0;
 const classes=()=>{const values=new Set();return{add:x=>values.add(x),remove:x=>values.delete(x),contains:x=>values.has(x),toggle(x,on){if(on??!values.has(x))values.add(x);else values.delete(x);}};};
 const el=id=>{if(!els.has(id))els.set(id,{open:false,hidden:true,textContent:'',children:id==='fry-progress'?Array.from({length:6},()=>({classList:classes()})):id==='tear-grips'?[{style:{}},{style:{}}]:[],style:{},classList:classes(),setPointerCapture(){},setAttribute(k,v){this[k]=v;}});return els.get(id);};
 const script=html.match(/<script>([\s\S]*?)<\/script>/)[1].replace('setTimeout(init,20);','window.T={PaperBag,BagChallenge,onDown,onMove,onUp,undo,redo,reset,remember,finish,paintChallenge,challenge,app,updateGesture,pullTo,pickPaper,MOBILE,HOLD_DELAY,wire(b,s){bag=b;stage=s;}};');
 new Function('window','document','setTimeout','clearTimeout','navigator','matchMedia','location','URLSearchParams','innerWidth','performance',script)(win,{getElementById:el},()=>{},()=>{},{maxTouchPoints:mobile?5:0,userAgent:mobile?'iPhone':'desktop'},()=>({matches:mobile}),{search:''},URLSearchParams,390,{now:()=>now});
 const T=win.T,b=new T.PaperBag(),stage={canvas:el('scene'),width:390,height:844,eye:[0,2,8],target:[0,1.5,0],zoomFactor:1,orbits:0,ray:(x,y)=>({o:[(x-195)/160,1.8+(422-y)/160,6],d:[0,0,-1]}),project:p=>[p[0]*160+195,422-(p[1]-1.8)*160,-p[2]],upload(){},cameraUpdate(){},orbit(){this.orbits++;}};T.wire(b,stage);
 const event=(type,{id=1,x=195,y=422,alt=false,shift=false,pointerType=mobile?'touch':'mouse'}={})=>({target:stage.canvas,type,pointerId:id,clientX:x,clientY:y,button:0,pointerType,altKey:alt,shiftKey:shift,preventDefault(){}});
 const forceTear=()=>{const g=T.app.gesture;for(const a of g.anchors)a.current=[...a.target];b.advanceTear(g);b.rebuild();};
 return{T,b,stage,el,html,event,forceTear,setTime:t=>{now=t;},tick:t=>{now=t;T.updateGesture(now);}};
};

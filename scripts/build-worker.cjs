// Keep the same-origin worker in sync with the self-contained physics source.
// A normal static asset also works when blob workers are blocked by CSP.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.join(__dirname,'..'),file=path.join(root,'dist/index.html');let html=fs.readFileSync(file,'utf8');const window={};
const code=html.match(/<script>([\s\S]*?)<\/script>/)[1].replace('setTimeout(init,20);','window.source=physicsWorkerSource();');
new Function('window','document','setTimeout','clearTimeout','navigator','matchMedia','location','URLSearchParams',code)(window,{},()=>{},()=>{},{maxTouchPoints:5,userAgent:'iPhone'},()=>({matches:true}),{search:'?tear=1'},URLSearchParams);
const hash=crypto.createHash('sha256').update(window.source).digest('hex').slice(0,12);fs.writeFileSync(path.join(root,'dist/physics-worker.js'),window.source);
html=html.replace(/const WORKER_FILE='[^']+';/,"const WORKER_FILE='physics-worker.js?v="+hash+"';");fs.writeFileSync(file,html);console.log('Mobile worker prepared:',hash);

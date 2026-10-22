const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),load=require('./runtime.cjs');
const desktop=load({mobile:false}),mobile=load({mobile:true});
const expected={nx:10,nz:6,ny:20,iterations:16,contacts:8,dpr:1.25,shadow:512,taps:4};
for(const [label,runtime] of [['desktop',desktop],['mobile',mobile]]){
 assert.deepEqual(runtime.QUALITY,expected,label+' must use the responsive lightweight profile');
 const bag=new runtime.PaperBag();assert.equal(bag.count,717);assert.equal(bag.tri.length/3,1400);
}
assert.equal(desktop.MOBILE,false,'Desktop mouse controls must remain desktop controls');
assert.equal(mobile.MOBILE,true,'Phone touch controls must remain touch controls');
assert.equal(desktop.physicsWorkerSource(),mobile.physicsWorkerSource(),'Both main-thread profiles must agree with the same worker physics');
assert.equal(fs.readFileSync(path.join(__dirname,'../dist/physics-worker.js'),'utf8'),desktop.physicsWorkerSource(),'The deployed worker must match the desktop and phone source');

// ui-runtime deliberately skips init(), and executing Stage requires WebGL.
// Execute init's actual worker-selection block with only its boundary mocked.
const html=fs.readFileSync(path.join(__dirname,'../dist/index.html'),'utf8');
const start=html.indexOf("stage=new Stage($('scene'),bag);"),end=html.indexOf('const canvas=stage.canvas;',start);
assert(start>=0&&end>start,'The startup worker block must be available for this regression');
const gate=html.slice(start+"stage=new Stage($('scene'),bag);".length,end);
const startWorker=new Function('MOBILE','Worker','PhysicsRunner','bag','let physicsRunner;'+gate+';return physicsRunner;');
for(const mobile of [false,true]){
 let constructed=0;const bag={};class Runner{constructor(body){assert.equal(body,bag);constructed++;}}
 assert(startWorker(mobile,function Worker(){},Runner,bag) instanceof Runner);
 assert.equal(constructed,1,'A supported browser must start one worker on either platform');
 assert.equal(startWorker(mobile,undefined,Runner,bag),undefined);
 assert.equal(constructed,1,'An unavailable Worker must retain synchronous fallback');
}
console.log('PROFILE CHECKS PASSED: shared lightweight topology and worker, desktop and touch controls, worker startup on both platforms');

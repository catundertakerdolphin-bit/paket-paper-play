const assert=require('node:assert/strict'),setup=require('./ui-runtime.cjs');
{
 const {T,b,event,setTime}=setup(),before=b.snapshot();T.onDown(event('pointerdown'));assert.equal(T.app.mode,'press');setTime(65);T.onUp(event('pointerup'));assert.equal(T.app.mode,'idle');assert(b.control?.pulseTime>0,'Even a tap released before the next frame must make a physical dent');
 for(let i=0;i<8;i++)b.settle(1/60);assert.equal(b.control,null,'A short poke releases itself');assert(b.pos.some((x,i)=>Math.abs(x-before.p[i])>.003));assert.equal(T.app.undo.length,1);T.undo();assert.deepEqual([...b.pos],[...before.p]);
}
{
 const {T,b,event,setTime,tick,el}=setup();T.onDown(event('pointerdown'));tick(260);assert(+el('hold-progress').style.strokeDashoffset<1);assert.equal(T.app.mode,'press');setTime(300);T.onMove(event('pointermove',{x:240,y:430}));assert.equal(T.app.mode,'smear');assert.equal(b.control.kind,'smear');assert(b.control.depth>0);assert(b.control.delta[0]>0);tick(1200);assert.equal(T.app.mode,'smear','A drag cannot unexpectedly turn into a long-press grab');T.onUp(event('pointerup',{x:240,y:430}));assert.equal(b.control,null);
}
{
 const {T,b,event,tick,setTime}=setup();T.onDown(event('pointerdown'));tick(539);assert.equal(T.app.mode,'press');const before=new Float32Array(b.pos);tick(540);assert.equal(T.app.mode,'grab');assert.deepEqual([...b.pos],[...before],'Activating a grip cannot teleport the paper');tick(560);setTime(580);T.onMove(event('pointermove',{y:340}));setTime(610);T.onMove(event('pointermove',{y:210}));setTime(620);T.onUp(event('pointerup',{y:180}));assert.equal(T.app.mode,'idle');let vy=0,mass=0;for(let i=0;i<b.count;i++){vy+=b.velocity[i*3+1]*b.mass[i];mass+=b.mass[i];}assert(vy/mass>4,'The release must carry the flick into the whole bag');assert.equal(T.app.undo.length,1);T.undo();assert(b.velocity.every(v=>v===0));
}
{
 const {T,b,event,tick,setTime}=setup();T.onDown(event('pointerdown'));tick(550);tick(900);setTime(1050);T.onUp(event('pointerup'));assert(b.velocity.every(v=>v===0),'A stationary hold and release must not invent a throw');
}
{
 const {T,b,event,setTime}=setup();T.onDown(event('pointerdown'));setTime(700);T.onMove(event('pointermove',{y:220}));assert.equal(T.app.mode,'grab');setTime(725);T.onUp(event('pointerup',{y:200}));assert(b.velocity.some((v,i)=>i%3===1&&v>4),'A hold followed by one fast move must still throw when no animation frame ran before the move');
}
{
 const {T,b,event,setTime}=setup(),before=b.snapshot();T.onDown(event('pointerdown'));setTime(80);T.onMove(event('pointermove',{x:240}));T.onUp(event('pointercancel',{x:240}));assert.deepEqual([...b.pos],[...before.p]);assert.equal(b.control,null);assert.equal(T.app.undo.length,0);
}
{
 const {T,event,tick}=setup();T.onDown(event('pointerdown',{x:-100}));tick(900);assert.equal(T.app.mode,'orbit');assert.equal(T.challenge.startedAt,null,'Camera-only gestures do not start the challenge');T.onUp(event('pointerup',{x:-100}));
}
{
 const {T,event}=setup();T.onDown(event('pointerdown'));T.reset();assert.equal(T.app.pointers.size,0,'Reset must clear held pointers');T.onDown(event('pointerdown',{id:2}));assert.equal(T.app.mode,'press','The next finger starts a fresh gesture instead of a phantom two-finger tear');T.onUp(event('pointercancel',{id:2}));
}
{
 const {T,b,event,html}=setup({mobile:false});T.onDown(event('pointerdown',{shift:true}));assert.equal(T.app.mode,'grab');T.onUp(event('pointercancel'));assert.equal(b.control,null);assert(html.includes('>Арсений Попов</a>'));assert(html.includes('href="https://t.me/votposmotrim"'));assert(!html.includes('id="touch-tools"'));assert(!html.includes('id="lift"'));
 const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]));for(const [,id] of html.matchAll(/\$\('([^']+)'\)/g))assert(ids.has(id),'A UI handler refers to a missing element: '+id);
}
console.log('CONTROLS CHECKS PASSED: instant poke, directional crumple, 540 ms hold ring, rebased grip, flick / stationary release, cancellation, camera and author credit');

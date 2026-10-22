const assert=require('node:assert/strict'),setup=require('./ui-runtime.cjs');
{
 const {T,b,event,stage,forceTear}=setup(),initial=b.snapshot();T.onDown(event('pointerdown',{x:145}));T.onDown(event('pointerdown',{id:2,x:245}));assert.equal(T.app.mode,'tear');
 T.onMove(event('pointermove',{x:175}));T.onMove(event('pointermove',{id:2,x:275}));forceTear();assert.equal(b.broken.size,0,'Parallel finger motion cannot tear');
 T.onMove(event('pointermove',{x:85}));T.onMove(event('pointermove',{id:2,x:305}));forceTear();assert(b.broken.size>0);assert.equal(stage.orbits,0);
 const g=T.app.gesture;T.onDown(event('pointerdown',{id:3}));T.onUp(event('pointerup',{id:3}));assert.equal(T.app.gesture,g,'A third finger must not interrupt a tear');T.onUp(event('pointerup',{id:2,x:305}));T.onUp(event('pointerup',{x:85}));assert.equal(T.app.undo.length,1,'Two-finger tearing is one undoable action');const torn=b.snapshot();T.undo();assert.deepEqual([...b.pos],[...initial.p]);T.redo();assert.deepEqual([...b.pos],[...torn.p]);T.reset();assert.equal(b.broken.size,0);assert.equal(T.challenge.startedAt,null);
}
{
 const {T,b,event,forceTear}=setup(),initial=b.snapshot();T.onDown(event('pointerdown',{x:192}));T.onDown(event('pointerdown',{id:2,x:202}));assert.equal(T.app.mode,'tear');assert.notEqual(b.control.anchors[0].triangle,b.control.anchors[1].triangle);T.onMove(event('pointermove',{x:145}));T.onMove(event('pointermove',{id:2,x:250}));forceTear();assert(b.broken.size>0);T.onUp(event('pointercancel',{id:2}));T.onUp(event('pointerup'));assert.deepEqual([...b.pos],[...initial.p]);
}
{
 const {T,event,stage}=setup();T.onDown(event('pointerdown',{x:-100}));T.onDown(event('pointerdown',{id:2,x:-50}));assert.equal(T.app.mode,'multi');T.onMove(event('pointermove',{id:2,x:-20,y:390}));assert(stage.orbits>0);assert.equal(T.challenge.startedAt,null);
}
{
 const {T,b,event,forceTear}=setup({mobile:false});T.onDown(event('pointerdown',{x:230,alt:true}));assert.equal(T.app.mode,'tear-ready');T.onMove(event('pointermove',{x:330,alt:true}));assert.equal(T.app.mode,'tear');forceTear();assert(b.broken.size>0);T.onUp(event('pointerup',{x:330,alt:true}));
}
for(const mobile of [true,false]){
 const {T,b}=setup({mobile}),limit=mobile?10:30;for(let i=0;i<45;i++){const before=b.snapshot();b.pos[0]+=.001;T.remember(before);assert(T.app.undo.length<=limit);}assert.equal(T.app.undo.length,limit);const end=new Float32Array(b.pos);for(let i=0;i<3;i++)T.undo();for(let i=0;i<3;i++)T.redo();assert.deepEqual([...b.pos],[...end]);
}
console.log('TEAR CONTROLS CHECKS PASSED: automatic two-finger tear, parallel / close / third-finger cases, one-step undo, cancellation, background camera, mouse Alt and bounded history');

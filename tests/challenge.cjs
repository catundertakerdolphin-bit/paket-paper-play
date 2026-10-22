const assert=require('node:assert/strict'),{BagChallenge}=require('./runtime.cjs')({mobile:true}),setup=require('./ui-runtime.cjs');
{
 const g=new BagChallenge();assert.equal(g.format(1000),'00:00.0');g.start(0);g.sync(1000,[1,0,1,0,0,0]);assert.equal(g.landed,2);assert(!g.won);g.pause(1500);g.resume(3500);assert.equal(g.elapsed(4000),2000);g.sync(5000,[1,1,1,1,1,1]);assert(g.won);assert.equal(g.elapsed(20000),3000,'The timer freezes only after six floor contacts');g.reopen(20000);g.sync(20100,[1,0,0,0,0,0]);assert(!g.won);assert.equal(g.elapsed(20100),3100);g.reset();assert.equal(g.startedAt,null);assert.equal(g.landed,0);
}
{
 const {T,b,el,setTime,html}=setup();T.paintChallenge();assert.equal(el('timer').textContent,'00:00.0');assert.equal(el('fry-progress').children.length,6);assert.equal((html.match(/<svg viewBox="0 0 12 30"/g)||[]).length,6);
 T.challenge.start(0);b.fries.floorMask.set([1,0,1,0,0,0]);setTime(1000);T.paintChallenge();assert.equal(el('timer').textContent,'00:01.0');assert(el('fry-progress').children[0].classList.contains('landed'));assert(!el('fry-progress').children[1].classList.contains('landed'));const before=b.snapshot();T.remember(before,true);
 b.fries.floorMask.fill(1);setTime(2350);T.paintChallenge();assert(T.challenge.won);assert.equal(el('timer').textContent,'00:02.3');setTime(9000);T.paintChallenge();assert.equal(el('timer').textContent,'00:02.3');T.undo();assert.equal(T.challenge.landed,2);assert(!T.challenge.won);assert.equal(el('timer').textContent,'00:02.3');T.reset();assert.equal(el('timer').textContent,'00:00.0');assert(!T.challenge.won);assert(el('fry-progress').children.every(i=>!i.classList.contains('landed')));
}
console.log('CHALLENGE CHECKS PASSED: six icons, first-touch timer, pause / resume, six-contact completion, frozen time, undo and new attempt');

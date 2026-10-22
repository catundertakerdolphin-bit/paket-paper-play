const assert = require('node:assert/strict');
const load = require('./runtime.cjs');

function standing(bag, cadence, label) {
  const original = new Float32Array(bag.pos);
  const initialCenter = bag.center()[1];
  let elapsed = 0, frame = 0;
  while (elapsed < 2) {
    const dt = cadence[frame++ % cadence.length];
    bag.settle(dt);
    elapsed += Math.min(dt, .05);
  }
  let drift = 0;
  for (let a = 0; a < bag.pos.length; a += 3) {
    drift = Math.max(drift, Math.hypot(...[0, 1, 2].map(d => bag.pos[a + d] - original[a + d])));
  }
  assert(bag.center()[1] > initialCenter - .04, `${label}: untouched bag must not sink under its own weight`);
  assert(drift < .08, `${label}: untouched paper must keep its initial shape (drift ${drift})`);
  assert(bag.sleeping, `${label}: upright paper must settle to sleep even with uneven frames`);
  assert.equal(bag.fries.floorMask.reduce((sum, value) => sum + value, 0), 0, `${label}: fries stay inside the untouched bag`);
  console.log('STANDING CHECK PASSED:', label);
}

const { PaperBag } = load({ mobile: false });
for (const [label, cadence] of [
  ['desktop 20 Hz', [.05]],
  ['desktop 60 Hz', [1 / 60]],
  ['desktop 120 Hz', [1 / 120]],
  ['desktop uneven frames', [1 / 60, .04, .016, .05, .027, .008, .044]],
  ['desktop after a long frame', [.5, 1 / 60, .04]],
]) {
  standing(new PaperBag(), cadence, label);
}

const bag = new PaperBag(), original = bag.snapshot();
bag.settle(.003);
bag.resetShape();
standing(bag, [.05], 'desktop reset');
bag.restore(original);
standing(bag, [.016, .024, .033, .05, .02, .041, .017], 'desktop restored snapshot');

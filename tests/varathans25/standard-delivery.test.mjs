import test from 'node:test';
import assert from 'node:assert/strict';
import { standardDelivery, deliveryCopy, FREE_DELIVERY_RAPPEN } from '../../varathans25/standard-delivery.mjs';

test('the threshold is exactly 10,000 integer rappen', () => assert.equal(FREE_DELIVERY_RAPPEN, 10000));
for (const [subtotal, free, remaining] of [[0,false,10000],[9999,false,1],[10000,true,0],[10001,true,0]]) {
  test(`CHF ${(subtotal/100).toFixed(2)}: inclusive Swiss boundary`, () => {
    const result = standardDelivery({ discountedSubtotalRappen: subtotal });
    assert.equal(result.free, free);
    assert.equal(result.remainingRappen, remaining);
    assert.equal(result.chargeRappen, free ? 0 : null);
  });
}
test('configured standard delivery is charged below the threshold', () => {
  // Synthetic rate for testing only; no rate is configured in the storefront.
  assert.equal(standardDelivery({ discountedSubtotalRappen: 9999, standardRateRappen: 725 }).chargeRappen, 725);
  assert.equal(standardDelivery({ discountedSubtotalRappen: 10000, standardRateRappen: 725 }).chargeRappen, 0);
});
test('a merchandise discount can remove eligibility', () => {
  const merchandise = 10500, approvedDiscount = 1000;
  assert.equal(standardDelivery({ discountedSubtotalRappen: merchandise }).free, true);
  const result = standardDelivery({ discountedSubtotalRappen: merchandise - approvedDiscount });
  assert.equal(result.free, false); assert.equal(result.remainingRappen, 500);
});
test('food and tea combine, and removing an item updates eligibility', () => {
  const food = 6500, tea = 4000;
  assert.equal(standardDelivery({ discountedSubtotalRappen: food + tea }).free, true);
  assert.equal(standardDelivery({ discountedSubtotalRappen: food }).remainingRappen, 3500);
});
test('international destinations never qualify, even above the threshold', () => {
  for (const country of ['FR','DE','INTERNATIONAL','',null]) {
    const result = standardDelivery({ discountedSubtotalRappen: 20000, country });
    assert.equal(result.free,false); assert.equal(result.remainingRappen,null);
    assert.equal(result.chargeRappen,null); assert.equal(result.status,'INTERNATIONAL_UNAVAILABLE');
  }
});
test('invalid prices and rates fail closed', () => {
  for (const value of [-1, NaN, Infinity, 99.99, '10000', null, Number.MAX_SAFE_INTEGER+1]) {
    assert.throws(() => standardDelivery({discountedSubtotalRappen:value}), /INVALID_SUBTOTAL/);
    if(value!==null)assert.throws(() => standardDelivery({discountedSubtotalRappen:0,standardRateRappen:value}), /INVALID_DELIVERY_RATE/);
  }
});
test('all interface keys are complete in DE, FR and EN', () => {
  for(const locale of ['de','fr','en']) {
    assert.deepEqual(Object.keys(deliveryCopy[locale]),Object.keys(deliveryCopy.en));
    assert.ok(Object.values(deliveryCopy[locale]).every(value => typeof value==='string' && value.trim()));
    assert.ok(deliveryCopy[locale].progress.includes('{amount}'));
  }
});

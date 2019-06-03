import * as path from 'path';
import {assert, driver, setUpDebugCapture, stackWrapFunc} from '../lib';
import {helperFunc1, helperFunc2} from './helpers';

function getThisLineNum(): number {
  const err = new Error();
  Error.captureStackTrace(err, getThisLineNum);
  const matches = err.stack!.match(/:(\d+)/) || [];
  return parseInt(matches[1], 10);
}

describe('stackTraces', () => {
  setUpDebugCapture();

  function createDom() {
    document.body.innerHTML = `<div id=".cls1">Hello</div>`;
  }

  before(async function() {
    this.timeout(20000);
    await driver.get('file://' + path.resolve(__dirname, 'blank.html'));
    await driver.executeScript(createDom);
  });

  it('should report line in plain assert', async () => {
    const line = getThisLineNum();
    try {
      assert.equal(1, 2);
    } catch (e) {
      assert.match(e.stack, new RegExp(`AssertionError:.*/test-stackTraces.ts:${line + 2}`, 's'),
        `Stack trace does not include expected line number ${line + 2}`);
    }
  });

  it('should report line in assert after async', async () => {
    await driver.sleep(1);
    const line = getThisLineNum();
    try {
      assert.equal(1, 2);
    } catch (e) {
      assert.match(e.stack, new RegExp(`AssertionError:.*/test-stackTraces.ts:${line + 2}`, 's'),
        `Stack trace does not include expected line number ${line + 2}`);
    }
  });

  it('should report line in assert in a called func', async () => {
    await driver.sleep(1);
    const line = getThisLineNum();
    try {
      await helperFunc1();
    } catch (e) {
      assert.match(e.stack, new RegExp(`AssertionError:.*/test-stackTraces.ts:${line + 2}`, 's'),
        `Stack trace does not include expected line number ${line + 2}`);
    }
  });

  it('should report line in failed webdriver operation', async () => {
    await driver.sleep(1);
    const line = getThisLineNum();
    try {
      await driver.find('.nonexistent');
    } catch (e) {
      assert.match(e.stack, new RegExp(`NoSuchElementError:.*/test-stackTraces.ts:${line + 2}`, 's'),
        `Stack trace does not include expected line number ${line + 2}`);
    }
  });

  it('should report line in failed webdriver operation in a called func', async () => {
    await driver.sleep(1);
    const line = getThisLineNum();
    try {
      await helperFunc2();
    } catch (e) {
      assert.match(e.stack, new RegExp(`NoSuchElementError:.*/test-stackTraces.ts:${line + 2}`, 's'),
        `Stack trace does not include expected line number ${line + 2}`);
    }
  });

  it('should not be overly expensive', async () => {
    let sum = 0;
    async function foo() { sum += 1; }
    const fooWrapped = stackWrapFunc(foo);
    const N = 10000;
    const mark1 = Date.now();
    for (let i = 0; i < N; i++) { await fooWrapped(); }
    const mark2 = Date.now();
    assert.equal(sum, N);
    const perCallMs = (mark2 - mark1) / N;
    assert.isAbove(perCallMs, 0);         // Ensure we are getting some actual number.
    assert.isBelow(perCallMs, 0.1);       // Ensure it's small. (It's actually < 0.01 on a modern laptop.)
  });
});

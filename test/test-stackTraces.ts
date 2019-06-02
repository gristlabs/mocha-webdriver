import * as path from 'path';
import {assert, driver, setUpDebugCapture} from '../lib';
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
});

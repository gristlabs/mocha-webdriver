/**
 * This file is part of test-stackTraces.ts, and serves also as an illustration for how to
 * organize helper methods. They can be placed in namespace (silencing tslint), wrapped in a
 * single call, and imported in the same way as if they were exported directly.
 */

import {assert, driver, stackWrapOwnMethods} from '../lib';

// tslint:disable-next-line:no-namespace
namespace helper {
  export async function helperFunc1() {
    await driver.sleep(1);
    assert.equal(1, 2);
  }

  export async function helperFunc2() {
    await driver.sleep(1);
    await driver.find('.nonexistent');
  }
}

stackWrapOwnMethods(helper, 'helpers');
export = helper;

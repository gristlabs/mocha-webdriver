/**
 * In node 12, proper stack traces are supposedly coming, but in node 10 stack traces printed by
 * mocha for tests using async/await are often unhelpful.
 *
 * (In fact, node 12.2.0 does not seem to address some cases of lost stack traces, so this may
 * still be needed with it. The unittest tests these situations.)
 *
 * In node 10, any function where an error is thrown after some `await` has returned, will include
 * in the stack trace the location in that function, but not in its caller. If the function is
 * wrapped using `stackWrapFunc()`, then its stack trace will be extended to include more info.
 * Setting MOCHA_WEBDRIVER_STACKTRACES=1 will wrap all WebDriver and WebElement methods. If you
 * call these via additional helpers, it is recommended to wrap the helpers too. See
 * test/helpers.ts for an example.
 *
 * This module uses some hacks inspired by
 * http://thecodebarbarian.com/async-stack-traces-in-node-js-12.html.
 */
import {WebDriver, WebElement, WebElementPromise} from './index';

/**
 * Wrap any function to report better stack traces, only if MOCHA_WEBDRIVER_STACKTRACES is set.
 * In errors thrown from the returned function, stack leading up the its call will be included
 * with lines starting with "at [enhanced] ...".
 */
export function stackWrapFunc<T extends any[], R>(fn: (...args: T) => R): (...args: T) => R {
  if (!process.env.MOCHA_WEBDRIVER_STACKTRACES) { return fn; }
  return wrap(fn);
}

/**
 * Wrap all methods in the given object (in-place), to report better stack traces, only if
 * MOCHA_WEBDRIVER_STACKTRACES is set. E.g. this gets applied to WebDriver.prototype.
 * In errors thrown from these methods, stack leading up the their calls will be included with
 * lines starting "at [enhanced] ...".
 */
export function stackWrapOwnMethods<T>(_obj: T): T {
  if (!process.env.MOCHA_WEBDRIVER_STACKTRACES) { return _obj; }
  const obj = _obj as any;
  for (const m of Object.getOwnPropertyNames(obj)) {
    if (typeof obj[m] === 'function' && !m.endsWith('_') && !m.startsWith('_')) {
      obj[m] = wrap(obj[m].origFunc || obj[m]);
    }
  }
  return obj;
}

// Wrap a single function.
function wrap(fn: any): any {
  const wrapped = function(this: any) {
    // This object has a useful stack trace. If we catch an error after some async operation,
    // we'll append this useful stack trace to it.
    const origErr = new Error('stackTraces');
    const ret = fn.apply(this, arguments);
    // Do nothing special if it didn't return a promise, or returned the driver itself.
    if (!ret || typeof ret.catch !== 'function' || ret instanceof WebDriver) { return ret; }
    // Otherwise, tack on to the stack the stack trace from origErr, with cleaning.
    const ret2 = ret.catch((err: any) => { throw cleanStack(err, origErr); });
    // And if it's a WebElementPromise, make sure we still return one.
    return (ret instanceof WebElementPromise) ? new WebElementPromise(ret.getDriver(), ret2) : ret2;
  };
  wrapped.origFunc = fn;
  return wrapped;
}

// Combine err.stack with origErr.stack, with an attempt to make it readable and helpful.
function cleanStack(err: Error, origErr: Error): Error {
  const origLines = origErr.stack!.split('\n');
  // Get the filename of this file (stackTraces.ts) from the first line of trace (it may differ
  // from __filename e.g. in ".js" vs ".ts" extension).
  // Stack trace lines look like this:
  // >>> at thenableWebDriverProxy.find (mocha-webdriver/lib/webdriver-plus.ts:192:17)
  // So we parse out the filename as the part between "(" and ":".
  const match = origLines[1] ? origLines[1].match(/\(([^:]*):\d+/) : null;
  const filename = match ? match[1] : __filename;
  const origStack = origLines.slice(1)                    // Skip the fake Error's name/message
    .filter((line) => !line.includes(`(${filename}:`))    // Omit lines referring to this file itself
    .map((line) => line.replace(/^\s*at /, '$&[enhanced] '))
    .join('\n');
  if (!err.stack!.endsWith(origStack)) {
    err.stack += '\n' + origStack;
  }
  return err;
}

// This is called automatically when driver is created.
export function stackWrapDriverMethods() {
  stackWrapOwnMethods(WebDriver.prototype);
  stackWrapOwnMethods(WebElement.prototype);
  stackWrapOwnMethods(WebElementPromise.prototype);
}

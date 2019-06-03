/**
 * In node 12, proper stack traces are supposedly coming, but in node 10 stack traces printed by
 * mocha for tests using async/await are often unhelpful.
 *
 * (In fact, node 12.2.0 does not seem to address some cases of lost stack traces, so this may
 * still be needed with it. The unittests tests these situations.)
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
 * Wrap any function to report better stack traces.
 * In errors thrown from the returned function, the part of stack leading up to its calls will
 * be prefixed with [[from {func.name}]].
 */
export function stackWrapFunc<T extends any[], R>(fn: (...args: T) => R): (...args: T) => R {
  return wrap(fn);
}

/**
 * Wrap all methods in the given object, in-place. E.g. this gets applied to WebDriver.prototype.
 * In errors thrown from these methods, the part of stack leading up to their calls will be
 * prefixed with [[from {objName}.{methodName}]].
 */
export function stackWrapOwnMethods<T>(_obj: T, objName: string): T {
  const obj = _obj as any;
  for (const m of Object.getOwnPropertyNames(obj)) {
    if (typeof obj[m] === 'function' && !m.endsWith('_') && !m.startsWith('_')) {
      obj[m] = wrap(obj[m].origFunc || obj[m], objName);
    }
  }
  return obj;
}

// Wrap a single function.
function wrap(fn: any, objName?: string): any {
  const wrapped = function(this: any) {
    // This object has a useful stack trace. If we catch an error after some async operation,
    // we'll append this useful stack trace to it.
    const origErr = new Error('stackTraces');
    const ret = fn.apply(this, arguments);
    // Do nothing special if it didn't return a promise, or returned the driver itself.
    if (typeof ret.catch !== 'function' || ret instanceof WebDriver) { return ret; }
    // Otherwise, tack on to the stack the stack trace from origErr, with cleaning.
    const ret2 = ret.catch((err: any) => { throw cleanStack(err, origErr, fn.name, objName); });
    // And if it's a WebElementPromise, make sure we still return one.
    return (ret instanceof WebElementPromise) ? new WebElementPromise(ret.getDriver(), ret2) : ret2;
  };
  wrapped.origFunc = fn;
  return wrapped;
}

// Combine err.stack with origErr.stack, with an attempt to make it readable and helpful.
function cleanStack(err: Error, origErr: Error, fnName: string, objName?: string): Error {
  const origLines = origErr.stack!.split('\n');
  const origStack = origLines.slice(1)                      // Skip the fake Error's name/message
    .filter((line) => !line.includes(`(${__filename}:`))    // Omit lines referring to this file itself
    .join('\n');
  if (!err.stack!.endsWith(origStack)) {
    const name = (objName ? objName + '.' : '') + fnName;
    err.stack += `\n   [[from ${name}]]\n` + origStack;
  }
  return err;
}

// This is called automatically when driver is created.
export function stackWrapDriverMethods(_driver: WebDriver) {
  stackWrapOwnMethods(WebDriver.prototype, 'WebDriver');
  stackWrapOwnMethods(WebElement.prototype, 'WebElement');
  stackWrapOwnMethods(WebElementPromise.prototype, 'WebElementPromise');
}

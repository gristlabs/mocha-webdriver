/**
 * Wrap any function to report better stack traces, only if MOCHA_WEBDRIVER_STACKTRACES is set.
 * In errors thrown from the returned function, stack leading up the its call will be included
 * with lines starting with "at [enhanced] ...".
 */
export declare function stackWrapFunc<T extends any[], R>(fn: (...args: T) => R): (...args: T) => R;
/**
 * Wrap all methods in the given object (in-place), to report better stack traces, only if
 * MOCHA_WEBDRIVER_STACKTRACES is set. E.g. this gets applied to WebDriver.prototype.
 * In errors thrown from these methods, stack leading up the their calls will be included with
 * lines starting "at [enhanced] ...".
 */
export declare function stackWrapOwnMethods<T>(_obj: T): T;
export declare function stackWrapDriverMethods(): void;

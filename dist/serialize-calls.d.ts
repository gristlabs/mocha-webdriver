/**
 * selenium-standalone is limited to how many parallel calls it can handle. A call such as
 * findAll(selector, (el) => e.getText()) could easily exceed that limit and cause "Connection
 * reset" errors. (See also https://github.com/SeleniumHQ/selenium/issues/5611)
 *
 * This file implements throttling of calls, to ensure that at most maxPendingCalls are
 * outstanding at any given time. It can be applied to any promise-returning method.
 */
declare type PromiseFunc = (...args: any[]) => Promise<any>;
export declare function serializeCalls<Func extends PromiseFunc>(method: Func, maxPendingCalls: number): Func;
export {};

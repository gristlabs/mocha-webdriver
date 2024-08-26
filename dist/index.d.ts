import * as Mocha from 'mocha';
import { WebDriver } from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome';
import * as firefox from 'selenium-webdriver/firefox';
import "./webdriver-plus";
/**
 * By using `import {assert} from 'webdriver-mocha', you can rely on chai-as-promised,
 * e.g. use `await assert.isRejected(promise)`.
 */
export { assert } from 'chai';
/**
 * Everything is re-exported from selenium-webdriver. This way, you can do e.g.
 *    import {assert, driver, WebElement} from 'mocha-webdriver';
 */
export * from 'selenium-webdriver';
export { enableDebugCapture } from './debugging';
export { stackWrapFunc, stackWrapOwnMethods } from './stackTraces';
export { LogType, logTypes } from './logs';
/**
 * Use `import {driver} from 'webdriver-mocha'. Note that it's already enhanced with extra methods
 * by "webdriver-plus" module. The driver object is a proxy, since
 * depending when exactly hooks are called it may not exist yet when
 * the library is imported.
 */
export declare const driver: WebDriver;
/**
 * Replace the driver. Can be useful for testing purposes.
 * Returns the driver being replaced.
 */
export declare function setDriver(newDriver?: WebDriver): WebDriver | undefined;
/**
 * To modify webdriver options, call this before mocha's before() hook. Your callback will be
 * called on driver creation with an object containing `chromeOpts` and `firefoxOpts`, and can
 * modify them in-place. E.g.
 *
 *    setOptionsModifyFunc(({chromeOpts}) => chromOpts.setUserPreferences({homepage: ...}));
 */
export declare function setOptionsModifyFunc(modifyFunc: OptionsModifyFunc | null): void;
export declare type OptionsModifyFunc = (opts: {
    chromeOpts: chrome.Options;
    firefoxOpts: firefox.Options;
}) => void;
/**
 * Use useServer() from a test suite to start an implementation of IMochaServer with the test.
 */
export interface IMochaServer {
    start(context: IMochaContext): Promise<void>;
    stop(context: IMochaContext): Promise<void>;
    getHost(): string;
}
export interface IMochaContext {
    timeout(ms: number): void;
}
declare module "selenium-webdriver" {
    interface Builder {
        setChromeService(service: any): Builder;
    }
}
/**
 * Use this from a test suite (i.e. inside a describe() clause) to start the given server. If the
 * same server is used by multiple tests, the server is reused.
 */
export declare function useServer(server: IMochaServer): void;
/**
 * Create a driver, with all command-line options applied.  Extra options can be passed
 * in as a parameter.  For example, {extraArgs: ['user-agent=notscape']} would set the
 * user agent in chrome.
 */
export declare function createDriver(options?: {
    extraArgs?: string[];
}): Promise<WebDriver>;
export declare function beforeMochaWebdriverTests(this: Mocha.Context): Promise<void>;
export declare function afterMochaWebdriverTests(this: Mocha.Context): Promise<void>;
export declare function getMochaHooks(): {
    afterAll?: typeof afterMochaWebdriverTests | undefined;
    beforeAll: typeof beforeMochaWebdriverTests;
};
/**
 * Call in a test suite or at top level, to add a name to the debug-REPL context. If a test fails
 * while in that suite, the name will be available in the REPL that you get with --no-exit flag.
 *
 * For example:
 *    const fs = require('fs-extra');
 *    describe("foo", () => {
 *      addToRepl("fs", fs);     // "fs.readFile(...)" can now be used in the REPL
 *    });
 */
export declare function addToRepl(name: string, value: any, description?: string): void;

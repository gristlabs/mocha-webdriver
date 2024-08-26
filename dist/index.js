"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addToRepl = exports.getMochaHooks = exports.afterMochaWebdriverTests = exports.beforeMochaWebdriverTests = exports.createDriver = exports.useServer = exports.setOptionsModifyFunc = exports.setDriver = exports.driver = exports.logTypes = exports.stackWrapOwnMethods = exports.stackWrapFunc = exports.enableDebugCapture = exports.assert = void 0;
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const Mocha = require("mocha");
const repl = require("repl");
const selenium_webdriver_1 = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const firefox = require("selenium-webdriver/firefox");
const logs_1 = require("./logs");
const serialize_calls_1 = require("./serialize-calls");
const stackTraces_1 = require("./stackTraces");
require("./webdriver-plus");
chai.use(chaiAsPromised);
/**
 * By using `import {assert} from 'webdriver-mocha', you can rely on chai-as-promised,
 * e.g. use `await assert.isRejected(promise)`.
 */
var chai_1 = require("chai");
Object.defineProperty(exports, "assert", { enumerable: true, get: function () { return chai_1.assert; } });
/**
 * Everything is re-exported from selenium-webdriver. This way, you can do e.g.
 *    import {assert, driver, WebElement} from 'mocha-webdriver';
 */
__exportStar(require("selenium-webdriver"), exports);
// Re-export function that sets up an afterEach() hook to save screenshots of failed tests.
var debugging_1 = require("./debugging");
Object.defineProperty(exports, "enableDebugCapture", { enumerable: true, get: function () { return debugging_1.enableDebugCapture; } });
var stackTraces_2 = require("./stackTraces");
Object.defineProperty(exports, "stackWrapFunc", { enumerable: true, get: function () { return stackTraces_2.stackWrapFunc; } });
Object.defineProperty(exports, "stackWrapOwnMethods", { enumerable: true, get: function () { return stackTraces_2.stackWrapOwnMethods; } });
var logs_2 = require("./logs");
Object.defineProperty(exports, "logTypes", { enumerable: true, get: function () { return logs_2.logTypes; } });
/**
 * Use `import {driver} from 'webdriver-mocha'. Note that it's already enhanced with extra methods
 * by "webdriver-plus" module. The driver object is a proxy, since
 * depending when exactly hooks are called it may not exist yet when
 * the library is imported.
 */
exports.driver = new Proxy({}, {
    get(_, prop) {
        if (!_driver) {
            throw new Error('WebDriver accessed before initialization');
        }
        return _driver[prop];
    }
});
let _driver;
/**
 * Replace the driver. Can be useful for testing purposes.
 * Returns the driver being replaced.
 */
function setDriver(newDriver) {
    const oldDriver = _driver;
    _driver = newDriver;
    return oldDriver;
}
exports.setDriver = setDriver;
/**
 * To modify webdriver options, call this before mocha's before() hook. Your callback will be
 * called on driver creation with an object containing `chromeOpts` and `firefoxOpts`, and can
 * modify them in-place. E.g.
 *
 *    setOptionsModifyFunc(({chromeOpts}) => chromOpts.setUserPreferences({homepage: ...}));
 */
function setOptionsModifyFunc(modifyFunc) {
    optionsModifyFunc = modifyFunc;
}
exports.setOptionsModifyFunc = setOptionsModifyFunc;
let optionsModifyFunc = null;
// Maps server objects to their "ready" promise.
const _servers = new Map();
/**
 * Use this from a test suite (i.e. inside a describe() clause) to start the given server. If the
 * same server is used by multiple tests, the server is reused.
 */
function useServer(server) {
    before(async function () {
        if (!_servers.has(server)) {
            _servers.set(server, server.start(this));
        }
        await _servers.get(server);
    });
    // Stopping of the started-up servers happens in cleanup().
}
exports.useServer = useServer;
// Command-line option for whether to keep browser open if a test fails. This is interpreted by
// mocha, and we use it too to start up a REPL when this option is used.
const noexit = process.argv.includes("--no-exit") || process.argv.includes('-E');
/**
 * Create a driver, with all command-line options applied.  Extra options can be passed
 * in as a parameter.  For example, {extraArgs: ['user-agent=notscape']} would set the
 * user agent in chrome.
 */
async function createDriver(options = {}) {
    // Set up browser options.
    const logPrefs = new selenium_webdriver_1.logging.Preferences();
    for (const logType of (0, logs_1.getEnabledLogTypes)()) {
        logPrefs.setLevel(logType, selenium_webdriver_1.logging.Level.INFO);
    }
    const chromeOpts = new chrome.Options();
    const firefoxOpts = new firefox.Options();
    // Optionally suppress the "Chrome is being controlled by automated test software" banner.
    // At the time of writing, on page reloads this can result on early clicks being missed,
    // so it can be helpful to just suppress it entirely.
    if (process.env.MOCHA_WEBDRIVER_NO_CONTROL_BANNER) {
        chromeOpts.excludeSwitches("enable-automation");
    }
    // Pay attention to the environment variables (documented in README).
    if (process.env.MOCHA_WEBDRIVER_HEADLESS) {
        chromeOpts.addArguments("--headless=new");
        firefoxOpts.addArguments("--headless");
    }
    if (process.env.MOCHA_WEBDRIVER_WINSIZE) {
        // This should have the form WIDTHxHEIGHT, e.g. 900x600.
        // Note that the result is not precise. For a requested size of 600x600, the resulting
        // dimensions of the screenshot (at least in May 2019) were:
        //    Chrome: 600x477
        //    Chrome headless: 600x600
        //    Firefox: 600x548
        //    Firefox headless: 600x526
        //
        // Using driver.manage().window().setRect() generally produces the same result, except on
        // Firefox (not headless), that call resized it to 600x526.
        const [widthStr, heightStr] = process.env.MOCHA_WEBDRIVER_WINSIZE.split("x");
        const width = parseFloat(widthStr);
        const height = parseFloat(heightStr);
        chromeOpts.windowSize({ width, height });
        // Firefox has a windowSize() method, but as of 4.0.0-alpha.1 and Firefox 66, it's wrong.
        firefoxOpts.addArguments("-width", widthStr, "-height", heightStr);
    }
    if (options.extraArgs) {
        chromeOpts.addArguments(...options.extraArgs);
        firefoxOpts.addArguments(...options.extraArgs);
    }
    if (process.env.MOCHA_WEBDRIVER_ARGS) {
        const args = process.env.MOCHA_WEBDRIVER_ARGS.trim().split(/\s+/);
        chromeOpts.addArguments(...args);
        firefoxOpts.addArguments(...args);
    }
    if (optionsModifyFunc) {
        optionsModifyFunc({ chromeOpts, firefoxOpts });
    }
    // Recent chromedriver refuses to work with any chrome major versions other than its own. That
    // makes it very awkward for developers and tests who are not all using the same chrome version.
    // Almost always (so far) the versions are actually compatible. Enable an undocumented option to
    // skip chromedriver's version check by setting MOCHA_WEBDRIVER_IGNORE_CHROME_VERSION.
    const chromeService = process.env.MOCHA_WEBDRIVER_IGNORE_CHROME_VERSION ?
        new chrome.ServiceBuilder().addArguments("--disable-build-check") : null;
    const newDriver = new selenium_webdriver_1.Builder()
        .forBrowser('firefox')
        .setLoggingPrefs(logPrefs)
        .setChromeOptions(chromeOpts)
        .setChromeService(chromeService)
        .setFirefoxOptions(firefoxOpts)
        .build();
    // If driver fails to start, this will let us notice and abort quickly.
    await newDriver.getSession();
    // If requested, limit the max number of parallel in-flight selenium calls. This is needed for
    // selenium-standalone, which can't cope with more than a few calls. A limit like 5 works fine.
    // See also https://github.com/SeleniumHQ/selenium/issues/5611
    if (process.env.MOCHA_WEBDRIVER_MAX_CALLS) {
        const count = parseInt(process.env.MOCHA_WEBDRIVER_MAX_CALLS, 10);
        if (!(count > 0)) {
            throw new Error("Invalid value for MOCHA_WEBDRIVER_MAX_CALLS env var");
        }
        const executor = newDriver.getExecutor();
        executor.execute = (0, serialize_calls_1.serializeCalls)(executor.execute, count);
    }
    return newDriver;
}
exports.createDriver = createDriver;
let _driverCreationPromise;
// Start up the webdriver and serve files that its browser will see.
async function beforeMochaWebdriverTests() {
    // If this has already been called, there's nothing to do.
    if (_driver || _driverCreationPromise) {
        await _driverCreationPromise;
        return;
    }
    this.timeout(20000); // Set a longer default timeout.
    // Add stack trace enhancement (no-op if MOCHA_WEBDRIVER_STACKTRACES isn't set).
    (0, stackTraces_1.stackWrapDriverMethods)();
    try {
        _driverCreationPromise = createDriver();
        setDriver(await _driverCreationPromise);
    }
    catch (e) {
        _driverCreationPromise = undefined;
        throw e;
    }
}
exports.beforeMochaWebdriverTests = beforeMochaWebdriverTests;
// Helper to return whether the given suite had any failures.
function suiteFailed(ctx) {
    let countFailed = 0;
    const testParent = ctx.test.parent;
    testParent.eachTest((test) => { countFailed += test.state === 'failed' ? 1 : 0; });
    return countFailed > 0;
}
// Quit the webdriver and stop serving files, unless we failed and --no-exit is given.
async function afterMochaWebdriverTests() {
    if (!_driver) {
        return;
    }
    this.timeout(6000);
    const testParent = this.test.parent;
    // special failure handling isn't ready for parallel mode.
    if (suiteFailed(this) && noexit && process.env.MOCHA_WORKER_ID === undefined) {
        const files = new Set();
        testParent.eachTest((test) => { if (test.state === 'failed') {
            files.add(test.file);
        } });
        // This is an intentional floating promise, it keeps the process running, and takes care of
        // exiting when appropriate.
        // tslint:disable-next-line:no-floating-promises
        startRepl(Array.from(files));
    }
    else {
        await cleanup(this);
        _driver = undefined;
    }
}
exports.afterMochaWebdriverTests = afterMochaWebdriverTests;
// Do not attempt to set the hooks if `before` is not defined, or if
// a MOCHA_WORKER_ID is set (revealing that we are in a parallel job
// managed by mocha). Both these cases arise when using mocha's parallel
// jobs support. When running tests in parallel, hooks need to be set
// using the exports.mochaHooks mechanism.
if (typeof before !== 'undefined' && process.env.MOCHA_WORKER_ID === undefined) {
    before(beforeMochaWebdriverTests);
    if (!process.env.MOCHA_WEBDRIVER_SKIP_CLEANUP) {
        after(afterMochaWebdriverTests);
    }
}
// Get mocha hooks to expose as exports.mochaHooks, a newer style of
// setting up hooks. Necessary when running tests in parallel.
// In parallel mode, before/afterAll hooks trigger at the file level, see:
//   https://mochajs.org/#available-root-hooks
// That means we are starting and stopping the web driver more than is
// strictly necessary. There aren't any hooks for when individual workers
// start or shut down unfortunately. If you're willing to delete any
// browser instances yourself, or they don't matter (e.g. in CI), you
// can set MOCHA_WEBDRIVER_SKIP_CLEANUP=1 to skip that, so the browser
// instance gets reused for different test files run by a given worker.
function getMochaHooks() {
    return Object.assign({ beforeAll: beforeMochaWebdriverTests }, (process.env.MOCHA_WEBDRIVER_SKIP_CLEANUP ? undefined : {
        afterAll: afterMochaWebdriverTests
    }));
}
exports.getMochaHooks = getMochaHooks;
async function cleanup(context) {
    // Start all cleanup in parallel, so that hangup of driver.quit does not block other cleanup.
    const promises = [];
    if (_driver) {
        promises.push(_driver.quit());
    }
    // Stop all servers registered with useServer().
    promises.push(...Array.from(_servers.keys(), (server) => server.stop(context)));
    // Wait for all cleanup to complete.
    await Promise.all(promises);
    _servers.clear();
}
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
function addToRepl(name, value, description = "no description") {
    after(function () {
        if (suiteFailed(this) && noexit) {
            replContext[name] = value;
            replDescriptions[name] = description;
        }
    });
}
exports.addToRepl = addToRepl;
// Contains the extra items to add to the REPL.
const replContext = {};
const replDescriptions = {};
async function startRepl(files) {
    // Wait a bit to let mocha print out its errors before REPL prints its prompts.
    await new Promise((resolve) => setTimeout(resolve, 50));
    // Continue running by keeping server and webdriver.
    // tslint:disable:no-console
    console.log("Not exiting. Abort with Ctrl-C, or type '.exit'");
    const customContext = Object.assign({ driver: exports.driver,
        resetModule, rerun: rerun.bind(null, files), 
        // In REPL, screenshot() saves an image to './screenshot-{N}.png', or the path you provide.
        screenshot: (filePath) => exports.driver.saveScreenshot(filePath, "."), showLogs }, replContext);
    console.log("You may interact with the browser here, e.g. driver.find('.css_selector')");
    console.log("Failed tests; available globals:");
    console.log("  driver: the WebDriver object, e.g. driver.find('.css_selector')");
    for (const [i, file] of files.entries()) {
        console.log(`  rerun(${i === 0 ? '' : i}): Rerun tests in ${file}`);
    }
    console.log("  resetModule(modulePath): reload given module on next require()");
    console.log("  screenshot(filePath?): save image to './screenshot-{N}.png' or the path provided.");
    console.log("  showLogs(logType='browser'): show logs of an enabled type, e.g. 'browser', 'driver'");
    for (const name of Object.keys(replDescriptions)) {
        console.log(`  ${name}: ${replDescriptions[name]}`);
    }
    const replObj = repl.start({ prompt: "node> ", ignoreUndefined: true });
    enhanceRepl(replObj);
    // Here are the extra globals available in the REPL prompt.
    Object.assign(replObj.context, customContext);
    // This cleanup is called outside a mocha hook, so `timeout(ms)` does nothing.
    replObj.on('exit', () => cleanup({ timeout: () => undefined }));
}
// Global REPL function that reruns the i-th failed test suite.
async function rerun(files, i = 0) {
    const file = files[i];
    delete require.cache[file];
    const mocha = new Mocha({ bail: true });
    mocha.addFile(file);
    const origProcessOn = ignoreUncaughtExceptionListeners(process.on);
    try {
        // This is the fromCallback() idiom without the fromCallback() helper.
        await new Promise((resolve, reject) => mocha.run((err) => err ? reject(err) : resolve()));
    }
    finally {
        process.on = origProcessOn;
    }
}
// From Node 12, node blocks usage of process.on('uncaughtException') while inside the REPL. Mocha
// sets such a handler, which results in an exception in rerun(). To avoid it, we temporarily
// replace `process.on` with a version that ignores calls to add 'uncaughtException' listeners.
function ignoreUncaughtExceptionListeners(origProcessOn) {
    process.on = (evName, evArg) => {
        if (evName === 'uncaughtException') {
            return;
        }
        return origProcessOn.call(process, evName, evArg);
    };
    return origProcessOn;
}
// Replace REPL's eval with a version that resolves returned values and stringifies WebElements.
function enhanceRepl(replObj) {
    const origEval = replObj.eval;
    replObj.eval = function (cmd, context, filename, callback) {
        origEval(cmd, context, filename, (err, value) => {
            if (err) {
                callback(err, value);
            }
            Promise.resolve(value)
                .then((result) => useElementDescriptions(result))
                .then((result) => callback(err, result))
                .catch((error) => callback(error));
        });
    };
}
async function useElementDescriptions(obj) {
    if (obj instanceof selenium_webdriver_1.WebElement) {
        return await obj.describe();
    }
    else if (Array.isArray(obj)) {
        return await Promise.all(obj.map(useElementDescriptions));
    }
    else {
        return obj;
    }
}
/**
 * REPL helper to delete a node module from cache to have it reloaded on next require(). This is
 * useful when you make a change to a module, type "rerun()", and want this change visible.
 */
function resetModule(moduleName) {
    delete require.cache[require.resolve(moduleName)];
}
/**
 * Fetch and print to console the logs of the given type.
 */
async function showLogs(logType = 'browser') {
    for (const line of await exports.driver.fetchLogs(logType)) {
        console.log(line);
    }
}
//# sourceMappingURL=index.js.map
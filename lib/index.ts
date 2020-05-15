import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as Mocha from 'mocha';
import * as npmRunPath from 'npm-run-path';
import * as repl from 'repl';
import {Builder, logging, WebDriver, WebElement} from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome';
import * as firefox from 'selenium-webdriver/firefox';
import {getEnabledLogTypes, LogType} from './logs';
import {serializeCalls} from './serialize-calls';
import {stackWrapDriverMethods} from './stackTraces';
import "./webdriver-plus";

chai.use(chaiAsPromised);

/**
 * By using `import {assert} from 'webdriver-mocha', you can rely on chai-as-promised,
 * e.g. use `await assert.isRejected(promise)`.
 */
export {assert} from 'chai';

/**
 * Everything is re-exported from selenium-webdriver. This way, you can do e.g.
 *    import {assert, driver, WebElement} from 'mocha-webdriver';
 */
export * from 'selenium-webdriver';

// Re-export function that sets up an afterEach() hook to save screenshots of failed tests.
export {enableDebugCapture} from './debugging';
export {stackWrapFunc, stackWrapOwnMethods} from './stackTraces';
export {LogType, logTypes} from './logs';

/**
 * Use `import {driver} from 'webdriver-mocha'. Note that it's already enhanced with extra methods
 * by "webdriver-plus" module.
 */
export let driver: WebDriver;

/**
 * To modify webdriver options, call this before mocha's before() hook. Your callback will be
 * called on driver creation with an object containing `chromeOpts` and `firefoxOpts`, and can
 * modify them in-place. E.g.
 *
 *    setOptionsModifyFunc(({chromeOpts}) => chromOpts.setUserPreferences({homepage: ...}));
 */
export function setOptionsModifyFunc(modifyFunc: OptionsModifyFunc | null) {
  optionsModifyFunc = modifyFunc;
}

export type OptionsModifyFunc = (opts: {chromeOpts: chrome.Options, firefoxOpts: firefox.Options}) => void;
let optionsModifyFunc: OptionsModifyFunc|null = null;

/**
 * Use useServer() from a test suite to start an implementation of IMochaServer with the test.
 */
export interface IMochaServer {
  start(context: IMochaContext): Promise<void>;
  stop(context: IMochaContext): Promise<void>;
  getHost(): string;
}

export interface IMochaContext {
  // Set timeout for the current test or hook.
  timeout(ms: number): void;
}

// Add a missing declaration in selenium-webdriver typings.
declare module "selenium-webdriver" {
  interface Builder {   // tslint:disable-line:interface-name
    setChromeService(service: any): Builder;
  }
}

// Maps server objects to their "ready" promise.
const _servers: Map<IMochaServer, Promise<void>> = new Map();

/**
 * Use this from a test suite (i.e. inside a describe() clause) to start the given server. If the
 * same server is used by multiple tests, the server is reused.
 */
export function useServer(server: IMochaServer) {
  before(async function() {
    if (!_servers.has(server)) {
      _servers.set(server, server.start(this));
    }
    await _servers.get(server);
  });
  // Stopping of the started-up servers happens in cleanup().
}

// Command-line option for whether to keep browser open if a test fails. This is interpreted by
// mocha, and we use it too to start up a REPL when this option is used.
const noexit: boolean = process.argv.includes("--no-exit") || process.argv.includes('-E');

/**
 * Create a driver, with all command-line options applied.  Extra options can be passed
 * in as a parameter.  For example, {extraArgs: ['user-agent=notscape']} would set the
 * user agent in chrome.
 */
export async function createDriver(options: {extraArgs?: string[]} = {}): Promise<WebDriver> {
  // Set up browser options.
  const logPrefs = new logging.Preferences();
  for (const logType of getEnabledLogTypes()) {
    logPrefs.setLevel(logType, logging.Level.INFO);
  }

  const chromeOpts = new chrome.Options();
  // Typings for Firefox options are incomplete, so supplement them with Chrome's typings.
  const firefoxOpts = new firefox.Options() as firefox.Options & chrome.Options;

  // Optionally suppress the "Chrome is being controlled by automated test software" banner.
  // At the time of writing, on page reloads this can result on early clicks being missed,
  // so it can be helpful to just suppress it entirely.
  if (process.env.MOCHA_WEBDRIVER_NO_CONTROL_BANNER) {
    chromeOpts.excludeSwitches("enable-automation");
  }

  // Pay attention to the environment variables (documented in README).
  if (process.env.MOCHA_WEBDRIVER_HEADLESS) {
    chromeOpts.headless();
    firefoxOpts.headless();
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
    chromeOpts.windowSize({width, height});
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
    optionsModifyFunc({chromeOpts, firefoxOpts});
  }

  // Recent chromedriver refuses to work with any chrome major versions other than its own. That
  // makes it very awkward for developers and tests who are not all using the same chrome version.
  // Almost always (so far) the versions are actually compatible. Enable an undocumented option to
  // skip chromedriver's version check by setting MOCHA_WEBDRIVER_IGNORE_CHROME_VERSION.
  const chromeService = process.env.MOCHA_WEBDRIVER_IGNORE_CHROME_VERSION ?
    new chrome.ServiceBuilder().addArguments("--disable-build-check") : null;

  const newDriver = new Builder()
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
    if (!(count > 0)) { throw new Error("Invalid value for MOCHA_WEBDRIVER_MAX_CALLS env var"); }
    const executor = newDriver.getExecutor();
    executor.execute = serializeCalls(executor.execute, count);
  }
  return newDriver;
}

// Start up the webdriver and serve files that its browser will see.
before(async function() {
  this.timeout(20000);      // Set a longer default timeout.

  // Add stack trace enhancement (no-op if MOCHA_WEBDRIVER_STACKTRACES isn't set).
  stackWrapDriverMethods();

  // Prepend node_modules/.bin to PATH, for chromedriver/geckodriver to be found.
  process.env.PATH = npmRunPath({cwd: __dirname});

  driver = await createDriver();
});

// Helper to return whether the given suite had any failures.
function suiteFailed(ctx: Mocha.Context): boolean {
  let countFailed = 0;
  const testParent = ctx.test!.parent!;
  testParent.eachTest((test: any) => { countFailed += test.state === 'failed' ? 1 : 0; });
  return countFailed > 0;
}

// Quit the webdriver and stop serving files, unless we failed and --no-exit is given.
after(async function() {
  this.timeout(6000);
  const testParent = this.test!.parent!;
  if (suiteFailed(this) && noexit) {
    const files = new Set<string>();
    testParent.eachTest((test: any) => { if (test.state === 'failed') { files.add(test.file); }});

    // This is an intentional floating promise, it keeps the process running, and takes care of
    // exiting when appropriate.
    // tslint:disable-next-line:no-floating-promises
    startRepl(Array.from(files));
  } else {
    await cleanup(this);
  }
});

async function cleanup(context: IMochaContext) {
  // Start all cleanup in parallel, so that hangup of driver.quit does not block other cleanup.
  const promises: Array<Promise<void>> = [];
  if (driver) { promises.push(driver.quit()); }

  // Stop all servers registered with useServer().
  promises.push(...Array.from(_servers.keys(), (server) => server.stop(context)));

  // Wait for all cleanup to complete.
  await Promise.all(promises);
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
export function addToRepl(name: string, value: any, description: string = "no description") {
  after(function() {
    if (suiteFailed(this) && noexit) {
      replContext[name] = value;
      replDescriptions[name] = description;
    }
  });
}

// Contains the extra items to add to the REPL.
const replContext: {[name: string]: any} = {};
const replDescriptions: {[name: string]: string} = {};

async function startRepl(files: string[]) {
  // Wait a bit to let mocha print out its errors before REPL prints its prompts.
  await new Promise((resolve) => setTimeout(resolve, 50));

  // Continue running by keeping server and webdriver.
  // tslint:disable:no-console
  console.log("Not exiting. Abort with Ctrl-C, or type '.exit'");

  const customContext: typeof replObj.context = {
    driver,
    resetModule,
    rerun: rerun.bind(null, files),
    // In REPL, screenshot() saves an image to './screenshot-{N}.png', or the path you provide.
    screenshot: (filePath?: string) => driver.saveScreenshot(filePath, "."),
    showLogs,
    ...replContext,   // user-supplied items from addToRepl() calls
  };

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

  const replObj = repl.start({ prompt: "node> ", ignoreUndefined: true});
  enhanceRepl(replObj);

  // Here are the extra globals available in the REPL prompt.
  Object.assign(replObj.context, customContext);

  // This cleanup is called outside a mocha hook, so `timeout(ms)` does nothing.
  replObj.on('exit', () => cleanup({timeout: () => undefined}));
}

// Global REPL function that reruns the i-th failed test suite.
function rerun(files: string[], i: number = 0) {
  const file = files[i];
  delete require.cache[file];
  const mocha = new Mocha({bail: true});
  mocha.addFile(file);
  // This is the fromCallback() idiom without the fromCallback() helper.
  return new Promise((resolve, reject) => mocha.run((err) => err ? reject(err) : resolve()));
}

// Replace REPL's eval with a version that resolves returned values and stringifies WebElements.
function enhanceRepl(replObj: any): void {
  const origEval = replObj.eval;
  replObj.eval = function(cmd: any, context: any, filename: any, callback: any) {
    origEval(cmd, context, filename, (err: any, value: any) => {
      if (err) { callback(err, value); }
      Promise.resolve(value)
      .then((result) => useElementDescriptions(result))
      .then((result) => callback(err, result))
      .catch((error) => callback(error));
    });
  };
}

async function useElementDescriptions(obj: any): Promise<any> {
  if (obj instanceof WebElement) {
    return await obj.describe();
  } else if (Array.isArray(obj)) {
    return await Promise.all(obj.map(useElementDescriptions));
  } else {
    return obj;
  }
}

/**
 * REPL helper to delete a node module from cache to have it reloaded on next require(). This is
 * useful when you make a change to a module, type "rerun()", and want this change visible.
 */
function resetModule(moduleName: string) {
  delete require.cache[require.resolve(moduleName)];
}

/**
 * Fetch and print to console the logs of the given type.
 */
async function showLogs(logType: LogType = 'browser') {
  for (const line of await driver.fetchLogs(logType)) {
    console.log(line);
  }
}

import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as Mocha from 'mocha';
import * as path from 'path';
import * as repl from 'repl';
import {Builder, logging, WebDriver, WebElement} from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome';
import * as firefox from 'selenium-webdriver/firefox';
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

/**
 * Use `import {driver} from 'webdriver-mocha'. Note that it's already enhanced with extra methods
 * by "webdriver-plus" module.
 */
export let driver: WebDriver;

/**
 * Use useServer() from a test suite to start an implementation of IMochaServer with the test.
 */
export interface IMochaServer {
  start(): Promise<void>;
  stop(): Promise<void>;
  getHost(): string;
}

const _servers: Set<IMochaServer> = new Set();

/**
 * Use this from a test suite (i.e. inside a describe() clause) to start the given server. If the
 * same server is used by multiple tests, the server is reused.
 */
export function useServer(server: IMochaServer) {
  before(async () => {
    if (!_servers.has(server)) {
      _servers.add(server);
      await server.start();
    }
  });
  // Stopping of the started-up servers happens in cleanup().
}

// Command-line option for whether to keep browser open if a test fails. This is interpreted by
// mocha, and we use it too to start up a REPL when this option is used.
const noexit: boolean = process.argv.includes("--no-exit") || process.argv.includes('-E');

// Start up the webdriver and serve files that its browser will see.
before(async function() {
  this.timeout(20000);      // Set a longer default timeout.

  // Set up browser options.
  const logPrefs = new logging.Preferences();
  logPrefs.setLevel(logging.Type.BROWSER, logging.Level.INFO);

  // Prepend node_modules/.bin to PATH, for chromedriver/geckodriver to be found.
  process.env.PATH = path.resolve("node_modules", ".bin") + ":" + process.env.PATH;

  const chromeOpts = new chrome.Options();
  const firefoxOpts = new firefox.Options();

  // Pay attention to the environment variables (documented in README).
  if (process.env.MOCHA_WEBDRIVER_HEADLESS) {
    chromeOpts.headless();
    firefoxOpts.headless();
  }
  if (process.env.MOCHA_WEBDRIVER_ARGS) {
    const args = process.env.MOCHA_WEBDRIVER_ARGS.trim().split(/\s+/);
    chromeOpts.addArguments(...args);
    firefoxOpts.addArguments(...args);
  }

  driver = new Builder()
    .forBrowser('firefox')
    .setLoggingPrefs(logPrefs)
    .setChromeOptions(chromeOpts)
    .setFirefoxOptions(firefoxOpts)
    .build();
});

// Quit the webdriver and stop serving files, unless we failed and --no-exit is given.
after(async function() {
  let countFailed = 0;
  const testParent = this.test!.parent!;
  testParent.eachTest((test: any) => { countFailed += test.state === 'failed' ? 1 : 0; });
  if (countFailed > 0 && noexit) {
    const files = new Set<string>();
    testParent.eachTest((test: any) => { if (test.state === 'failed') { files.add(test.file); }});

    // This is an intentional floating promise, it keeps the process running, and takes care of
    // exiting when appropriate.
    // tslint:disable-next-line:no-floating-promises
    startRepl(Array.from(files));
  } else {
    await cleanup();
  }
});

async function cleanup() {
  if (driver) { await driver.quit(); }

  // Stop all servers registered with useServer().
  await Promise.all(Array.from(_servers, (server) => server.stop()));
}

async function startRepl(files: string[]) {
  // Wait a bit to let mocha print out its errors before REPL prints its prompts.
  await new Promise((resolve) => setTimeout(resolve, 50));

  // Continue running by keeping server and webdriver, and waiting for an hour.
  // tslint:disable:no-console
  console.log("Not exiting. Abort with Ctrl-C, or type '.exit'");
  console.log("You may interact with the browser here, e.g. driver.find('.css_selector')");
  console.log("Failed tests; may rerun with rerun() function:");
  for (const [i, file] of files.entries()) {
    console.log(`  rerun(${i === 0 ? '' : i}): ${file}`);
  }

  const replObj = repl.start({ prompt: "node> ", ignoreUndefined: true});
  enhanceRepl(replObj);

  // Here are the extra globals available in the REPL prompt.
  Object.assign(replObj.context, {
    driver,
    rerun: rerun.bind(null, files),
  });
  replObj.on('exit', cleanup);
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

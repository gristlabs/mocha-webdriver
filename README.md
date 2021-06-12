# mocha-webdriver

[![Build Status](https://api.travis-ci.org/gristlabs/mocha-webdriver.svg?branch=master)](https://travis-ci.org/gristlabs/mocha-webdriver)
[![npm version](https://badge.fury.io/js/mocha-webdriver.svg)](https://badge.fury.io/js/mocha-webdriver)

> Write Mocha style tests using selenium-webdriver, with many conveniences.

The `mocha-webdriver` package simplifies creating browser tests in JS or TypeScript using
selenium-webdriver.

## Installation

```bash
npm install --save-dev mocha-webdriver
```

## Usage

Writing a browser test:

```typescript
// fooTest.ts
import {assert, driver} from 'mocha-webdriver';
import * as path from 'path';

describe('fooTest', function() {
  before(async function() {
    this.timeout(20000);
    await driver.get(`file://${path.resolve(__dirname)}/fooTestPage.html`);
  });

  it('should say Hello World', async function() {
    assert.equal(await driver.find('.hello').getText(), 'Hello World!');
  });
});
```

Running the test:

```bash
mocha test/fooTest.ts

# To debug a failing test
mocha test/fooTest.ts -b --no-exit
```

(If mocha is locally installed, run `./node_modules/.bin/mocha` or `$(npm bin)/mocha`).

You may select the browser to start `SELENIUM_BROWSER=chrome|firefox` environment variable (see [selenium
docs](https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/index_exports_Builder.html)
for other variables). Some additional environment variables are also supported:

  - `MOCHA_WEBDRIVER_HEADLESS`: start browser in headless mode if set to a non-empty value
  - `MOCHA_WEBDRIVER_ARGS`: pass the given args to the browser (e.g. `--disable-gpu --foo=bar`)
  - `MOCHA_WEBDRIVER_WINSIZE`: start browser with the given window size, given as `WIDTHxHEIGHT` (e.g. `900x600`)
  - `MOCHA_WEBDRIVER_MAX_CALLS`: limit the number of parallel selenium calls to this number, e.g. `5`.
You can use this to work around an
[issue](https://github.com/SeleniumHQ/selenium/issues/5611) in
[selenium-standalone](https://github.com/vvo/selenium-standalone), causing "Connection reset" errors.
  - `MOCHA_WEBDRIVER_LOGDIR`: in conjunction with [enableDebugCapture](#enabledebugcapture), a
directory into which to save logs and screenshots automatically after any failed test case.
  - `MOCHA_WEBDRIVER_LOGTYPES`: comma-separated list of which [log types](https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/logging_exports_Type.html)
to enable, for `driver.fetchLogs()` and for `enableDebugCapture()`. Defaults to `browser,driver`.
(Note: Supported by Chrome, but not Firefox, as of June 2019.)
  - `MOCHA_WEBDRIVER_STACKTRACES`: Enhance stack traces with async frames, if set to a non-empty
value.
  - `MOCHA_WEBDRIVER_IGNORE_CHROME_VERSION`: Disable chromedriver's check that it supports the installed version of Chrome. Normally the installed chromedriver (controlled by the version in `yarn.lock`) must [match Chrome's version](https://chromedriver.chromium.org/downloads/version-selection). When tests are run by different developers and test environments, that can cause difficulties. On the other hand, incompatible behavior is rare, so this option offers a practical workaround.
  - `MOCHA_WEBDRIVER_NO_CONTROL_BANNER`: suppress the "Chrome is being controlled by automated test software" banner. This banner may cause Chrome (as of version 79) to ignore clicks immediately after loading a page.

## Useful methods

`mocha-webdriver` provides several enhancement to the webdriver interface:

### driverOrElement.find(selector)

Shorthand to find an element, or a child of an element, by css selector, e.g. `.class-name`.

### driverOrElement.findAll(selector, [mapper])

Shorthand to find all elements matching the given css selector. Also available on a WebElement.

If the `mapper` argument is given, it is a function applied to all the found elements, and
findAll() returns the results of this function. E.g. `findAll('a', (el) =>
el.getAttribute('href'))`.

### driverOrElement.findWait(selector, timeoutMSec, [message])

Shorthand to wait for an element matching the given selector to be present. Also available on a
WebElement.

### driverOrElement.findContent(selector, contentRegExp)

Find elements matching the given css selector, then return the first one whose innerText matches
the given pattern. Accepts both regular expression pattern or plain text pattern. Also available on a WebElement. E.g.

```typescript
driver.findContent("button", /Accept/);
```

Note that for performance reasons, it only queries the browser once and searches using Javascript
in browser.

### driverOrElement.findContentWait(selector, contentRegExp, timeoutMSec, [message])

Shorthand to wait for an element containing specific innerText matching the given pattern. Accepts both regular expression pattern or plain text pattern.
Also available on a WebElement.

### elem.findClosest(selector)

Find the closest ancestor of this element that matches the css selector.

### elem.doClick(), elem.doSendKeys(...), elem.doClear(), elem.doSubmit()

Chainable variants of elem.click(), elem.sendKeys(), etc. E.g.
```
await driver.find('input.my-input').doClear().doSendKeys('hello');
```
is equivalent to
```
const elem = await driver.find('input.my-input');
await elem.clear();
await elem.sendKeys('hello');
```

### elem.value()

Shorthand for `elem.getAttribute('value')`.

### elem.describe()

Returns a human-friendly description of this element, for example `"button#btn.my-class[some-uuid]"`.
This is particularly useful in the REPL, described below.

### elem.rect()

Similar to the underlying webdriver's `getRect()`, but returns an object that includes properties
`{left, right, top, bottom, height, width}`, and whose property `rect` contains the original
object from webdriver (with `{x, y, height, width}`).

### elem.mouseMove({x?, y?})

Moves the mouse to the given location in pixels relative to this element. This is a chainable
method. E.g. `await driver.find('#btn').mouseMove({x: 100}).doClick()`.

### elem.hasFocus()

Returns whether this element is the current activeElement. Note that `matches(":focus")` may also
be used to the same effect.

### elem.isPresent()

Returns whether this element is present in the DOM of the current page.

### elem.index()

Returns the 0-based index of this element among its sibling elements.

### elem.matches(selector)

Returns whether this element matches the given CSS selector. For instance, check if an element has a
class, use `matches(".red")`. You can use any selector, e.g. `matches(".foo:active > li")`.

### driver.mouseDown(button?), driver.mouseUp(button?)

Performs "mouseDown" or "mouseUp" action with the given button, Button.LEFT by default.

### driver.mouseMoveBy({x?, y?})

Moves the mouse by the given offset relative to its current position.

### driver.sendKeys(...keys)

Send keys to the window.

### driver.saveScreenshot(relPath?, dir?)

Takes a screenshot, and saves it to `MW_SCREENSHOT_DIR/screenshot-{N}.png` if the
`MW_SCREENSHOT_DIR` environment variable is set.

 - `relPath` may specify a different destination filename, relative to `MW_SCREENSHOT_DIR`.
 - `relPath` may include `{N}` token, to replace with "1", "2", etc to find an
available name. (While `relPath` may includes subdirectories, the `{N}` token
may only be used in the filename part.)
 - `dir` may specify a different destination directory. If empty, the screenshot will be skipped.

### enableDebugCapture()

If called in a mocha test suite (i.e. inside `describe()`), adds an `afterEach` hook to save logs
and a screenshot after any failed test, only if `MOCHA_WEBDRIVER_LOGDIR` variable is set. The
files are named:
  - `MOCHA_WEBDRIVER_LOGDIR/{name}-{logtype}-{N}.log`
  - `MOCHA_WEBDRIVER_LOGDIR/{name}-screenshot-{N}.png`,
where `name` is the basename of the test file, and `N` is a numeric suffix.

This is helpful for debugging failing tests. Screenshots are particularly helpful in headless mode.
See also [#Logging](#logging).

## Customizing WebDriver creation

Sometimes you need to set options, such as browser preferences, on webdriver creation.
Some can be changed via environment variables such as `MOCHA_WEBDRIVER_ARGS` (see above). For
others, you can use `setOptionsModifyFunc()`.

### setOptionsModifyFunc(modifyFunc: ({chromeOpts, firefoxOpts}) => void)

Call this before mocha's `before()` hook, and modify `chromeOpts` and/or `firefoxOpts` to
your needs. For example:

```
setOptionsModifyFunc(({chromeOpts, firefoxOpts}) => {
  chromeOpts.setUserPreferences({
    download: { default_directory: '/tmp' }
  });
  firefoxOpts.setPreference('browser.download.dir', '/tmp');
});
```

For available methods, see
[Chrome Options](https://www.selenium.dev/selenium/docs/api/javascript/module/selenium-webdriver/chrome_exports_Options.html)
and [Firefox Options](https://www.selenium.dev/selenium/docs/api/javascript/module/selenium-webdriver/firefox_exports_Options.html).
For available preferences, see [Chrome Prefs](https://chromium.googlesource.com/chromium/src/+/master/chrome/common/pref_names.cc) and `about:config` for Firefox.

## Serving content

As with any webdriver tests, your test is just telling a browser what to do. It's up to you to
have a page to go to and interact with. Often such a page requires loading some client-side code
which is the actual logic to be tested.

If you'd like to build and serve such code on the fly, you have to say how to start and stop such
a server, and mocha-webdriver provides a helper to use it, as in the following example.

```typescript
// fooTest.ts
import {useServer} from 'mocha-webdriver';
import {server} from './myServer';

describe('fooTest', function() {

  useServer(server);
  enableDebugCapture();

  before(async function() {
    this.timeout(20000);
    await driver.get(`${server.getHost()}/fooTest/`);
  });
  ...
});

//======================================================================
// myServer.ts
import {IMochaContext, IMochaServer} from 'mocha-webdriver';
import * as path from 'path';
import * as serve from 'webpack-serve';

export class MyWebpackServer implements IMochaServer {
  private _server: any;

  public async start(ctx: IMochaContext) {
    ctx.timeout(10000);   // Optionally, adjust the timeout.
    const config = require(path.resolve(__dirname, 'webpack.config.js'));
    this._server = await serve({}, {config});
  }

  public async stop() {
    this._server.app.stop();
  }

  public getHost(): string {
    const {app, options} = this._server;
    const {port} = app.server.address();
    return `${options.protocol}://${options.host}:${port}`;
  }
}

export const server = new MyWebpackServer();
```


## Debugging tests

### REPL

When you are working on a test, you can be more productive by keeping mocha running. Start it with
```
mocha test/fooTest.ts -b -E
```

If a test fails (which you can ensure if needed by adding `assert(false)` somewhere in the test),
mocha will keep the browser running, and present a node REPL prompt. You may run commands in the
REPL manually, e.g. examine the page with `driver.find('.foo')` or interact with it with
`driver.find('.foo').click()`.

If you change test code, you can re-run the failing test suite directly from this prompt:

```
>>> rerun()
```

This is much faster than starting up the test from scratch.

If you modify some module during debugging in REPL, use the `resetModule(moduleName)` helper to
have that module's code reloaded (the failed test's module itself always gets reloaded by
`rerun()`). For example:

```
>>> resetModule('./testUtils');
```

If you need to use some module in the REPL, you may simply require it and use it. If you commonly
need something, you can add extra context to the REPL using `addToRepl(name, value)` helper in any
test suite or at top level. For example:

```
const fs = require('fs-extra');
describe("foo", () => {
  // Make "fs" available in the REPL if any of the "foo" tests fail (and "--no-exit" is used)
  addToRepl("fs", fs);
});
```

If debugging in headless mode, you can use screenshots to see what's happening on the virtual
screen. In REPL, `screenshot()` function is available to assist with that:

```
>>> screenshot()              // saves screenshot to "./screenshot-1.png", "./screenshot-2.png", etc.
>>> screenshot("snap.png")    // saves screenshot to "./snap.png"
```

### Logging

When running automated tests, if any test fails, you want to get enough information to debug it.
To enable the collection of such info, call within your mocha test suite (i.e. inside a call to `describe()`):

```
  enableDebugCapture();
```

In your automated running environment, set also the `MOCHA_WEBDRIVER_LOGDIR` environment variable
to the directory to which to store debug info when a test fails.

For each failed test case, you'll get a screenshot of the browser from the moment after the test
failed, and the contents of the browser console log and of webdriver log, collected during the run
of that test case. The logs only work on Chrome, but will contain each call to the browser, and
its return value.

### Stack Traces

Node does not do a great job with stack traces from async/await code. If your test fails, you will
typically get a stack trace like this:

```
NoSuchElementError: no such element: Unable to locate element: {"method":"css selector","selector":".nonexistent"}
  (Session info: headless chrome=74.0.3729.169)
  (Driver info: chromedriver=2.43.600229 (3fae4d0cda5334b4f533bede5a4787f7b832d052),platform=Mac OS X 10.13.6 x86_64)
    at Object.checkLegacyResponse (/Users/dmitry/devel/mocha-webdriver/node_modules/selenium-webdriver/lib/error.js:585:15)
    at parseHttpResponse (/Users/dmitry/devel/mocha-webdriver/node_modules/selenium-webdriver/lib/http.js:533:13)
    at Executor.execute (/Users/dmitry/devel/mocha-webdriver/node_modules/selenium-webdriver/lib/http.js:468:26)
    at processTicksAndRejections (internal/process/task_queues.js:89:5)
    at thenableWebDriverProxy.execute (/Users/dmitry/devel/mocha-webdriver/node_modules/selenium-webdriver/lib/webdriver.js:696:17) {
  name: 'NoSuchElementError',
  remoteStacktrace: ''
}
```

Note that it contains no information about which line of your test triggered it. The sample above
is from Node 12.2.0, which has better support for async stack traces. Disappointingly, it doesn't
help here. In Node 10, this situation occurs in more cases.

At the cost of some overhead (perfectly acceptable in tests), we can do much better.

Set `MOCHA_WEBDRIVER_STACKTRACES=1` environment variable, and stack traces start looking like
this:

```
NoSuchElementError: no such element: Unable to locate element: {"method":"css selector","selector":".nonexistent"}
  (Session info: headless chrome=74.0.3729.169)
  (Driver info: chromedriver=2.43.600229 (3fae4d0cda5334b4f533bede5a4787f7b832d052),platform=Mac OS X 10.13.6 x86_64)
    at Object.checkLegacyResponse (/Users/dmitry/devel/mocha-webdriver/node_modules/selenium-webdriver/lib/error.js:585:15)
    at parseHttpResponse (/Users/dmitry/devel/mocha-webdriver/node_modules/selenium-webdriver/lib/http.js:533:13)
    at Executor.execute (/Users/dmitry/devel/mocha-webdriver/node_modules/selenium-webdriver/lib/http.js:468:26)
    at processTicksAndRejections (internal/process/task_queues.js:89:5)
    at thenableWebDriverProxy.execute (/Users/dmitry/devel/mocha-webdriver/node_modules/selenium-webdriver/lib/webdriver.js:696:17)
    at [enhanced] thenableWebDriverProxy.findElement (/Users/dmitry/devel/mocha-webdriver/node_modules/selenium-webdriver/lib/webdriver.js:911:17)
    at [enhanced] thenableWebDriverProxy.find (/Users/dmitry/devel/mocha-webdriver/lib/webdriver-plus.ts:192:17)
    at [enhanced] Object.helperFunc2 (/Users/dmitry/devel/mocha-webdriver/test/helpers.ts:18:18)
    at [enhanced] Context.<anonymous> (/Users/dmitry/devel/mocha-webdriver/test/test-stackTraces.ts:75:7)
    at [enhanced] Context.<anonymous> (/Users/dmitry/devel/mocha-webdriver/test/test-stackTraces.ts:75:13) {
  name: 'NoSuchElementError',
  remoteStacktrace: ''
}
```

Note the lines with the `[enhanced]` marker, which contain information about lines in your actual
test files.

When your test code uses helper functions, stack traces may only report the location within the
helper, and not the location of the helper's caller. To get both, you need to wrap the helper with
`stackWrapFunc()`. See also `test/helpers.ts` for an example of how to wrap an entire module of
helpers.

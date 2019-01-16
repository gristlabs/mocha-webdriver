# mocha-webdriver

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
mocha -b --no-exit test/fooTest.ts
```

(If mocha is locally installed, run `./node_modules/.bin/mocha` or `$(npm bin)/mocha`).

## Useful methods

`mocha-webdriver` provides several enhancement to the webdriver interface:

### driver.find(selector), element.find(selector)

Shorthand to find an element, or a child of an element, by css selector, e.g. `.class-name`.

### driver.findAll(selector, [mapper])

Shorthand to find all elements matching the given css selector. Also available on a WebElement.

If the `mapper` argument is given, it is a function applied to all the found elements, and
findAll() returns the results of this function. E.g. `findAll('a', (el) =>
el.getAttribute('href'))`.

### driver.findWait(timeoutSec, selector, [message])

Shorthand to wait for an element matching the given selector to be present. Also available on a
WebElement.

### driver.findContent(selector, contentRegExp)

Find elements matching the given css selector, then return the first one whose innerText matches
the given regular expression. Also available on a WebElement. E.g.

```typescript
driver.findContent("button", /Accept/);
```

Note that for performance reasons, it only queries the browser once and searches using Javascript
in browser.

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

## Debugging tests

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

  before(async function() {
    this.timeout(20000);
    await driver.get(`${server.getHost()}/fooTest/`);
  });
  ...
});

//======================================================================
// myServer.ts
import {IMochaServer} from 'mocha-webdriver';
import * as path from 'path';
import * as serve from 'webpack-serve';

export class MyWebpackServer implements IMochaServer {
  private _server: any;

  public async start() {
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

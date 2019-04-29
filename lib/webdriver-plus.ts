import {Button, By, error, until, WebDriver,
        WebElement, WebElementCondition, WebElementPromise} from 'selenium-webdriver';

// TODO: This is needed for the getRect() fix (see below).
// tslint:disable-next-line:no-var-requires
const command = require('selenium-webdriver/lib/command');

/**
 * This is implemented by both the WebDriver, and individual WebElements.
 */
export interface IFindInterface {
  /**
   * Shorthand to find element by css selector.
   */
  find(selector: string): WebElementPromise;

  /**
   * Shorthand to wait for an element to be present, using a css selector.
   */
  findWait(timeoutSec: number, selector: string, message?: string): WebElementPromise;

  /**
   * Shorthand to find all elements matching a css selector.
   */
  findAll(selector: string): Promise<WebElement[]>;

  /**
   * Shorthand to find all elements matching a css selector and to apply a mapper to each
   * of the found elements. e.g. findAll('a', (el) => el.getAttribute('href'))
   */
  findAll<T>(selector: string, mapper: (e: WebElement) => Promise<T>): Promise<T[]>;

  /**
   * Find elements by a css selector, and filter by innerText matching the given regex.
   */
  findContent(selector: string, contentRE: RegExp): WebElementPromise;

  /**
   * Shorthand to wait for an element containing specific innerText matching the given regex to be present.
   */
  findContentWait(timeoutSec: number, selector: string, contentRE: RegExp, message?: string): WebElementPromise;
}

declare module "selenium-webdriver" {
  // tslint:disable:interface-name

  /**
   * Enhanced WebDriver with shorthand find*() methods.
   */
  interface WebDriver extends IFindInterface {
    // Mouse down with a given button, e.g. Button.LEFT
    mouseDown(button?: number): Promise<void>;

    // Mouse up with a given button, e.g. Button.LEFT
    mouseUp(button?: number): Promise<void>;

    // Move mouse by the given amount relative to its current position.
    // See WebElement.mouseMove() for moving to an element.
    mouseMoveBy(params?: {x?: number, y?: number}): Promise<void>;

    // Send keys to the window.
    sendKeys(...keys: string[]): Promise<void>;

    // Helper to execute actions using new webdriver driver.actions() flow, for which typings are
    // not currently updated (as of Jan 2019).
    withActions(cb: (actions: any) => void): Promise<void>;
  }

  /**
   * Enhanced WebElement, with shorthand find*() methods, and chainable do*() methods.
   */
  interface WebElement extends IFindInterface {
    // Returns the closest ancestor of this element that matches the css selector.
    findClosest(selector: string): WebElementPromise;

    doClick(): WebElementPromise;
    doSendKeys(...args: string[]): WebElementPromise;
    doSubmit(): WebElementPromise;
    doClear(): WebElementPromise;

    // Shortcut to getAttribute('value')
    value(): Promise<string>;

    // Returns a human-friendly description of this element.
    describe(): Promise<string>;

    // Selenium typings are missing this method, as of Nov'18.
    getRect(): Promise<{width: number, height: number, x: number, y: number}>;

    // Returns a ClientRect describing this element's location and size.
    rect(): Promise<ClientRect>;

    // Shortcut to perform an action moving the mouse to the middle of this element. If x and/or y
    // are given, they are offsets from the element's center.
    mouseMove(params?: {x?: number, y?: number}): WebElementPromise;

    // Returns whether this element is the current activeElement.
    hasFocus(): Promise<boolean>;

    // Returns whether this element is present.
    isPresent(): Promise<boolean>;
  }

  // These are just missing typings.
  interface Capabilities {
    getBrowserName(): string|undefined;
    getPlatform(): string|undefined;
  }
}

/**
 * Represents a ClientRect obtained via selenium-webdriver.
 */
class WebElementRect implements ClientRect {
  constructor(public readonly rect: {width: number, height: number, x: number, y: number}) {}
  get width(): number { return this.rect.width; }
  get height(): number { return this.rect.height; }
  get top(): number { return this.rect.y; }
  get bottom(): number { return this.rect.y + this.rect.height; }
  get left(): number { return this.rect.x; }
  get right(): number { return this.rect.x + this.rect.width; }
}

// A version of `new WebElementCondition` that doesn't complain about correct types.
function makeWebElementCondition(message: string, fn: (webdriver: WebDriver) => Promise<WebElement|null>) {
  // The cast of `fn` is a hack to placate selenium's poor typings.
  return new WebElementCondition(message, fn as (webdriver: WebDriver) => WebElementPromise);
}

async function findContentHelper(driver: WebDriver, finder: WebElement|null,
                                 selector: string, contentRE: RegExp): Promise<WebElement> {
  const elem = await findContentIfPresent(driver, finder, selector, contentRE);
  if (!elem) {
    throw new error.NoSuchElementError(`No elements match ${selector} and ${contentRE}`);
  }
  return elem;
}

async function findContentIfPresent(driver: WebDriver, finder: WebElement|null,
                                    selector: string, contentRE: RegExp): Promise<WebElement|null> {
  // tslint:disable:no-shadowed-variable
  return await driver.executeScript<WebElement>(() => {
    const finder = (arguments[0] || window.document);
    const elements = [...finder.querySelectorAll(arguments[1])];
    const contentRE = new RegExp(arguments[2]);
    return elements.find((el) => contentRE.test(el.innerText));
  }, finder, selector, contentRE.source);
}

async function findClosestHelper(driver: WebDriver, finder: WebElement, selector: string): Promise<WebElement> {
  // tslint:disable:no-shadowed-variable
  const elem = await driver.executeScript<WebElement|null>(() => {
    const finder = arguments[0];
    const selector = arguments[1];
    return finder.closest(selector);
  }, finder, selector);
  if (!elem) {
    throw new error.NoSuchElementError(`No ancestor elements match ${selector}`);
  }
  return elem;
}

// Enhance WebDriver to implement IWebDriverPlus interface.
Object.assign(WebDriver.prototype, {
  find(this: WebDriver, selector: string): WebElementPromise {
    return this.findElement(By.css(selector));
  },

  async findAll<T>(
    this: WebDriver,
    selector: string,
    mapper?: (e: WebElement) => Promise<T>
  ): Promise<WebElement[]|T[]> {
    const elems = await this.findElements(By.css(selector));
    return mapper ? Promise.all(elems.map(mapper)) : elems;
  },

  findWait(this: WebDriver, timeoutSec: number, selector: string, message?: string): WebElementPromise {
    return this.wait(until.elementLocated(By.css(selector)), timeoutSec * 1000, message);
  },

  findContent(this: WebDriver, selector: string, contentRE: RegExp): WebElementPromise {
    return new WebElementPromise(this, findContentHelper(this, null, selector, contentRE));
  },

  findContentWait(
    this: WebDriver,
    timeoutSec: number,
    selector: string,
    contentRE: RegExp,
    message?: string
  ): WebElementPromise {
    const condition = makeWebElementCondition(`for element matching ${selector} and ${contentRE}`,
      () => findContentIfPresent(this, null, selector, contentRE));
    return this.wait(condition, timeoutSec * 1000, message);
  },

  mouseDown(this: WebDriver, button = Button.LEFT): Promise<void> {
    return this.withActions((actions: any) => actions.press(button));
  },
  mouseUp(this: WebDriver, button = Button.LEFT): Promise<void> {
    return this.withActions((actions: any) => actions.release(button));
  },
  mouseMoveBy(this: WebDriver, params: {x?: number, y?: number} = {}): Promise<void> {
    return this.withActions((actions: any) => actions.move({origin: 'pointer', ...params}));
  },
  sendKeys(this: WebDriver, ...keys: string[]): Promise<void> {
    return this.withActions((actions: any) => actions.sendKeys(...keys));
  },

  withActions(this: WebDriver, cb: (actions: any) => void): Promise<void> {
    // Unfortunately selenium-webdriver typings at this point (Nov'18) are one major version behind,
    // and actions are incorrect.
    // {bridge: true} allows support for legacy actions, currently needed for Chrome (Jan'19).
    const actions = (this as any).actions({bridge: true});
    cb(actions);
    return actions.perform();
  },
});

// Enhance WebElement to implement IWebElementPlus interface.
Object.assign(WebElement.prototype, {
  find(this: WebElement, selector: string): WebElementPromise {
    return this.findElement(By.css(selector));
  },

  async findAll<T>(
    this: WebElement,
    selector: string,
    mapper?: (e: WebElement) => Promise<T>
  ): Promise<WebElement[]|T[]> {
    const elems = await this.findElements(By.css(selector));
    return mapper ? Promise.all(elems.map(mapper)) : elems;
  },

  findWait(this: WebElement, timeoutSec: number, selector: string, message?: string): WebElementPromise {
    const condition = makeWebElementCondition(`for element matching ${selector}`,
      () => this.findElements(By.css(selector)).then((e) => e[0]));
    return this.getDriver().wait(condition, timeoutSec * 1000, message);
  },

  findContent(this: WebElement, selector: string, contentRE: RegExp): WebElementPromise {
    return new WebElementPromise(this.getDriver(), findContentHelper(this.getDriver(), this, selector, contentRE));
  },

  findContentWait(
    this: WebElement,
    timeoutSec: number,
    selector: string,
    contentRE: RegExp,
    message?: string
  ): WebElementPromise {
    const condition = makeWebElementCondition(`for element matching ${selector} and ${contentRE}`,
      () => findContentIfPresent(this.getDriver(), this, selector, contentRE));
    return this.getDriver().wait(condition, timeoutSec * 1000, message);
  },

  findClosest(this: WebElement, selector: string): WebElementPromise {
    return new WebElementPromise(this.getDriver(), findClosestHelper(this.getDriver(), this, selector));
  },

  doClick(this: WebElement): WebElementPromise {
    return new WebElementPromise(this.getDriver(), this.click().then(() => this));
  },
  doSendKeys(this: WebElement, ...args: string[]): WebElementPromise {
    return new WebElementPromise(this.getDriver(), this.sendKeys(...args).then(() => this));
  },
  doSubmit(this: WebElement): WebElementPromise {
    return new WebElementPromise(this.getDriver(), this.submit().then(() => this));
  },
  doClear(this: WebElement): WebElementPromise {
    return new WebElementPromise(this.getDriver(), this.clear().then(() => this));
  },

  value(this: WebElement): Promise<string> {
    return this.getAttribute('value');
  },

  async describe(this: WebElement): Promise<string> {
    const [elemId, id, tagName, classAttr] = await Promise.all([
      this.getId(), this.getAttribute('id'), this.getTagName(), this.getAttribute('class'),
    ]);
    const idStr = id ? '#' + id : '';
    const classes = classAttr ? '.' + classAttr.replace(/ /g, '.') : '';
    return `${tagName}${idStr}${classes}[${elemId}]`;
  },

  // As of 4.0.0-alpha.1, selenium-webdriver mistakenly swallows errors in getRect(). We override
  // the implementation to fix that. TODO: Remove this when fixed in selenium-webdriver. The code
  // below is copy pasted from selenium-webdriver's WebElement.getRect() (NOT WebDriver.getRect),
  // but adds a `throw err` at end of catch block, which omission is clearly a mistake.
  async getRect() {
    try {
      return await (this as any).execute_(new command.Command(command.Name.GET_ELEMENT_RECT));
    } catch (err) {
      if (err instanceof error.UnknownCommandError) {
        const {width, height} =
            await (this as any).execute_(new command.Command(command.Name.GET_ELEMENT_SIZE));
        const {x, y} =
            await (this as any).execute_(new command.Command(command.Name.GET_ELEMENT_LOCATION));
        return {x, y, width, height};
      }
      throw err;
    }
  },
  async rect(this: WebElement): Promise<ClientRect> {
    return new WebElementRect(await this.getRect());
  },
  mouseMove(this: WebElement, params: {x?: number, y?: number} = {}): WebElementPromise {
    const p = this.getDriver().withActions((actions) => actions.move({origin: this, ...params}));
    return new WebElementPromise(this.getDriver(), p.then(() => this));
  },
  async hasFocus(this: WebElement): Promise<boolean> {
    const active = this.getDriver().switchTo().activeElement();
    const [a, b] = await Promise.all([this.getId(), active.getId()]);
    return a === b;
  },
  async isPresent(this: WebElement): Promise<boolean> {
    try {
      await this.getId();
      return true;
    } catch (e) {
      if (e.name === 'NoSuchElementError') { return false; }
      throw e;
    }
  },
});

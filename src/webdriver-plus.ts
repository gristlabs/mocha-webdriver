import {By, promise, until, WebDriver,
        WebElement, WebElementCondition, WebElementPromise} from 'selenium-webdriver';

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
  findAll<T>(selector: string, mapper: (e: WebElement) => promise.Promise<T>): Promise<T[]>;

  /**
   * Find elements by a css selector, and filter by getText() matching the given regex.
   */
  findContent(selector: string, contentRE: RegExp): WebElementPromise;
}

declare module "selenium-webdriver" {
  // tslint:disable:interface-name no-shadowed-variable no-empty-interface

  /**
   * Enhanced WebDriver with shorthand find*() methods.
   */
  interface WebDriver extends IFindInterface {
    // No extra methods beside IFindInterface.
  }

  /**
   * Enhanced WebElement, with shorthand find*() methods, and chainable do*() methods.
   */
  interface WebElement extends IFindInterface {
    doClick(): WebElementPromise;
    doSendKeys(...args: string[]): WebElementPromise;
    doSubmit(): WebElementPromise;
    doClear(): WebElementPromise;

    // Shortcut to getAttribute('value')
    value(): promise.Promise<string>;

    // Returns a human-friendly description of this element.
    describe(): Promise<string>;
  }

  // These are just missing typings.
  interface Capabilities {
    getBrowserName(): string|undefined;
    getPlatform(): string|undefined;
  }
}

async function findContentHelper(driver: WebDriver, finder: WebElement|null,
                                 selector: string, contentRE: RegExp): Promise<WebElement> {
  return await driver.executeScript<WebElement>( () => {
    const finder = (arguments[0] || window.document);
    const elements = [...finder.querySelectorAll(arguments[1])];
    const contentRE = new RegExp(arguments[2]);
    const found = elements.find((el) => contentRE.test(el.innerText));
    if (!found) { throw new Error(`None of ${elements.length} elements match ${contentRE}`); }
    return found;
  }, finder, selector, contentRE.source);
}

// Enhance WebDriver to implement IWebDriverPlus interface.
Object.assign(WebDriver.prototype, {
  find(this: WebDriver, selector: string): WebElementPromise {
    return this.findElement(By.css(selector));
  },

  async findAll<T>(
    this: WebDriver,
    selector: string,
    mapper?: (e: WebElement) => promise.Promise<T>
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
});

// Enhance WebElement to implement IWebElementPlus interface.
Object.assign(WebElement.prototype, {
  find(this: WebElement, selector: string): WebElementPromise {
    return this.findElement(By.css(selector));
  },

  async findAll<T>(
    this: WebElement,
    selector: string,
    mapper?: (e: WebElement) => promise.Promise<T>
  ): Promise<WebElement[]|T[]> {
    const elems = await this.findElements(By.css(selector));
    return mapper ? Promise.all(elems.map(mapper)) : elems;
  },

  findWait(this: WebElement, timeoutSec: number, selector: string, message?: string): WebElementPromise {
    const condition = new WebElementCondition(`for element matching ${selector}`,
      () => this.findElements(By.css(selector)).then((e) => e[0]));
    return this.getDriver().wait(condition, timeoutSec * 1000, message);
  },

  findContent(this: WebElement, selector: string, contentRE: RegExp): WebElementPromise {
    return new WebElementPromise(this.getDriver(), findContentHelper(this.getDriver(), this, selector, contentRE));
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

  value(this: WebElement): promise.Promise<string> {
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
});

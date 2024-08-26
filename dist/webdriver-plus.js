"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const selenium_webdriver_1 = require("selenium-webdriver");
const logs_1 = require("./logs");
const screenshots_1 = require("./screenshots");
/**
 * Represents a ClientRect obtained via selenium-webdriver.
 */
class WebElementRect {
    constructor(rect) {
        this.rect = rect;
    }
    get width() { return this.rect.width; }
    get height() { return this.rect.height; }
    get top() { return this.rect.y; }
    get bottom() { return this.rect.y + this.rect.height; }
    get left() { return this.rect.x; }
    get right() { return this.rect.x + this.rect.width; }
    get x() { return this.rect.x; }
    get y() { return this.rect.y; }
    toJSON() { return this.rect; }
}
// A version of `new WebElementCondition` that doesn't complain about correct types.
function makeWebElementCondition(message, fn) {
    // The cast of `fn` is a hack to placate selenium's poor typings.
    return new selenium_webdriver_1.WebElementCondition(message, fn);
}
async function findContentHelper(driver, finder, selector, contentRE) {
    const elem = await findContentIfPresent(driver, finder, selector, contentRE);
    if (!elem) {
        throw new selenium_webdriver_1.error.NoSuchElementError(`No elements match ${selector} and ${contentRE}`);
    }
    return elem;
}
async function findContentIfPresent(driver, finder, selector, content) {
    // credit for the regexp escape:
    // https://makandracards.com/makandra/15879-javascript-how-to-generate-a-regular-expression-from-a-string
    // WARN: Discriminating with `content instanceof RegExp ? ... : ... ;` was causing issues when
    // called from the repl (for instance `node > driver.findContent('.foo', /BAR/)` was
    // failing). It's as if repl uses its own instance of the RegExp class, making content not an
    // instance of the RegExp in this context. It's something to keep in mind when implementating
    // function that accepts built in objects (Date, URL, ...).
    // tslint:disable-next-line:max-line-length
    // Useful link: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/instanceof#instanceof_and_multiple_context_(e.g._frames_or_windows)
    const contentRE = typeof content === 'string' ?
        new RegExp(content.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')) :
        content;
    // tslint:disable:no-shadowed-variable
    return await driver.executeScript(() => {
        const finder = (arguments[0] || window.document);
        const elements = [...finder.querySelectorAll(arguments[1])];
        const contentRE = new RegExp(arguments[2].source, arguments[2].flags);
        return elements.find((el) => contentRE.test(el.innerText));
    }, finder, selector, { source: contentRE.source, flags: contentRE.flags });
}
async function findClosestHelper(driver, finder, selector) {
    // tslint:disable:no-shadowed-variable
    const elem = await driver.executeScript(() => {
        const finder = arguments[0];
        const selector = arguments[1];
        return finder.closest(selector);
    }, finder, selector);
    if (!elem) {
        throw new selenium_webdriver_1.error.NoSuchElementError(`No ancestor elements match ${selector}`);
    }
    return elem;
}
// Enhance WebDriver to implement IWebDriverPlus interface.
Object.assign(selenium_webdriver_1.WebDriver.prototype, {
    find(selector) {
        return this.findElement(selenium_webdriver_1.By.css(selector));
    },
    async findAll(selector, mapper) {
        const elems = await this.findElements(selenium_webdriver_1.By.css(selector));
        return mapper ? Promise.all(elems.map(mapper)) : elems;
    },
    findWait(selector, timeoutMSec, message) {
        return this.wait(selenium_webdriver_1.until.elementLocated(selenium_webdriver_1.By.css(selector)), timeoutMSec, message);
    },
    findContent(selector, contentRE) {
        return new selenium_webdriver_1.WebElementPromise(this, findContentHelper(this, null, selector, contentRE));
    },
    findContentWait(selector, contentRE, timeoutMSec, message) {
        const condition = makeWebElementCondition(`for element matching ${selector} and ${contentRE}`, () => findContentIfPresent(this, null, selector, contentRE));
        return this.wait(condition, timeoutMSec, message);
    },
    mouseDown(button = selenium_webdriver_1.Button.LEFT) {
        return this.withActions((actions) => actions.press(button));
    },
    mouseUp(button = selenium_webdriver_1.Button.LEFT) {
        return this.withActions((actions) => actions.release(button));
    },
    mouseMoveBy(params = {}) {
        return this.withActions((actions) => actions.move(Object.assign({ origin: selenium_webdriver_1.Origin.POINTER }, params)));
    },
    sendKeys(...keys) {
        return this.withActions((actions) => actions.sendKeys(...keys));
    },
    withActions(cb) {
        const actions = this.actions();
        cb(actions);
        return actions.perform();
    },
    saveScreenshot: screenshots_1.driverSaveScreenshot,
    fetchLogs: logs_1.driverFetchLogs,
});
// Enhance WebElement to implement IWebElementPlus interface.
Object.assign(selenium_webdriver_1.WebElement.prototype, {
    find(selector) {
        return this.findElement(selenium_webdriver_1.By.css(selector));
    },
    async findAll(selector, mapper) {
        const elems = await this.findElements(selenium_webdriver_1.By.css(selector));
        return mapper ? Promise.all(elems.map(mapper)) : elems;
    },
    findWait(selector, timeoutMSec, message) {
        const condition = makeWebElementCondition(`for element matching ${selector}`, () => this.findElements(selenium_webdriver_1.By.css(selector)).then((e) => e[0]));
        return this.getDriver().wait(condition, timeoutMSec, message);
    },
    findContent(selector, contentRE) {
        return new selenium_webdriver_1.WebElementPromise(this.getDriver(), findContentHelper(this.getDriver(), this, selector, contentRE));
    },
    findContentWait(selector, contentRE, timeoutMSec, message) {
        const condition = makeWebElementCondition(`for element matching ${selector} and ${contentRE}`, () => findContentIfPresent(this.getDriver(), this, selector, contentRE));
        return this.getDriver().wait(condition, timeoutMSec, message);
    },
    findClosest(selector) {
        return new selenium_webdriver_1.WebElementPromise(this.getDriver(), findClosestHelper(this.getDriver(), this, selector));
    },
    doClick() {
        return new selenium_webdriver_1.WebElementPromise(this.getDriver(), this.click().then(() => this));
    },
    doSendKeys(...args) {
        return new selenium_webdriver_1.WebElementPromise(this.getDriver(), this.sendKeys(...args).then(() => this));
    },
    doSubmit() {
        return new selenium_webdriver_1.WebElementPromise(this.getDriver(), this.submit().then(() => this));
    },
    doClear() {
        return new selenium_webdriver_1.WebElementPromise(this.getDriver(), this.clear().then(() => this));
    },
    value() {
        return this.getAttribute('value');
    },
    async describe() {
        const [elemId, id, tagName, classAttr] = await Promise.all([
            this.getId(), this.getAttribute('id'), this.getTagName(), this.getAttribute('class'),
        ]);
        const idStr = id ? '#' + id : '';
        const classes = classAttr ? '.' + classAttr.replace(/ /g, '.') : '';
        return `${tagName}${idStr}${classes}[${elemId}]`;
    },
    async rect() {
        return new WebElementRect(await this.getRect());
    },
    mouseMove(params = {}) {
        const p = this.getDriver().withActions((actions) => actions.move(Object.assign({ origin: this }, params)));
        return new selenium_webdriver_1.WebElementPromise(this.getDriver(), p.then(() => this));
    },
    async hasFocus() {
        const active = this.getDriver().switchTo().activeElement();
        const [a, b] = await Promise.all([this.getId(), active.getId()]);
        return a === b;
    },
    async isPresent() {
        try {
            // We use getTagName() to capture both not-found errors and stale-element errors (getId()
            // does not make a browser call and does not detect staleness.)
            await this.getTagName();
            return true;
        }
        catch (e) {
            if (e.name === 'NoSuchElementError' || e.name === 'StaleElementReferenceError') {
                return false;
            }
            throw e;
        }
    },
    async index() {
        return this.getDriver().executeScript(function (elem) {
            return Array.prototype.indexOf.call(elem.parentElement.children, elem);
        }, this);
    },
    async matches(selector) {
        return this.getDriver().executeScript(function (elem, _sel) {
            return elem.matches(_sel);
        }, this, selector);
    },
});
//# sourceMappingURL=webdriver-plus.js.map
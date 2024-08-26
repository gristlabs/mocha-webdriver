import { Actions, WebElement, WebElementPromise } from 'selenium-webdriver';
import { LogType } from './logs';
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
    findWait(selector: string, timeoutMSec: number, message?: string): WebElementPromise;
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
    findContent(selector: string, contentRE: RegExp | string): WebElementPromise;
    /**
     * Shorthand to wait for an element containing specific innerText matching the given regex to be present.
     */
    findContentWait(selector: string, contentRE: RegExp | string, timeoutMSec: number, message?: string): WebElementPromise;
}
declare module "selenium-webdriver" {
    /**
     * Enhanced WebDriver with shorthand find*() methods.
     */
    interface WebDriver extends IFindInterface {
        mouseDown(button?: number): Promise<void>;
        mouseUp(button?: number): Promise<void>;
        mouseMoveBy(params?: {
            x?: number;
            y?: number;
        }): Promise<void>;
        sendKeys(...keys: string[]): Promise<void>;
        withActions(cb: (actions: Actions) => void): Promise<void>;
        /**
         * Takes a screenshot, and saves it to MW_SCREENSHOT_DIR/screenshot-{N}.png if the
         * MW_SCREENSHOT_DIR environment variable is set.
         *
         * - relPath may specify a different destination filename, relative to MW_SCREENSHOT_DIR.
         * - relPath may include "{N}" token, to replace with "1", "2", etc to find an available name.
         * - dir may specify a different destination directory. If empty, the screenshot will be skipped.
         */
        saveScreenshot(relPath?: string, dir?: string): Promise<string | undefined>;
        /**
         * Fetches new log messages (since last such call) for the given LogType (e.g. "browser" or
         * "driver"), converting it to a list of human-friendly strings.
         */
        fetchLogs(logType: LogType): Promise<string[]>;
    }
    /**
     * Enhanced WebElement, with shorthand find*() methods, and chainable do*() methods.
     */
    interface WebElement extends IFindInterface {
        findClosest(selector: string): WebElementPromise;
        doClick(): WebElementPromise;
        doSendKeys(...args: string[]): WebElementPromise;
        doSubmit(): WebElementPromise;
        doClear(): WebElementPromise;
        value(): Promise<string>;
        describe(): Promise<string>;
        getRect(): Promise<{
            width: number;
            height: number;
            x: number;
            y: number;
        }>;
        rect(): Promise<ClientRect>;
        mouseMove(params?: {
            x?: number;
            y?: number;
        }): WebElementPromise;
        hasFocus(): Promise<boolean>;
        isPresent(): Promise<boolean>;
        index(): Promise<number>;
        matches(selector: string): Promise<boolean>;
    }
    interface Capabilities {
        getBrowserName(): string | undefined;
        getPlatform(): string | undefined;
    }
}

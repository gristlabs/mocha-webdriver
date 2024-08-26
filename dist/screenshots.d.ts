import { WebDriver } from './index';
/**
 * Uses driver to take a screenshot, and saves it to MOCHA_WEBDRIVER_LOGDIR/screenshot-{N}.png if the
 * MOCHA_WEBDRIVER_LOGDIR environment variable is set.
 *
 * - relPath may specify a different destination filename, relative to MOCHA_WEBDRIVER_LOGDIR.
 * - relPath may include "{N}" token, to replace with "1", "2", etc to find an available name.
 * - dir may specify a different destination directory. If empty, the screenshot will be skipped.
 *
 * This implementation is publicly available as driver.saveScreenshot().
 */
export declare function driverSaveScreenshot(this: WebDriver, relPath?: string, dir?: string | undefined): Promise<string | undefined>;

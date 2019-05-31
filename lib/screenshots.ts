/**
 * Helper functions for taking screenshots with webdriver.
 */
import * as fse from 'fs-extra';
import * as path from 'path';
import {WebDriver} from './index';
import {createNumberedFile} from './numbered-file';

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
export async function driverSaveScreenshot(
  this: WebDriver, relPath = "screenshot-{N}.png", dir = process.env.MOCHA_WEBDRIVER_LOGDIR
): Promise<string|undefined> {
  if (dir) {
    const imageData = await this.takeScreenshot();
    const pathTemplate = path.resolve(dir, relPath);
    await fse.mkdirp(path.dirname(pathTemplate));
    const imagePath = await createNumberedFile(pathTemplate);
    await fse.writeFile(imagePath, imageData, "base64");
    return imagePath;
  }
}

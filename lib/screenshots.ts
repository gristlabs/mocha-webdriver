/**
 * Helper functions for taking screenshots with webdriver.
 */
import * as fse from 'fs-extra';
import * as path from 'path';
import {driver, WebDriver} from './index';

/**
 * Uses driver to take a screenshot, and saves it to MW_SCREENSHOT_DIR/screenshot-{N}.png if the
 * MW_SCREENSHOT_DIR environment variable is set.
 *
 * - relPath may specify a different destination filename, relative to MW_SCREENSHOT_DIR.
 * - relPath may include "{N}" token, to replace with "1", "2", etc to find an available name.
 * - dir may specify a different destination directory. If empty, the screenshot will be skipped.
 *
 * This implementation is publicly available as driver.saveScreenshot().
 */
export async function driverSaveScreenshot(
  this: WebDriver, relPath = "screenshot-{N}.png", dir = process.env.MW_SCREENSHOT_DIR
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

// For {N} replacements below, don't try beyond N=1000. Running into it indicates a likely bug
// somewhere, or a very inefficient solution. If you ever legitimately need so many unique files,
// use a different solution (probably mktemp-like).
const MAX_N_TOKEN = 1000;

/**
 * Create a file according to template, replacing "{N}" token with a numeric suffix. For example,
 * "hello-{N}.txt" will attempt creating files named "hello-1.txt", "hello-2.txt", etc. until it
 * finds a name that doesn't yet exist. Returns the path of the newly created empty file.
 *
 * If the template contains no special token, uses the template as the path itself, succeeding
 * whether or not it exists.
 */
async function createNumberedFile(template: string): Promise<string> {
  const TOKEN = "{N}";
  if (!template.includes(TOKEN)) {
    // If file doesn't exist, create it, and return the path.
    await fse.close(await fse.open(template, 'w'));
    return template;
  }

  for (let n = 1; ; n++) {
    const fullName = template.replace(TOKEN, String(n));
    try {
      // Use "x" flag (O_EXCL) to get EEXIST error if file already exists. This avoids race
      // conditions, compared to solutions such as with fs.stat().
      await fse.close(await fse.open(fullName, 'wx'));
      return fullName;
    } catch (err) {
      if (err.code === 'EEXIST' && n < MAX_N_TOKEN) { continue; }
      throw err;
    }
  }
}

/**
 * Adds an afterEach() hook to the current test suite to capture screenshots after failed tests.
 * Screenshots are only taken if MW_SCREENSHOT_DIR is set, and saved as
 * screenshot-{testName}-{N}.png files in that directory.
 *
 * This should be called at suite level, not at root level (as this hook is only suitable for some
 * kinds of mocha tests, namely those using webdriver).
 */
export function setupScreenshots() {
  afterEach(async function() {
    if (this.runnable().parent!.root) {
      throw new Error("setupSnapshots() should be called at suite level, not at root level");
    }

    // Take snapshots after each failed test case.
    const test = this.currentTest!;
    if (test.state !== 'passed' && !test.pending) {
      // If test filename is available, name screenshots as "screenshot-testName-N.png"
      const testName = test.file ? "-" + path.basename(test.file, path.extname(test.file)) : "";
      // This is a no-op if MW_SCREENSHOT_DIR is not set.
      await driver.saveScreenshot(`screenshot${testName}-{N}.png`);
    }
  });
}

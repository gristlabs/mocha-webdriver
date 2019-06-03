/**
 * Functions to aid debugging, such as for saving screenshots and logs.
 */
import * as path from 'path';
import {driver} from './index';
import {getEnabledLogTypes, saveLogs} from './logs';

/**
 * Adds an afterEach() hook to the current test suite to save logs and screenshots after failed
 * tests. These are saved only if `MOCHA_WEBDRIVER_LOGDIR` variable is set, and named:
 *  - MOCHA_WEBDRIVER_LOGDIR/{testBaseName}-{logtype}.log
 *  - MOCHA_WEBDRIVER_LOGDIR/{testBaseName}-screenshot-{N}.png
 *
 * This should be called at suite level, not at root level (as this hook is only suitable for some
 * kinds of mocha tests, namely those using webdriver).
 */
export function enableDebugCapture() {
  beforeEach(async function() {
    if (this.runnable().parent!.root) {
      throw new Error("enableDebugCapture() should be called at suite level, not at root level");
    }

    // Fetches logs without saving them, in effect discarding all messages so far, so that the
    // saveLogs() call in afterEach() gets only the messages created during this test case.
    if (process.env.MOCHA_WEBDRIVER_LOGDIR) {
      for (const logType of getEnabledLogTypes()) {
        await driver.fetchLogs(logType);
      }
    }
  });

  afterEach(async function() {
    // Take snapshots after each failed test case.
    const test = this.currentTest!;
    if (test.state !== 'passed' && !test.pending) {
      // If test filename is available, name screenshots as "screenshot-testName-N.png"
      const testName = test.file ? path.basename(test.file, path.extname(test.file)) : "unnamed";
      if (process.env.MOCHA_WEBDRIVER_LOGDIR) {
        await driver.saveScreenshot(`${testName}-screenshot-{N}.png`);
        for (const logType of getEnabledLogTypes()) {
          const messages = await driver.fetchLogs(logType);
          await saveLogs(messages, `${testName}-${logType}-{N}.log`);
        }
      }
    }
  });
}

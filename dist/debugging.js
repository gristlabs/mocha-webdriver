"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enableDebugCapture = void 0;
/**
 * Functions to aid debugging, such as for saving screenshots and logs.
 */
const path = require("path");
const index_1 = require("./index");
const logs_1 = require("./logs");
function getTestSuiteHierarchy(test) {
    const suites = [];
    let parent = test.parent;
    while (parent) {
        suites.push(parent);
        parent = parent.parent;
    }
    return suites;
}
function sanitizeStringForFilename(name) {
    return name
        .replace(/\s/g, '-')
        .replace(/[^A-Za-z0-9]/g, '');
}
function getFilePrefixForTest(test) {
    const fileName = sanitizeStringForFilename(test.file ? path.basename(test.file, path.extname(test.file)) : "");
    const suiteNames = getTestSuiteHierarchy(test)
        .map((suite) => sanitizeStringForFilename(suite.title.trim()))
        .filter((suite) => suite);
    return `${fileName}-${suiteNames.join('-')}`;
}
function suiteHasTestFailures(suite) {
    const thisSuiteHasFailures = suite.tests.some((test) => test.isFailed());
    const nestedSuitesHaveFailures = suite.suites.some((childSuite) => suiteHasTestFailures(childSuite));
    return thisSuiteHasFailures || nestedSuitesHaveFailures;
}
/**
 * Adds an afterEach() hook to the current test suite to save logs and screenshots after failed
 * tests. These are saved only if `MOCHA_WEBDRIVER_LOGDIR` variable is set, and named:
 *  - MOCHA_WEBDRIVER_LOGDIR/{testBaseName}-{logtype}.log
 *  - MOCHA_WEBDRIVER_LOGDIR/{testBaseName}-screenshot-{N}.png
 *
 * This should be called at suite level, not at root level (as this hook is only suitable for some
 * kinds of mocha tests, namely those using webdriver).
 */
function enableDebugCapture() {
    beforeEach(async function () {
        if (this.runnable().parent.root) {
            throw new Error("enableDebugCapture() should be called at suite level, not at root level");
        }
        // Fetches logs without saving them, in effect discarding all messages so far, so that the
        // saveLogs() call in afterEach() gets only the messages created during this test case.
        if (process.env.MOCHA_WEBDRIVER_LOGDIR) {
            for (const logType of (0, logs_1.getEnabledLogTypes)()) {
                await index_1.driver.fetchLogs(logType);
            }
        }
    });
    afterEach(async function () {
        // Take snapshots after each failed test case.
        const test = this.currentTest;
        if (test.state !== 'passed' && !test.pending) {
            const filePrefix = getFilePrefixForTest(test);
            if (process.env.MOCHA_WEBDRIVER_LOGDIR) {
                await index_1.driver.saveScreenshot(`${filePrefix}-screenshot-{N}.png`);
                for (const logType of (0, logs_1.getEnabledLogTypes)()) {
                    const messages = await index_1.driver.fetchLogs(logType);
                    await (0, logs_1.saveLogs)(messages, `${filePrefix}-${logType}-{N}.log`);
                }
            }
        }
    });
    after(async function () {
        // Dump any remaining log files. Certain error cases leave lingering logs, such as errors in before()
        // Retrieve the test suite the current after() hook is installed in.
        const hook = this.test;
        const suite = hook === null || hook === void 0 ? void 0 : hook.parent;
        if (!suite) {
            return;
        }
        const shouldSaveLogs = suiteHasTestFailures(suite) && process.env.MOCHA_WEBDRIVER_LOGDIR;
        if (shouldSaveLogs) {
            const filePrefix = getFilePrefixForTest(hook);
            for (const logType of (0, logs_1.getEnabledLogTypes)()) {
                const messages = await index_1.driver.fetchLogs(logType);
                // Only save if there's messages, as there's potential for a lot of empty files here.
                if (messages.length > 0) {
                    await (0, logs_1.saveLogs)(messages, `${filePrefix}-afterSuiteCompleted-${logType}-{N}.log`);
                }
            }
        }
    });
}
exports.enableDebugCapture = enableDebugCapture;
//# sourceMappingURL=debugging.js.map
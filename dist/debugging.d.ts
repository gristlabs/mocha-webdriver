/**
 * Adds an afterEach() hook to the current test suite to save logs and screenshots after failed
 * tests. These are saved only if `MOCHA_WEBDRIVER_LOGDIR` variable is set, and named:
 *  - MOCHA_WEBDRIVER_LOGDIR/{testBaseName}-{logtype}.log
 *  - MOCHA_WEBDRIVER_LOGDIR/{testBaseName}-screenshot-{N}.png
 *
 * This should be called at suite level, not at root level (as this hook is only suitable for some
 * kinds of mocha tests, namely those using webdriver).
 */
export declare function enableDebugCapture(): void;

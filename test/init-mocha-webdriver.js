"use strict";

// Enable enhanced stacktraces by default. Disable by running with MOCHA_WEBDRIVER_STACKTRACES="".
if (process.env.MOCHA_WEBDRIVER_STACKTRACES === undefined) {
  process.env.MOCHA_WEBDRIVER_STACKTRACES = "1";
}

// Don't fail on mismatched Chrome versions. Disable with MOCHA_WEBDRIVER_IGNORE_CHROME_VERSION="".
if (process.env.MOCHA_WEBDRIVER_IGNORE_CHROME_VERSION === undefined) {
  process.env.MOCHA_WEBDRIVER_IGNORE_CHROME_VERSION = "1";
}

// Default to chrome for mocha-webdriver testing. Override by setting SELENIUM_BROWSER, as usual.
if (!process.env.SELENIUM_BROWSER) {
  process.env.SELENIUM_BROWSER = "chrome";
}

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

if (process.env.USE_SAUCE_LABS) {
  const {setOptionsModifyFunc} = require('../lib/options');

  const {SAUCE_USERNAME, SAUCE_ACCESS_KEY} = process.env;
  if (!SAUCE_USERNAME) { console.log("SAUCE_USERNAME env var not set"); process.exit(1); }
  if (!SAUCE_ACCESS_KEY) { console.log("SAUCE_ACCESS_KEY env var not set"); process.exit(1); }

  process.env.SELENIUM_REMOTE_URL =
    `https://${SAUCE_USERNAME}:${SAUCE_ACCESS_KEY}@ondemand.us-west-1.saucelabs.com:443/wd/hub`;

  setOptionsModifyFunc(({capabilities, chromeOpts, firefoxOpts}) => {
    Object.assign(capabilities, {
      "idleTimeout": "900",
      "tunnelIdentifier": process.env.TRAVIS_JOB_NUMBER,
      "recordScreenshots": "false",
      "recordVideo": "false",
    });
  });
}

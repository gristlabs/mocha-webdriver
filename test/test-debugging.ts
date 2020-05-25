import {assert, driver} from '../lib';

describe('debugging', function() {
  this.timeout(20000);

  before(async function() {
    // We can't really test the setting of MOCHA_WEBDRIVER_LOGTYPES here because it affects how
    // the browser driver is initialized on startup.
    await driver.get('about:blank');
  });

  it('should fetch requested types of logs', async function() {
    // tslint:disable-next-line:no-console
    await driver.executeScript(() => console.log("Hello world!"));

    const logsDriver = await driver.fetchLogs('driver');
    assert.isArray(logsDriver);
    assert.match(logsDriver.join("\n"), /Hello world!/);

    const logsBrowser = await driver.fetchLogs('browser');
    assert.isArray(logsBrowser);
    assert.match(logsBrowser.join("\n"), /Hello world!/);
  });
});

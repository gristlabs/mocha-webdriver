import * as path from 'path';
import {assert, createDriver, enableDebugCapture, setOptionsModifyFunc} from '../lib';

describe('createDriver', () => {
  enableDebugCapture();

  function createDom(name: string) {
    document.body.innerHTML = `<h1>${name}</h1>`;
  }

  it('can create multiple drivers', async function() {
    this.timeout(20000);
    const driver1 = await createDriver();
    const driver2 = await createDriver();
    try {
      await driver1.get('file://' + path.resolve(__dirname, 'blank.html'));
      await driver2.get('file://' + path.resolve(__dirname, 'blank.html'));
      await driver1.executeScript(createDom, 'driver1');
      await driver2.executeScript(createDom, 'driver2');
      await driver1.findContentWait('body', 'driver1', 1000);
      await driver2.findContentWait('body', 'driver2', 1000);
    } finally {
      await driver1.quit();
      await driver2.quit();
    }
  });

  it('can set custom driver options', async function() {
    if (process.env.SELENIUM_BROWSER !== 'chrome') { this.skip(); }
    this.timeout(20000);
    const driver = await createDriver({
      extraArgs: ['user-agent=notscape']
    });
    try {
      await driver.get('file://' + path.resolve(__dirname, 'blank.html'));
      const userAgent = await driver.executeScript('return navigator.userAgent');
      assert.equal(userAgent, 'notscape');
    } finally {
      await driver.quit();
    }
  });

  describe('setOptionsModifyFunc', function() {
    this.timeout(20000);

    after(async function() {
      setOptionsModifyFunc(null);
    });

    it('should support customizing driver options', async function() {
      setOptionsModifyFunc(({chromeOpts, firefoxOpts}) => {
        chromeOpts.addArguments('--user-agent=Bond007');
        // Typings in selenium-webdriver are wrong at the moment.
        (firefoxOpts as any).setPreference('general.useragent.override', "Bond007");
      });
      const driver = await createDriver();
      try {
        await driver.get('file://' + path.resolve(__dirname, 'blank.html'));
        assert.equal(await driver.executeScript('return navigator.userAgent'), "Bond007");
      } finally {
        await driver.quit();
      }
    });
  });
});

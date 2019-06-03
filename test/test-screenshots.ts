import * as fse from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import {assert, driver} from '../lib';

describe('screenshots', function() {
  let tmpDir: string;
  let origScreenshotDir: string|undefined;

  before(async function() {
    tmpDir = await fse.mkdtemp(path.join(os.tmpdir(), 'test-mw-screenshots-'));
    origScreenshotDir = process.env.MOCHA_WEBDRIVER_LOGDIR;
    await driver.get('file://' + path.resolve(__dirname, 'blank.html'));
  });

  after(async function() {
    // Restore the original value of the env var, in case we have other tests and care about it.
    if (origScreenshotDir === undefined) {
      delete process.env.MOCHA_WEBDRIVER_LOGDIR;
    } else {
      process.env.MOCHA_WEBDRIVER_LOGDIR = origScreenshotDir;
    }

    // Check what we are removing, just to be safe.
    if (tmpDir && tmpDir.includes("screenshots")) {
      await fse.remove(tmpDir);
    }
  });

  it('should save screenshots when MOCHA_WEBDRIVER_LOGDIR is set', async function() {
    process.env.MOCHA_WEBDRIVER_LOGDIR = tmpDir;

    const path1 = await driver.saveScreenshot();
    assert.equal(path1, path.join(tmpDir, "screenshot-1.png"));
    const path2 = await driver.saveScreenshot();
    assert.equal(path2, path.join(tmpDir, "screenshot-2.png"));
    assert.equal(await fse.pathExists(path1!), true);
    assert.equal(await fse.pathExists(path2!), true);
  });

  it('should respect relPath argument when saving screenshots', async function() {
    this.timeout(10000);
    process.env.MOCHA_WEBDRIVER_LOGDIR = tmpDir;

    {
      const p = await driver.saveScreenshot('foo.png');
      assert.equal(p, path.join(tmpDir, "foo.png"));
      assert.equal(await fse.pathExists(p!), true);
    }

    {
      // Should work again with no errors (even though foo.png exists)
      const p = await driver.saveScreenshot('foo.png');
      assert.equal(p, path.join(tmpDir, "foo.png"));
      assert.equal(await fse.pathExists(p!), true);
    }

    {
      // Should create subdirs, and replace {N} token.
      const p = await driver.saveScreenshot('foo/bar{N}');
      assert.equal(p, path.join(tmpDir, "foo/bar1"));
      assert.equal(await fse.pathExists(p!), true);
    }

    {
      // Should respect {N} token when files already exist
      await driver.saveScreenshot('foo/bar{N}');
      await driver.saveScreenshot('foo/bar{N}');
      const p = await driver.saveScreenshot('foo/bar{N}');
      assert.equal(p, path.join(tmpDir, "foo/bar4"));
      assert.equal(await fse.pathExists(p!), true);
    }
  });

  it('should not save screenshots when MOCHA_WEBDRIVER_LOGDIR is unset', async function() {
    delete process.env.MOCHA_WEBDRIVER_LOGDIR;

    const origFiles = await fse.readdir(tmpDir);
    const path1 = await driver.saveScreenshot();
    assert.equal(path1, undefined);
    assert.deepEqual(await fse.readdir(tmpDir), origFiles);
  });

  it('should save screenshots when dir is given, even with MOCHA_WEBDRIVER_LOGDIR unset', async function() {
    delete process.env.MOCHA_WEBDRIVER_LOGDIR;

    const path1 = await driver.saveScreenshot(undefined, path.join(tmpDir, "forced"));
    assert.equal(path1, path.join(tmpDir, "forced/screenshot-1.png"));
    assert.equal(await fse.pathExists(path1!), true);
  });
});

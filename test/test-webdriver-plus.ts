import * as path from 'path';
import {assert, driver} from '../src';

// TODO: do NOT use  about:blank, but some real blank page from FS.

describe('webdriver-plus', () => {
  describe('find methods', function() {
    function createDom() {
      document.body.innerHTML = `
        <div id="id1">
          Hello,
          <span class="cls1">World!</span>
          <div class="cls1">
            <button class="cls2">OK</button>
          </div>
        </div>
        <div id="id2">
          <div class="cls1">Bye</div>
        </div>
      `;
    }

    before(async function() {
      this.timeout(20000);
      await driver.get('file://' + path.resolve(__dirname, 'blank.html'));
      await driver.executeScript(createDom);
    });

    it('should find first match with driver.find()', async function() {
      assert.equal(await driver.find('.cls1').getText(), 'World!');
      assert.equal(await driver.find('#id1 div.cls1').getText(), 'OK');
    });

    it('should find first child with element.find()', async function() {
      const elem = await driver.find('#id2');
      assert.equal(await elem.find('.cls1').getText(), 'Bye');
    });

    it('should find all matches with driver.findAll()', async function() {
      const elems = await driver.findAll('.cls1');
      assert.deepEqual(await Promise.all(elems.map((e) => e.getText())), ['World!', 'OK', 'Bye']);
    });

    it('should find all children with element.findAll()', async function() {
      const root = await driver.find("#id1");
      const elems = await root.findAll('.cls1');
      assert.deepEqual(await Promise.all(elems.map((e) => e.getText())), ['World!', 'OK']);
    });

    it('should find matching content with driver.findContent()', async function() {
      assert.equal(await driver.findContent('.cls1', /B/).getText(), 'Bye');
      assert.equal(await driver.findContent('.cls1', /K$/).getText(), 'OK');
      await assert.isRejected(driver.findContent('.cls1', /^K/).getText(), /None.*match/);
    });

    it('should find matching content among children with element.findContent()', async function() {
      const root = await driver.find("#id1");
      await assert.isRejected(root.findContent('.cls1', /B/).getText(), /None.*match/);
      assert.equal(await root.findContent('.cls1', /K$/).getText(), 'OK');
    });
  });

  describe('WebElement', function() {
    function createDom() {
      document.body.innerHTML = `
        <div id="id1" class="cls0 test0">
          <input id="inp" type="text">
        </div>
      `;
    }
    before(async function() {
      this.timeout(20000);
      await driver.get('file://' + path.resolve(__dirname, 'blank.html'));
      await driver.executeScript(createDom);
    });

    it('should support value() shorthand', async function() {
      const inp = await driver.find('#inp');
      assert.equal(await inp.value(), "");
      await inp.sendKeys("hello");
      assert.equal(await inp.value(), "hello");
      await inp.clear();
      assert.equal(await inp.value(), "");
    });

    it('should allow chaining calls', async function() {
      const inp = await driver.find('#inp');
      await inp.doClick().doClear().doSendKeys('world');
      assert.equal(await inp.value(), "world");
      await inp.doClear().doSendKeys('x', 'y', 'z');
      assert.equal(await inp.value(), "xyz");
    });

    it('should return something useful in describe()', async function() {
      assert.match(await driver.find('#inp').describe(), /input#inp\[.*\]/);
      assert.match(await driver.find('#id1').describe(), /div#id1.cls0.test0\[.*\]/);
    });
  });
});

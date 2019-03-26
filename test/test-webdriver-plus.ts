import {get as getColor} from 'color-string';
import * as path from 'path';
import {Key, WebElement} from 'selenium-webdriver';
import {assert, driver} from '../lib';

describe('webdriver-plus', () => {
  describe('find methods', function() {
    function createDom() {
      document.body.innerHTML = `
        <div id="id1">
          Hello<span class="comma">, </span>
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
      assert.deepEqual(await Promise.all(elems.map((e: WebElement) => e.getText())), ['World!', 'OK', 'Bye']);
      const elemsMapped = await driver.findAll('.cls1', (e: WebElement) => e.getText());
      assert.deepEqual(elemsMapped, ['World!', 'OK', 'Bye']);
    });

    it('should find all children with element.findAll()', async function() {
      const root = await driver.find("#id1");
      const elems = await root.findAll('.cls1');
      assert.deepEqual(await Promise.all(elems.map((e: WebElement) => e.getText())), ['World!', 'OK']);
      const elemsMapped = await root.findAll('.cls1', (e: WebElement) => e.getText());
      assert.deepEqual(elemsMapped, ['World!', 'OK']);
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

    it('should support mouse methods', async function() {
      // It's hard to test mouse motion: we do it here by using the mouse to perform text
      // selection, which we can then check with the help of executeScript().
      await driver.find(".comma").mouseMove();
      await driver.mouseDown();
      await driver.mouseMoveBy({x: 200});
      await driver.mouseUp();
      assert.equal(await driver.executeScript(() => window.getSelection().toString().trim()), "World!");
    });
  });

  describe('WebElement', function() {
    function createDom() {
      document.body.innerHTML = `
        <style>#btn:hover { background-color: pink; color: green; }</style>
        <div id="id1" class="cls0 test0">
          <input id="inp" type="text">
          <button id="btn">Hello</button>
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

    it('should fix issue with getRect swallowing errors', async function() {
      assert.containsAllKeys(await driver.find('#inp').getRect(), ['x', 'y']);
      await assert.isRejected(driver.find('#non-existent').getRect(), /Unable to locate/);
    });

    it('should return ClientRect using rect() method', async function() {
      const r = await driver.find('#inp').rect();
      assert.isAbove(r.left, 0);
      assert.isAbove(r.width, 0);
      assert.isAbove(r.top, 0);
      assert.isAbove(r.height, 0);
      assert.equal(r.left + r.width, r.right);
      assert.equal(r.top + r.height, r.bottom);
    });

    it('should move mouse to an element using mouseMove() method', async function() {
      assert.deepEqual(getColor(await driver.find('#btn').getCssValue('color')), getColor('black'));
      await driver.find('#btn').mouseMove();
      assert.deepEqual(getColor(await driver.find('#btn').getCssValue('color')), getColor('green'));
      await driver.find('#btn').mouseMove({x: 100});
      assert.deepEqual(getColor(await driver.find('#btn').getCssValue('color')), getColor('black'));
    });

    it('should support hasFocus', async function() {
      await driver.find('#inp').click();
      assert.equal(await driver.find('#inp').hasFocus(), true);
      assert.equal(await driver.find('#btn').hasFocus(), false);
      await driver.sendKeys(Key.TAB);
      assert.equal(await driver.find('#inp').hasFocus(), false);
      assert.equal(await driver.find('#btn').hasFocus(), true);
    });

    it('should support isPresent', async function() {
      assert.equal(await driver.find('#btn').isPresent(), true);
      assert.equal(await driver.find('#non-existent').isPresent(), false);
      assert.equal(await driver.find('#btn').find('.zzzz').isPresent(), false);
      assert.equal(await driver.findContent('#btn', /Hello/).isPresent(), true);
      assert.equal(await driver.findContent('#btn', /Bonjour/).isPresent(), false);
    });
  });
});

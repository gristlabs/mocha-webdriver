import {get as getColor} from 'color-string';
import {Key, WebElement} from 'selenium-webdriver';
import {assert, driver, enableDebugCapture} from '../lib';

function addDom(id: string, parentId?: string) {
  const parentElem = parentId ? document.getElementById(parentId) : document.body;
  if (parentElem) {
    const elem = document.createElement('div');
    elem.innerHTML += `<div id="${id}">Foo</div>`;
    parentElem.appendChild(elem.firstChild!);
  } else {
    throw new Error(`Failed to find element with id "${parentId}"`);
  }
}

// Calls addDom with a delay, ensuring that the element is not present before it is added.
async function addDomDelayed(waitMs: number, id: string, parentId?: string) {
  await new Promise((r) => setTimeout(r, waitMs));
  assert.equal(await driver.find(`#${id}`).isPresent(), false);
  return driver.executeScript(addDom, id, parentId);
}

describe('webdriver-plus', function() {
  this.timeout(20000);
  enableDebugCapture();

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
      await driver.get('about:blank');
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

    it('should wait for match with driver.findWait()', async function() {
      // Start waiting for the component being added, then add it after 10ms.
      const addAsync = addDomDelayed(10, 'waitForIt');
      const [elemText] = await Promise.all([driver.findWait('#waitForIt', 3000).getText(), addAsync]);
      assert.equal(elemText, 'Foo');
    });

    it('should wait for child match with element.findWait()', async function() {
      const root = await driver.find('#id1');
      // Start waiting for the component being added, then add it after 10ms.
      const addAsync = addDomDelayed(10, 'elemWaitForIt', 'id1');
      const [elemText] = await Promise.all([root.findWait('#elemWaitForIt', 3000).getText(), addAsync]);
      assert.equal(elemText, 'Foo');
    });

    it('should find matching content with driver.findContent()', async function() {
      assert.equal(await driver.findContent('.cls1', /B/).getText(), 'Bye');
      assert.equal(await driver.findContent('.cls1', /K$/).getText(), 'OK');
      await assert.isRejected(driver.findContent('.cls1', /^K/).getText(), /No elements match/);
    });

    it('should find matching content among children with element.findContent()', async function() {
      const root = await driver.find("#id1");
      await assert.isRejected(root.findContent('.cls1', /B/).getText(), /No elements match/);
      assert.equal(await root.findContent('.cls1', /K$/).getText(), 'OK');
    });

    it('should wait for matching content with driver.findContentWait()', async function() {
      // Start waiting for the component being added, then add it after 10ms.
      const addAsync = addDomDelayed(10, 'waitForContent');
      const waitAsync = driver.findContentWait('#waitForContent', /Foo/, 3000).getText();
      const [elemText] = await Promise.all([waitAsync, addAsync]);
      assert.equal(elemText, 'Foo');
    });

    it('should wait for child content match with element.findContentWait()', async function() {
      const root = await driver.find('#id1');
      // Start waiting for the component being added, then add it after 10ms.
      const addAsync = addDomDelayed(10, 'elemWaitForContent', 'id1');
      const waitAsync = root.findContentWait('#elemWaitForContent', /Foo/, 3000).getText();
      const [elemText] = await Promise.all([waitAsync, addAsync]);
      assert.equal(elemText, 'Foo');
    });

    it('should support flags in regex', async function() {
      assert.equal(await driver.findContent('.cls1', /b/i).getText(), 'Bye');
      assert.equal(await driver.findContent('.cls1', /k$/i).getText(), 'OK');
    });

    it('should support matching string with driver.findContent()', async function() {
      assert.equal(await driver.findContent('.cls1', 'OK').getText(), 'OK');
      assert.equal(await driver.findContent('.cls1', '!').getText(), 'World!');
    });

    it('should find the closest matching ancestor with element.findClosest()', async function() {
      const child = await driver.find(".cls2");
      await assert.match(await child.findClosest('#id1').getText(), /Hello/);
      await assert.isRejected(child.findClosest('#id2'), /No ancestor elements match/);
      await assert.equal(await child.findClosest('#id2').isPresent(), false);
    });

    it('should support mouse methods', async function() {
      // It's hard to test mouse motion: we do it here by using the mouse to perform text
      // selection, which we can then check with the help of executeScript().
      await driver.find(".comma").mouseMove();
      await driver.mouseDown();
      await driver.mouseMoveBy({x: 200});
      await driver.mouseUp();
      assert.equal(await driver.executeScript(() => window.getSelection()!.toString().trim()), "World!");
    });
  });

  describe('WebElement', function() {
    function createDom() {
      document.body.innerHTML = `
        <style>#btn { color: black; } #btn:hover { background-color: pink; color: green; }</style>
        <div id="id1" class="cls0 test0">
          <input id="inp" type="text">
          <button id="btn">Hello</button>
        </div>
        <div id="container">
          Hello
          <span class="foo">Hello</span>
          <span class="bar1"><div class="bar2">World!</div></span>
          Text
          <!-- comment -->
          <div class="baz">World!</div>
          Text
          <span class="boo">!</span>
        </div>
      `;
    }
    before(async function() {
      this.timeout(20000);
      await driver.get('about:blank');
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

      // See also the test case for matches(), which shows how .matches(':focus') can be used for
      // the same purpose.
    });

    it('should support isPresent', async function() {
      assert.equal(await driver.find('#btn').isPresent(), true);
      assert.equal(await driver.find('#non-existent').isPresent(), false);
      assert.equal(await driver.find('#btn').find('.zzzz').isPresent(), false);
      assert.equal(await driver.findContent('#btn', /Hello/).isPresent(), true);
      assert.equal(await driver.findContent('#btn', /Bonjour/).isPresent(), false);

      // isPresent() should return false for stale elements.
      await addDomDelayed(0, "acorn");
      const acorn = await driver.findWait("#acorn", 3000);
      assert.equal(await driver.findWait("#acorn", 3000).isPresent(), true);

      // Remove the element from DOM.
      await driver.executeScript(function() { document.getElementById('acorn')!.remove(); });
      assert.equal(await driver.find("#acorn").isPresent(), false);
      assert.equal(await acorn.isPresent(), false);

      // Add another idential element: for old reference, isPresent() should still be false.
      await addDomDelayed(0, "acorn");
      assert.equal(await driver.findWait("#acorn", 3000).isPresent(), true);
      assert.equal(await acorn.isPresent(), false);
    });

    it('should support index() among sibling element', async function() {
      assert.equal(await driver.find('#id1').index(), 1);
      assert.equal(await driver.find('#inp').index(), 0);

      // Check the various children of .children element. Note that we are finding index among
      // sibling Elements, not Nodes, e.g. text nodes and comments are ignored.
      assert.equal(await driver.find('#container .foo').index(), 0);
      assert.equal(await driver.find('#container .bar1').index(), 1);
      assert.equal(await driver.find('#container .baz').index(), 2);
      assert.equal(await driver.find('#container .boo').index(), 3);
      // Note that .bar2 is a sole child of .bar1, not of .container
      assert.equal(await driver.find('#container .bar2').index(), 0);
    });

    it('should support matches() to check a selector match', async function() {
      assert.isTrue(await driver.find('.cls0').matches('div#id1.cls0.test0'));
      assert.isTrue(await driver.find('.cls0').matches('.cls0'));
      assert.isTrue(await driver.find('.cls0').matches(' .cls0 ')); // Whitespace is OK.
      assert.isFalse(await driver.find('.cls0').matches('.cls'));   // Check no substring matches
      assert.isFalse(await driver.find('.cls0').matches('.id1'));
      assert.isTrue(await driver.find('.cls0').matches('#id1'));

      // Try more complex selectors.
      assert.isTrue(await driver.find('.bar2').matches('#container .bar2'));
      assert.isTrue(await driver.find('.bar2').matches('#container > .bar1 > :not(.bar1)'));

      // Should be usable as an alternative way to check focus, using :focus pseudo-class.
      // This replicates the hasFocus() test.
      await driver.find('#inp').click();
      assert.equal(await driver.find('#inp').matches(':focus'), true);
      assert.equal(await driver.find('#btn').matches(':focus'), false);
      await driver.sendKeys(Key.TAB);
      assert.equal(await driver.find('#inp').matches(':focus'), false);
      assert.equal(await driver.find('#btn').matches(':focus'), true);
    });
  });
});

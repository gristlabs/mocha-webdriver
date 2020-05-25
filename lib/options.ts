import * as chrome from 'selenium-webdriver/chrome';
import * as firefox from 'selenium-webdriver/firefox';

export interface IDriverOptions {
  capabilities: {[key: string]: string};
  chromeOpts: chrome.Options;
  firefoxOpts: firefox.Options;
}
export type OptionsModifyFunc = (opts: IDriverOptions) => void;

let _optionsModifyFunc: OptionsModifyFunc|null = null;

/**
 * To modify webdriver options, call this before mocha's before() hook. Your callback will be
 * called on driver creation with an object containing `chromeOpts` and `firefoxOpts`, and can
 * modify them in-place. E.g.
 *
 *    setOptionsModifyFunc(({chromeOpts}) => chromOpts.setUserPreferences({homepage: ...}));
 */
export function setOptionsModifyFunc(modifyFunc: OptionsModifyFunc | null) {
  _optionsModifyFunc = modifyFunc;
}

// Used by createDriver().
export function optionsModifyFunc(opts: IDriverOptions): void {
  if (_optionsModifyFunc) {
    _optionsModifyFunc(opts);
  }
}

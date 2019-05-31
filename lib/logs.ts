import * as fse from 'fs-extra';
import * as path from 'path';

import {WebDriver} from './index';
import {createNumberedFile} from './numbered-file';

// Log types supported by webdriver/
export type LogType = "browser"|"client"|"driver"|"performance"|"server";
export const logTypes: LogType[] = ["browser", "client", "driver", "performance", "server"];

/**
 * This implementation is publicly available as driver.saveScreenshot().
 */
export async function _fetchLogs(this: WebDriver, type: LogType = 'driver'): Promise<string[]> {
  const messages = await this.manage().logs().get(type);
  return messages.map((m) => JSON.stringify(m));
}

// Parses the comma-separated MOCHA_WEBDRIVER_LOGTYPES, and returns the list of LogTypes. Defaults
// to ["browser", "driver"].
export function getEnabledLogTypes(): LogType[] {
  const strTypes = (process.env.MOCHA_WEBDRIVER_LOGTYPES == null) ? "browser,driver" :
    process.env.MOCHA_WEBDRIVER_LOGTYPES;

  const types = strTypes.split(',')
    .map((val) => val.trim().toLowerCase())
    .filter((val) => val) as LogType[];
  for (const t of types) {
    if (!logTypes.includes(t as LogType)) {
      throw new Error(`LogType ${t} invalid`);
    }
  }
  return types;
}

// Saves the given messages to the given file relative to dir. Dir defauts to
// MOCHA_WEBDRIVER_LOGDIR; if empty, no logs will be recorded.
export async function saveLogs(
  messages: string[], relPath: string, dir = process.env.MOCHA_WEBDRIVER_LOGDIR
): Promise<string|undefined> {
  if (dir) {
    const pathTemplate = path.resolve(dir, relPath);
    await fse.mkdirp(path.dirname(pathTemplate));
    const logPath = await createNumberedFile(pathTemplate);
    await fse.writeFile(logPath, messages.join("\n") + "\n", {flag: 'a'});
    return logPath;
  }
}

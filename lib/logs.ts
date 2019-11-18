import * as fse from 'fs-extra';
import * as path from 'path';

import {logging, WebDriver} from './index';
import {createNumberedFile} from './numbered-file';

// Log types supported by webdriver/
export type LogType = "browser"|"client"|"driver"|"performance"|"server";
export const logTypes: LogType[] = ["browser", "client", "driver", "performance", "server"];

/**
 * This implementation is publicly available as driver.fetchLogs().
 */
export async function driverFetchLogs(this: WebDriver, type: LogType = 'driver'): Promise<string[]> {
  try {
    const messages = await this.manage().logs().get(type);
    return messages.map((m) => entryToLine(m));
  } catch (e) {
    if (e.name === 'UnknownCommandError') {
      // Firefox doesn't support logs, so we'll indicate that without failing here.
      return [`ERROR FETCHING LOGS: ${e.message}`];
    }
    throw e;
  }
}

// Convert the log entry into a more human-friendly one-liner.
function entryToLine(entry: logging.Entry) {
  // Produce a human-readable timestamp.
  const timeStr = new Date(entry.timestamp).toISOString();

  // Messages from Chrome have JSON stringified with newlines, making log files awkward to
  // examine. Replace those with spaces.
  const message = entry.message.replace(/\s+/g, ' ').trim();

  return `${timeStr} ${entry.level.name} ${message}`;
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

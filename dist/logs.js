"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveLogs = exports.getEnabledLogTypes = exports.driverFetchLogs = exports.logTypes = void 0;
const fse = require("fs-extra");
const path = require("path");
const numbered_file_1 = require("./numbered-file");
exports.logTypes = ["browser", "client", "driver", "performance", "server"];
/**
 * This implementation is publicly available as driver.fetchLogs().
 */
async function driverFetchLogs(type = 'driver') {
    try {
        const messages = await this.manage().logs().get(type);
        return messages.map((m) => entryToLine(m));
    }
    catch (e) {
        if (e.name === 'UnknownCommandError') {
            // Firefox doesn't support logs, so we'll indicate that without failing here.
            return [`ERROR FETCHING LOGS: ${e.message}`];
        }
        throw e;
    }
}
exports.driverFetchLogs = driverFetchLogs;
// Convert the log entry into a more human-friendly one-liner.
function entryToLine(entry) {
    // Produce a human-readable timestamp.
    const timeStr = new Date(entry.timestamp).toISOString();
    // Messages from Chrome have JSON stringified with newlines, making log files awkward to
    // examine. Replace those with spaces.
    const message = entry.message.replace(/\s+/g, ' ').trim();
    return `${timeStr} ${entry.level.name} ${message}`;
}
// Parses the comma-separated MOCHA_WEBDRIVER_LOGTYPES, and returns the list of LogTypes. Defaults
// to ["browser", "driver"].
function getEnabledLogTypes() {
    const strTypes = (process.env.MOCHA_WEBDRIVER_LOGTYPES == null) ? "browser,driver" :
        process.env.MOCHA_WEBDRIVER_LOGTYPES;
    const types = strTypes.split(',')
        .map((val) => val.trim().toLowerCase())
        .filter((val) => val);
    for (const t of types) {
        if (!exports.logTypes.includes(t)) {
            throw new Error(`LogType ${t} invalid`);
        }
    }
    return types;
}
exports.getEnabledLogTypes = getEnabledLogTypes;
// Saves the given messages to the given file relative to dir. Dir defauts to
// MOCHA_WEBDRIVER_LOGDIR; if empty, no logs will be recorded.
async function saveLogs(messages, relPath, dir = process.env.MOCHA_WEBDRIVER_LOGDIR) {
    if (dir) {
        const pathTemplate = path.resolve(dir, relPath);
        await fse.mkdirp(path.dirname(pathTemplate));
        const logPath = await (0, numbered_file_1.createNumberedFile)(pathTemplate);
        await fse.writeFile(logPath, messages.join("\n") + "\n", { flag: 'a' });
        return logPath;
    }
}
exports.saveLogs = saveLogs;
//# sourceMappingURL=logs.js.map
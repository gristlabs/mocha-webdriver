import { WebDriver } from './index';
export declare type LogType = "browser" | "client" | "driver" | "performance" | "server";
export declare const logTypes: LogType[];
/**
 * This implementation is publicly available as driver.fetchLogs().
 */
export declare function driverFetchLogs(this: WebDriver, type?: LogType): Promise<string[]>;
export declare function getEnabledLogTypes(): LogType[];
export declare function saveLogs(messages: string[], relPath: string, dir?: string | undefined): Promise<string | undefined>;

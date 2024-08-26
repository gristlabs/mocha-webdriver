/**
 * Create a file according to template, replacing "{N}" token with a numeric suffix. For example,
 * "hello-{N}.txt" will attempt creating files named "hello-1.txt", "hello-2.txt", etc. until it
 * finds a name that doesn't yet exist. Returns the path of the newly created empty file.
 *
 * If the template contains no special token, uses the template as the path itself, succeeding
 * whether or not it exists.
 */
export declare function createNumberedFile(template: string): Promise<string>;

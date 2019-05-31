import * as fse from 'fs-extra';

// For {N} replacements below, don't try beyond N=1000. Running into it indicates a likely bug
// somewhere, or a very inefficient solution. If you ever legitimately need so many unique files,
// use a different solution (probably mktemp-like).
const MAX_N_TOKEN = 1000;

/**
 * Create a file according to template, replacing "{N}" token with a numeric suffix. For example,
 * "hello-{N}.txt" will attempt creating files named "hello-1.txt", "hello-2.txt", etc. until it
 * finds a name that doesn't yet exist. Returns the path of the newly created empty file.
 *
 * If the template contains no special token, uses the template as the path itself, succeeding
 * whether or not it exists.
 */
export async function createNumberedFile(template: string): Promise<string> {
  const TOKEN = "{N}";
  if (!template.includes(TOKEN)) {
    // If file doesn't exist, create it, and return the path.
    await fse.close(await fse.open(template, 'w'));
    return template;
  }

  for (let n = 1; ; n++) {
    const fullName = template.replace(TOKEN, String(n));
    try {
      // Use "x" flag (O_EXCL) to get EEXIST error if file already exists. This avoids race
      // conditions, compared to solutions such as with fs.stat().
      await fse.close(await fse.open(fullName, 'wx'));
      return fullName;
    } catch (err) {
      if (err.code === 'EEXIST' && n < MAX_N_TOKEN) { continue; }
      throw err;
    }
  }
}

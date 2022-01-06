import dir from "https://deno.land/x/dir/mod.ts";
import { join, resolve } from "https://deno.land/std/path/mod.ts";
import { parse, Args } from "https://deno.land/std/flags/mod.ts";
import { grepFiles } from './grep.ts';
import { Avfs } from "./avfs.ts";
import { forceArrayArgument } from "./utils.ts";

type Arguments = {
  ['--']: string[],               // arguments to grep after --
  i?: string,                     // -i, --i : input file
  r?: string,                     // -r, --r : regex for grep
  pr?: string | string[],         // --pr : path regex
  fr?: string | string[],         // --fr : filename regex
  v?: string,                     // -v : verbose logging
  er?: string | string[],         // --er : extension regex
} & Args;

const args = parse(Deno.args, { "--": true }) as unknown as Arguments;
const homeDir = dir('home');
if (!homeDir) {
    console.error('[ERR] Could not resolve home directory');
  Deno.exit(1);
}

const avfsDir = join(homeDir, '.avfs');
try {
  await Deno.stat(avfsDir);
} catch(err) {
  console.error(`[ERR] couldn't find avfs mountpoint '${avfsDir}': ${err}`);
  Deno.exit(1);
}

const grepRegex = args.r;
if (!grepRegex) {
  console.error('[ERR] grep regex not provided');
  Deno.exit(1);
}

const providedRootPath = args._.length > 0
  ? `${args._[0]}`
  : args.i;

const avfs = new Avfs(homeDir);

const rootPath =
  providedRootPath
    ? avfs.pathInAvfs(resolve(providedRootPath))
    : avfs.pathInAvfs(Deno.cwd());


let isRootPathFile: boolean;
try {
  const info = await Deno.stat(rootPath);
  isRootPathFile = info.isFile;
} catch(err) {
  console.error(`Couldn't stat root path '${rootPath}' - could not read the contents: ${err}`);
  Deno.exit(2);
}

const pathRegexes = forceArrayArgument(args.pr);
const fileNameRegexes = forceArrayArgument(args.fr);
const extensionsRegexes = forceArrayArgument(args.er);
const verbose = !!(args.v);

const pathToFind = isRootPathFile ? Avfs.PathToAvfsContentsOfFile(rootPath) : rootPath;
const regexes = {
  path: pathRegexes,
  fileName: fileNameRegexes,
  extension: extensionsRegexes
};
const files = await avfs.findFilesRecursiveInAvfs(pathToFind, regexes);
if (verbose) {
  console.log(`[INF] Found ${files.length} files to grep`);
}

const results = await grepFiles(files, { options: args['--'], regex: grepRegex });
if (results.length === 0) {
  console.log(`[INF] No matches found`);
  Deno.exit(0);
}

console.log('\n### Matches ###');
for (const result of results) {
  console.log(`${avfs.avfsPathToFsPath(result.path)}#${result.line}: ${result.match}`);
}

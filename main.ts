import dir from "https://deno.land/x/dir/mod.ts";
import { join, resolve } from "https://deno.land/std/path/mod.ts";
import { parse, Args } from "https://deno.land/std/flags/mod.ts";
import { grepFiles, result } from './grep.ts';
import { Avfs } from "./avfs.ts";
import { forceArrayArgument } from "./utils.ts";
import { LibMagic } from "./libmagic.ts";

type Arguments = {
  ['--']: string[],               // arguments to grep after --
  i?: string | string[],          // -i, --i : input file
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

const providedRootPaths: string[] = args._.length > 0
  ? args._.map(arg => `${arg}`)
  : forceArrayArgument(args.i);

const avfs = new Avfs(homeDir);

const rootPaths =
  providedRootPaths.length > 0
    ? providedRootPaths.map(providedRootPath => avfs.pathInAvfs(resolve(providedRootPath)))
    : avfs.pathInAvfs(Deno.cwd());


const pathRegexes = forceArrayArgument(args.pr);
const fileNameRegexes = forceArrayArgument(args.fr);
const extensionsRegexes = forceArrayArgument(args.er);
const verbose = !!(args.v);

const libmagic = new LibMagic();
const { errMsg } = libmagic.open();
if (errMsg) {
  console.error(`[ERR] could not open libmagic for format deduction: ${errMsg}`);
  Deno.exit(1);
}

let allResults: result[] = [];

for (const rootPath of rootPaths) {
  let isRootPathFile: boolean;
  try {
    const info = await Deno.stat(rootPath);
    isRootPathFile = info.isFile;
  } catch(err) {
    console.error(`[ERR] Couldn't stat root path '${rootPaths}' - could not read the contents: ${err}`);
    continue;
  }

  const pathToFind = isRootPathFile
    ? Avfs.PathToAvfsContentsOfFile(rootPath)
    : rootPath;

  const regexes = {
    path: pathRegexes,
    fileName: fileNameRegexes,
    extension: extensionsRegexes
  };
  const files = await avfs.findFilesRecursiveInAvfs(pathToFind, regexes);
  if (verbose) {
    console.info(`[INF] Found ${files.length} files to grep in path ${rootPath}`);
  }

  const results = await grepFiles(
    files,
    {
      options: args['--'],
      regex: grepRegex,
      isMimeType: (mime: string, filePath: string): boolean => {
        const { errMsg, result } = libmagic.file(filePath);
        if (errMsg) {
          return false;
        }

        return result === mime;
      }
    },
  );

  allResults = [...allResults, ...results];
}

if (allResults.length === 0) {
  if (verbose) {
    console.warn(`[WRN] No matches found`);
  }
  libmagic.close();
  Deno.exit(0);
}

for (const result of allResults) {
  console.log(`${avfs.avfsPathToFsPath(result.path)}#${result.line}: ${result.match}`);
}

libmagic.close();
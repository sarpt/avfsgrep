import { walk } from "https://deno.land/std/fs/mod.ts";
import { join, basename, extname } from "https://deno.land/std/path/mod.ts";

type regexes = {
  path?: string[],
  fileName?: string[],
  extension?: string[]
};

export class Avfs {
  private avfsDir: string;

  constructor(homeDir: string) {
    this.avfsDir = join(homeDir, '.avfs');
  }

  pathInAvfs(path: string): string {
    return join(this.avfsDir, path);
  }

  static PathToAvfsContentsOfFile(path: string): string {
    return `${path}#`;
  }

  avfsPathToFsPath(path: string): string {
    return path
      .replaceAll(this.avfsDir, '')
      .replaceAll('#', '');
  }

  static RegularFileAvfsPath(path: string): string {
    if (!path.endsWith('#')) return path;

    return path.slice(0, path.length-1);
  }

  private static async FileExists(path: string): Promise<boolean> {
    let info;
    try {
      info = await Deno.stat(path);
    } catch (_) {
      return false;
    }

    return info.isFile;
  }

  async findFilesRecursiveInAvfs(
    path: string,
    regexes?: regexes
  ): Promise<string[]> {
    const files: string[] = [];

    for await(const e of walk(path)) {
      if (!e.isFile) continue;

      const enterableArchive = await Avfs.isEnterableArchive(e.path);
      if (!enterableArchive) {
        if (!Avfs.FileExists(e.path)) {
          console.error(`entry at path '${e.path}' is neither a supported archive or a greppable file`);
          continue;
        }

        Avfs.handleFile(e.path, files, regexes);
        continue;
      }

      const filesInPath = await this.findFilesRecursiveInAvfs(Avfs.PathToAvfsContentsOfFile(e.path), regexes);
      files.push(...filesInPath);
    }

    return files;
  }

  private static handleFile(path: string, files: string[], regexes?: regexes) {
    if (Avfs.ShouldSkipFile(path, regexes)) return;

    files.push(path);
  }

  private static async isEnterableArchive(path: string): Promise<boolean> {
      const contentsPath = Avfs.PathToAvfsContentsOfFile(path);
      try {
        const info = await Deno.stat(contentsPath);
        return info.isDirectory;
      } catch {
        return false;
      }
  }

  private static ShouldSkipFile(path: string, regexes?: regexes): boolean {
    const pathRegexes = regexes && regexes.path ? regexes.path : [];
    if (
      pathRegexes.length > 0
        && !pathRegexes.some(pathRegex => path.includes(pathRegex))
    ) return true;

    const fileNameRegexes = regexes && regexes.fileName ? regexes.fileName : [];
    if (
      fileNameRegexes.length > 0
        && !fileNameRegexes.some(fileNameRegex => basename(path).includes(fileNameRegex))
    ) return true;

    const extensionRegexes = regexes && regexes.extension ? regexes.extension : [];
    if (
      extensionRegexes.length > 0
        && !extensionRegexes.some(fileNameRegex => extname(path).includes(fileNameRegex))
    ) return true;

    return false;
  }
}


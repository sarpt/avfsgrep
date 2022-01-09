import { LibMagic } from "./libmagic.ts";

export type result = {
  path: string,
  line: number,
  match: string,
};

const regularGrep = 'grep';
const grepVariants = [
  {
    cmd: 'xzgrep',
    predicate: (filePath: string, libmagic: LibMagic) => {
      const { errMsg, result } = libmagic.file(filePath);
      if (errMsg) {
        return false;
      }

      return result === 'application/x-xz';
    }
  },
  {
    cmd: 'lzgrep',
    predicate: (filePath: string, libmagic: LibMagic) => {
      const { errMsg, result } = libmagic.file(filePath);
      if (errMsg) {
        return false;
      }

      return result === 'application/x-lzma';
    }
  },
  {
    cmd: regularGrep,
    predicate: () => true
  }
];

export async function grepFiles(
  files: string[],
  {
    options,
    regex
  }: {
    options: string[],
    regex: string,
  }
): Promise<result[]> {
  const matches: result[] = [];

  const libmagic = new LibMagic();
  const { errMsg } = libmagic.open();
  if (errMsg) {
    console.error(`could not open libmagic for format deduction: ${errMsg}`);
    return matches;
  }

  for (const filePath of files) {
    const grep = grepVariants.find(variant => variant.predicate(filePath, libmagic))?.cmd || regularGrep;
    const cmd = [
      grep,
      ...options,
      '-n',
      regex,
      filePath,
    ];

    const p = Deno.run({
      cmd,
      stdout: 'piped',        
    });

    const output = await p.output();
    const textOutput = new TextDecoder().decode(output);
    const lines = textOutput.split('\n').filter(line => line);
    if (lines.length === 0) continue;

    const results: result[] = lines.map(line => {
      const [lineNumber, ...match] = line.split(':');
      
      return {
        path: filePath,
        line: Number.parseInt(lineNumber),
        match: match.join(':'),
      }
    });
    matches.push(...results);
  }

  libmagic.close();

  return matches;
}

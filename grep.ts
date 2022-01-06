
export type result = {
  path: string,
  line: number,
  match: string,
};

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

  for (const filePath of files) {
    const cmd = [
      'grep',
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

  return matches;
}

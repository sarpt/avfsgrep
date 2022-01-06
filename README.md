# avfsgrep - run grep recursively using avfs

Crude and quick implementation of tool to run `grep` recursively through `avfs` to descent into archive files when needed.

Might later change use of `avfs` to some other virtual fses that support archives handling, not needed atm.

### execution example

First mount `avfs`:

```mountavfs```

Run or compile:

```deno run --allow-env --allow-read --allow-run main.ts </path/to/dir or /path/to/archive> -r <grep regex> [-- <grep options>]```

or

```deno compile --allow-env --allow-read --allow-run main.ts```

and then run

```deno run avfsgrep </path/to/dir or /path/to/archive> -r <grep regex> [-- <grep options>]```

Lastly, when not needed unmount `avfs`:

```umount ~/.avfs```

### dependencies for running

- `deno` - tested on 1.17.1 and up
- `avfs` - a virtual file system which has support for mounting archives contents as files (http://avf.sourceforge.net/)
- `grep` - just a grep

### permissions

- `allow-env` - for reading home directory path
- `allow-read` - for reading directories and files
- `allow-run` - for executing `grep`

### arguments

- `-i, --i` : input file (not needed when unnamed argument before `--` provided)
- `-r, --r` : regex for `grep`
- `--pr` : (list) path regexes
- `--fr` : (list) filename regexes
- `-v` : verbose logging
- `--er` : (list) extension regexes

### unnamed arguments

- before `--` - argument (one) is treated as root path to directory/archive to be checked recursively.
- after `--` - arguments (multiple) are passed to `grep` as is.

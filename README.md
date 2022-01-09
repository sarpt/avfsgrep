# avfsgrep - run grep recursively using avfs

Crude and quick implementation of tool to run `grep` recursively through `avfs` to descent into archive files when needed.

Might later change use of `avfs` to some other virtual fses that support archives handling, not needed atm.

### execution example

First mount `avfs`:

```mountavfs```

Run or compile:

```deno run --unstable --allow-ffi --allow-env --allow-read --allow-run main.ts </path/to/dir or /path/to/archive> -r <grep regex> [-- <grep options>]```

or

```deno install --allow-env --allow-read --allow-run main.ts```

and then run

```avfsgrep </path/to/dir or /path/to/archive> -r <grep regex> [-- <grep options>]```

Lastly, when not needed unmount `avfs`:

```umount ~/.avfs```

### dependencies for running

Currently only linux is supported (due to dependence on `libmagic` being present in default `ldconfig` aliases path for file format deduction using FFI). Probably will add some switch or something for extension-based deduction or other method...

- `deno` - tested on 1.17.1 and up
- `avfs` - a virtual file system which has support for mounting archives contents as files (http://avf.sourceforge.net/)
- `grep` - just a grep
- `xzgrep`/`lzgrep` - for xz/lzma archives
- `libmagic` - for files format deduction

### permissions

- `unstable` & `allow-ffi` - for FFI (format deduction using `libmagic`)
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

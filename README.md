# @ackee/be-cli

Ackee scripts for backend development.

## Usage

1. Installation `npm install -g @ackee/be-cli`
1. Verify the version: `ackee-be --version`
1. Develop 👨‍💻

## Commands
```
Usage: ackee-be [options] [command]

Options:
  -V, --version  output the version number
  -h, --help     output usage information

Commands:
  docs           Generate API documentation
  proxie         Proxy to a GCP Service
  help [cmd]     display help for [cmd]
```

### Docs
Generates a .html from a .apib docs to the specified folder.
```
Usage: ackee-be docs [options]

Options:
  -i, --input [value]   Apib source files (default: [])
  -o, --output [value]  Output folder (default: "./docs-output")
  --tempDir [value]     Temp directory (default: Local temp dir)
  -h, --help            output usage information
```

Currently supports only a single input - the first one, although multiple can be supplied to the CLI.

### Proxie
An interactive command that lets you easily browse and connect to GCP CloudSQL/Virtual Machine/Pod.
**Requires** you to have `kubectl`, `gcloud` and `cloud_sql_proxy` available.

To debugging, set env variable `DEBUG` to contain `bescripts`.

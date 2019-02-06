#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var commander = require("commander");
var fs = require("fs");
var path = require("path");
var pkgVersion = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
commander.version(pkgVersion.version)
    .command('docs', 'Generate API documentation')
    .parse(process.argv);
//# sourceMappingURL=index.js.map
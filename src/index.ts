#!/usr/bin/env node
import * as commander from 'commander';
import * as fs from 'fs';
import * as path from 'path';

const pkgVersion = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));

commander.version(pkgVersion.version)
    .command('docs', 'Generate API documentation')
    .parse(process.argv);

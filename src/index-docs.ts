#!/usr/bin/env node
import * as commander from 'commander';
import * as tempy from 'tempy';
import script from './lib/docs';

const collect = (val: any, memo: any[]) => memo.concat(val);
const last = (val: any) => val;

commander
    .option('-i, --input [value]', 'Apib source files', collect, [])
    .option('-o, --output [value]', 'Output folder', last, './docs-output')
    .option('--tempDir [value]', 'Temp directory', last, tempy.directory())
    .parse(process.argv);

script(
    commander.args,
    {
        input: commander.input,
        output: commander.output,
        tempDir: commander.tempDir,
    }
)
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

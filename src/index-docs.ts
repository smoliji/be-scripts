#!/usr/bin/env node
import * as commander from 'commander';
import script from './lib/docs';

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

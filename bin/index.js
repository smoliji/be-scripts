#!/usr/bin/env node
const chalk = require('chalk');
const shell = require('shelljs');

const [,, script, ...args] = process.argv;

const run = (command) => {
    console.log(`Running: ${chalk.green(command)}`);
    shell.exec(command);
};

// please order scripts alphabetically
switch (script) {
    case 'lint':
        run('eslint .; exit 0');
        break;
    case 'start':
        run('node server.js');
        break;
    case 'start-lr':
        run('nodemon --watch app --watch config --exec npm start');
        break;
    case 'test':
        run('nyc --reporter=text-summary --reporter=lcov ./node_modules/mocha/bin/_mocha --use_strict test/**');
        break;
    case 'test-lr':
        run('nodemon --watch test --watch app --exec npm run test');
        break;
    default:
        console.log(`Unknown script: ${chalk.red(script)}. Please check out the docs.\n`);
        break;
}

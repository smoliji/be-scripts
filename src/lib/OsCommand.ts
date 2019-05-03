import * as cp from 'child_process';
import * as spawn from 'cross-spawn';
import loading from 'ora';
import { promisify } from 'util';
import { globalOptions } from './proxie';
const kebab = require('kebab-case');
const exec = promisify(cp.exec);

export default class OsCommand<Flags extends { [key: string]: any }> {
    constructor(
        protected command: string,
        public options:
            typeof globalOptions & { execFlags?: { [key: string]: any } }
    ) {

    }
    public async exec(
        args: string,
        flags: Flags & Record<string, any> = {} as Flags,
        options: { outputRaw?: boolean } = {}
    ) {
        const cmd = [
            this.command,
            args,
            ...this.serializeFlags({
                ...(this.options.execFlags || {}),
                ...flags,
            }),
        ].join(' ');
        if (this.options.debug) {
            console.log(`exec: ${cmd}`);
        }
        const load = loading(cmd).start();
        try {
            const result = await exec(cmd, { maxBuffer: 1024 * 1024 * 10 /* 10MB */ });
            load.stop();
            return options.outputRaw ? result.stdout : JSON.parse(result.stdout);
        } catch (error) {
            load.fail(error.message);
            throw error;
        }

    }
    protected async spawn(args: string , flags: Flags & Record<string, any> = {} as Flags) {
        return new Promise((resolve, reject) => {
            const cmdParts = [
                this.command,
                ...args.split(' '),
                ...this.serializeFlags(flags),
            ];
            if (this.options.debug) {
                console.log(`exec: ${cmdParts.join(' ')}`);
            }
            const p = spawn(cmdParts[0], cmdParts.slice(1));
            p.on('error', reject);
            p.on('close', resolve);
            p.on('exit', resolve);
            p.stdout.pipe(process.stdout).on('error', reject);
            p.stderr.pipe(process.stderr).on('error', reject);
        });
    }
    protected serializeFlags(flags: Record<string, string | undefined | boolean> = {}) {
        return Object.keys(flags)
            .map(key => ({ key, value: flags[key] }))
            .filter(({ value }) => value)
            .map(({ key, value }) => `--${kebab(key)}=${value}`);
    }
}

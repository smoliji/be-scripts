import * as cp from 'child_process';
import { SqlInstance } from './GcloudCli';
import { globalOptions } from './proxie';

export default class CloudSqlProxyCli {
    constructor(public options: typeof globalOptions) {}
    public async exec(instance: SqlInstance, port: number) {
        return new Promise((resolve, reject) => {
            const cmd = 'cloud_sql_proxy';
            const flags = [`-instances=${instance.connectionName}=tcp:${port}`];
            if (this.options.debug) {
                console.log(`exec: ${cmd} ${flags.join(' ')}`);
            }
            const p = cp.spawn(cmd, flags);
            p.on('error', reject);
            p.on('close', resolve);
            p.on('exit', resolve);
            p.stdout.pipe(process.stdout).on('error', reject);
            p.stderr.pipe(process.stderr).on('error', reject);
        });
    }
}

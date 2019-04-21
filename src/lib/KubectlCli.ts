import * as cp from 'child_process';
import { promisify } from 'util';
import { globalOptions } from './proxie';
const loading = require('loading-cli');
const kebab = require('kebab-case');

const exec = promisify(cp.exec);

export interface KubectlWideFlags {
    namespace?: string;
    allNamespaces?: boolean;
    output?: string;
}

export interface Pod {
    metadata: {
        name: string;
        namespace: string;
    };
    spec: {
        containers: Array<
            {
                env: any[];
                ports: Array<{
                    containerPort: string;
                    protocol: string;
                }>
            }
        >
    };
}

export default class KubectlCli {
    constructor(public options: typeof globalOptions) {}
    async configUseContext({ project, cluster, region }: { project: string; cluster: string; region: string}) {
        return this.exec(`kubectl config use-context gke_${project}_${region}_${cluster}`);
    }
    async getPods(flags: KubectlWideFlags = {}): Promise<{ apiVersion: number, items: Pod[]}> {
        return this.exec('kubectl get pods', { ...flags, output: 'json' });
    }
    async portForward(pod: string, port1: string | number, port2: string | number, flags: KubectlWideFlags = {}) {
        return this.spawn(`kubectl port-forward ${pod} ${port1} ${port2}`, flags);
    }
    async exec(cmd: string, { namespace, allNamespaces, output }: KubectlWideFlags = {}) {
        cmd = KubectlCli.addFlags(cmd, { namespace, allNamespaces, output });
        if (this.options.debug) {
            console.log(`exec: ${cmd}`);
        }
        const load = loading(cmd).start();
        const result = await exec(cmd, { maxBuffer: 1024 * 1024 * 10 /* 10MB */ });
        load.stop();
        if (output === 'json') {
            return JSON.parse(result.stdout);
        }
        return result.stdout;
    }
    protected spawn(cmd: string, { namespace, allNamespaces, output }: KubectlWideFlags = {}) {
        return new Promise((resolve, reject) => {
            const [baseCmd, ...args] = cmd.split(' ');
            const cmdArgs = args.concat(KubectlCli.serializeFlags({ namespace, allNamespaces, output }));
            if (this.options.debug) {
                console.log(`exec: ${baseCmd} ${cmdArgs.join(' ')}`);
            }
            const p = cp.spawn(baseCmd, cmdArgs);
            p.on('error', reject);
            p.on('close', resolve);
            p.on('exit', resolve);
            p.stdout.pipe(process.stdout).on('error', reject);
            p.stderr.pipe(process.stderr).on('error', reject);
        });
    }
    static addFlags(cmd: string, flags: Record<string, string | undefined | boolean> = {}) {
        return [cmd]
            .concat(KubectlCli.serializeFlags(flags))
            .filter(x => x)
            .join(' ')
            .trim();
    }
    static serializeFlags(flags: Record<string, string | undefined | boolean> = {}) {
        return Object.keys(flags)
            .map(key => ({ key, value: flags[key] }))
            .filter(({ value }) => value)
            .map(({ key, value }) => `--${kebab(key)}=${value}`);
    }
}

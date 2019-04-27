import OsCommand from './OsCommand';
import { globalOptions } from './proxie';

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

export default class KubectlCli extends OsCommand<KubectlWideFlags> {
    constructor(public options: typeof globalOptions) {
        super('kubectl', { ...options, execFlags: { output: 'json' } });
    }
    async configUseContext({ project, cluster, region }: { project: string; cluster: string; region: string}) {
        return this.exec(`config use-context gke_${project}_${region}_${cluster}`, {}, { outputRaw: true });
    }
    async getPods(flags: KubectlWideFlags = {}): Promise<{ apiVersion: number, items: Pod[]}> {
        return this.exec('get pods', { ...flags, output: 'json' });
    }
    async portForward(pod: string, port1: string | number, port2: string | number, flags: KubectlWideFlags = {}) {
        return this.spawn(`port-forward ${pod} ${port1} ${port2}`, flags);
    }
}

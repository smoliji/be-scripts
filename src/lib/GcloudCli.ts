
import * as cp from 'child_process';
import { promisify } from 'util';
import { globalOptions } from './proxie';
const loading = require('loading-cli');

const exec = promisify(cp.exec);

export interface Project {
    createTime: string;
    lifecycleState: string;
    name: string;
    projectId: string;
    projectNumber: string;
}
export interface VMInstance {
    id: string;
    name: string;
    zone: string;
    url: string;
}
export interface Cluster {
    addonsConfig?:
    {
        httpLoadBalancing: any;
        kubernetesDashboard: any;
        networkPolicyConfig: any[];
    };
    clusterIpv4Cidr: string;
    createTime: string;
    currentMasterVersion: string;
    currentNodeCount: number;
    currentNodeVersion: string;
    endpoint: string;
    initialClusterVersion: string;
    instanceGroupUrls: string[];
    ipAllocationPolicy: any;
    labelFingerprint: string;
    legacyAbac: any,
    location: string;
    locations: string[];
    loggingService: string,
    maintenancePolicy?: { window: any[] };
    masterAuth:
    {
        clusterCaCertificate:
        string
    };
    masterAuthorizedNetworksConfig: any;
    monitoringService: string;
    name: string;
    network: string;
    networkConfig?:
    {
        network: string;
        subnetwork: string;
    };
    networkPolicy?: { provider: string };
    nodeConfig?:
    {
        diskSizeGb: string,
        diskType: string;
        imageType: string;
        machineType: string;
        oauthScopes: Array<any[]>;
        serviceAccount: string
    };
    nodeIpv4CidrSize: number;
    nodePools: Array<Array<any>>;
    selfLink: string;
    servicesIpv4Cidr: string;
    status: string;
    subnetwork: string;
    zone: string;
}

export interface SqlInstance {
    connectionName: string;
    name: string;
}

export interface GcloudWideFlags {
    project?: string;
}

export default class GcloudCli {
    constructor(public options: typeof globalOptions) {}
    public async configListAccount(): Promise<{ core: { account: string } }> {
        return this.exec('gcloud config list account');
    }
    public async projectsList(): Promise<Array<Project>> {
        return this.exec('gcloud projects list');
    }
    public async computeInstancesList(flags: GcloudWideFlags): Promise<Array<VMInstance>> {
        return this.exec('gcloud compute instances list', flags);
    }
    public async computeSsh(vminstance: VMInstance, localPort: number, remotePort: number, flags: GcloudWideFlags) {
        return new Promise((resolve, reject) => {
            const cmd = 'gcloud';
            const flags = ['compute', 'ssh', vminstance.name, `--zone=${vminstance.zone}`, `--ssh-flag="-L ${remotePort}:127.0.0.1:${localPort}"`];
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
    public async containerClustersList(flags: GcloudWideFlags): Promise<Array<Cluster>> {
        return this.exec('gcloud container clusters list', flags);
    }
    public async containerClustersGetCredentials(name: string, { zone, ...flags }: GcloudWideFlags & { zone: string }) {
        return this.exec(
            GcloudCli.addFlags(`gcloud container clusters get-credentials ${name}`, { zone }),
            flags
        );
    }
    public async sqlInstancesList(flags: GcloudWideFlags): Promise<Array<any>> {
        return this.exec('gcloud sql instances list', flags);
    }
    async exec(cmd: string, { project }: GcloudWideFlags = {}) {
        cmd = GcloudCli.addFlags(cmd, { project, format: 'json' });
        if (this.options.debug) {
            console.log(`exec: ${cmd}`);
        }
        const load = loading(cmd).start();
        const result = await exec(cmd, { maxBuffer: 1024 * 1024 * 10 /* 10MB */ });
        load.stop();
        return JSON.parse(result.stdout);
    }
    static addFlags(cmd: string, flags: Record<string, string | undefined> = {}) {
        return [cmd]
            .concat(
                Object.keys(flags)
                    .map(key => ({ key, value: flags[key] }))
                    .filter(({ value }) => value)
                    .map(({ key, value }) => `--${key}=${value}`)
            )
            .filter(x => x)
            .join(' ')
            .trim();
    }
}

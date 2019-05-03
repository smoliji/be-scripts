
import OsCommand from './OsCommand';
import { globalOptions } from './proxie';
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
    legacyAbac: any;
    location: string;
    locations: string[];
    loggingService: string;
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
    format?: string;
}

export default class GcloudCli extends OsCommand<GcloudWideFlags> {
    constructor(options: typeof globalOptions) {
        super('gcloud', { ...options, execFlags: { format: 'json' } });
    }
    public async configListAccount(): Promise<{ core: { account: string } }> {
        return this.exec('config list account');
    }
    public async projectsList(): Promise<Array<Project>> {
        return this.exec('projects list');
    }
    public async computeInstancesList(flags: GcloudWideFlags): Promise<Array<VMInstance>> {
        return this.exec('compute instances list', flags);
    }
    public async computeSsh(vminstance: VMInstance, localPort: number, remotePort: number, flags: GcloudWideFlags) {
        return this.spawn(
            `compute ssh ${vminstance.name}`,
            {
                ...flags,
                zone: vminstance.zone,
                sshFlag: `"-L ${remotePort}:127.0.0.1:${localPort}"`,
            },
        );
    }
    public async containerClustersList(flags: GcloudWideFlags): Promise<Array<Cluster>> {
        return this.exec('container clusters list', flags);
    }
    public async containerClustersGetCredentials(name: string, { zone, ...flags }: GcloudWideFlags & { zone: string }) {
        return this.exec(
            `container clusters get-credentials ${name}`,
            { ...flags, zone }
        );
    }
    public async sqlInstancesList(flags: GcloudWideFlags): Promise<Array<any>> {
        return this.exec('sql instances list', flags);
    }
}

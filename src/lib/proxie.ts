const inquirer = require('inquirer');
const fuzzy = require('fuzzy');
import getPort from 'get-port';
import { Answers } from 'inquirer';
import CloudSqlProxyCli from './CloudSqlProxyCli';
import GcloudCli, { Cluster, Project, SqlInstance, VMInstance } from './GcloudCli';
import KubectlCli, { Pod } from './KubectlCli';
const commandExists = require('command-exists');

export const globalOptions = {
    debug: !!/bescripts/.test(String(process.env.DEBUG)),
};

const gcloud = new GcloudCli(globalOptions);
const kubectl = new KubectlCli(globalOptions);
const cloudSqlProxy = new CloudSqlProxyCli(globalOptions);

inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));

const initializationCheck = async () => {
    console.log('Command check:');
    const missing = (await Promise.all(['gcloud', 'kubectl', 'cloud_sql_proxy']
        .map(async cmd => {
            let status = '❌';
            try {
                await commandExists(cmd);
                status = '√';
            } catch (error) {}
            console.log(` ${cmd} ${status}`);
            return { status, cmd };
        })
    ))
        .filter(({ status }) => status !== '√');
    if (missing.length) {
        console.log(`Missing following commands: ${missing.map(x => x.cmd)}. Will now exit.`);
        process.exit(1);
    }
    const auth = await gcloud.configListAccount();
    console.log(`Active gcloud account: ${auth && auth.core && auth.core.account}`);
};

const vmPicker = () => {
    let list = Promise.resolve([]) as Promise<Array<VMInstance>>;
    const getList = async (answers: any) => {
        const data = await list;
        if (data.length) {
            return data;
        }
        list = gcloud.computeInstancesList({ project: answers.project });
        return list;
    };
    return {
        type: 'autocomplete',
        name: 'vminstance',
        message: 'VM Instance (mongo...)',
        source: async (answers: any, input: string = '') => {
            const fuzzyResult = fuzzy.filter(
                input,
                await getList(answers),
                { extract: (item: Project) => item.name }
            ) as Array<{ original: VMInstance }>;
            if (!input && !fuzzyResult.length) {
                console.log('No VM Instances, sorry! Will now exit');
                process.exit(0);
            }
            return fuzzyResult.map(item => ({
                name: item.original.name,
                value: item.original,
                short: item.original.name,
            }));
        },
    };
};

const gcProjectPicker = () => {
    const list = gcloud.projectsList();
    return {
        type: 'autocomplete',
        name: 'project',
        message: 'GCP Project',
        source: async (answers: Answers, input: string = '') => {
            const fuzzyResult = fuzzy.filter(
                input,
                await list,
                { extract: (item: Project) => item.name }
            ) as Array<{ original: Project }>;
            return fuzzyResult.map(item => ({
                name: item.original.name,
                value: item.original.projectId,
                short: item.original.name,
            }));
        },
    };
};

const typePicker = () => {
    const list = [
        {
            name: 'CloudSQL',
            value: 'cloudsql',
        },
        {
            name: 'VM (mongo...)',
            value: 'vm',
        },
        {
            name: 'pod (app, mongo, ...)',
            value: 'pod',
        },
    ];
    return {
        name: 'type',
        message: 'Pick forward type',
        type: 'autocomplete',
        source: async (answers: Answers, input: string = '') => {
            const fuzzyResult = fuzzy.filter(
                input,
                list,
                { extract: (item: any) => item.name }
            ) as Array<any>;
            return fuzzyResult.map(item => ({
                name: item.original.name,
                value: item.original.value,
                short: item.original.name,
            }));
        },
    };
};

const remotePortPicker = () => {
    return {
        name: 'remotePort',
        type: 'input',
        message: 'Remote port',
        default: (answers: Answers & { pod?: Pod, vminstance?: VMInstance }) => {
            if (answers.vminstance) {
                const name = answers.vminstance.name;
                if (/mongo/.test(name)) {
                    return 27017;
                }
            }
            const firstContainerPort = answers.pod
                && answers.pod.spec
                && answers.pod.spec.containers
                && answers.pod.spec.containers
                    .map(container => container.ports[0])
                    .map(item => item.containerPort)
                    .shift();
            if (firstContainerPort) {
                return firstContainerPort;
            }
            const type = answers.type;
            const podName = answers.pod ? String(answers.pod.metadata.name) : '';
            if (type === 'cloudsql' || /(sql|mariadb)/.test(podName)) {
                return 3306;
            }
            if (type === 'mongo' || /mongo/.test(podName)) {
                return 27017;
            }
            return 3000;
        },
    };
};

const localPortPicker = () => {
    return {
        name: 'localPort',
        type: 'input',
        message: 'Local port',
        default: async (answers: Answers) => {
            // Prefer range remotePort..(remotePort + 5)
            // If none is found, pick any available port
            const preferredPorts = new Array(5)
                .fill(0)
                .map((_z, i) => Number(answers.remotePort) + i);
            return await getPort({ port: preferredPorts });
        },
    };
};

const clusterPicker = () => {
    let list = Promise.resolve([]) as Promise<Array<Cluster>>;
    const getList = async (answers: any) => {
        const data = await list;
        if (data.length) {
            return data;
        }
        list = gcloud.containerClustersList({ project: answers.project });
        return list;
    };
    return {
        type: 'autocomplete',
        name: 'cluster',
        message: 'Pick a Cluster',
        source: async (answers: any, input: string = '') => {
            const fuzzyResult = fuzzy.filter(
                input,
                await getList(answers),
                { extract: (item: Project) => item.name }
            ) as Array<{ original: Cluster }>;
            if (!input && !fuzzyResult.length) {
                console.log('No Clusters, sorry! Will now exit');
                process.exit(0);
            }
            return fuzzyResult.map(item => ({
                name: [
                    item.original.name,
                    item.original.zone && `(${item.original.zone})`,
                ].filter(x => x).join(' '),
                value: { name: item.original.name, zone: item.original.zone, location: item.original.location },
                short: item.original.name,
            }));
        },
    };
};

const cloudSqlPicker = () => {
    let list = Promise.resolve([]) as Promise<Array<SqlInstance>>;
    const getList = async (answers: any & { project: Project }) => {
        const data = await list;
        if (data.length) {
            return data;
        }
        list = gcloud.sqlInstancesList({ project: answers.project });
        return list;
    };
    return {
        type: 'autocomplete',
        name: 'cloudsql',
        message: 'Pick a CloudSQL instance',
        source: async (answers: Answers, input: string = '') => {
            const fuzzyResult = fuzzy.filter(
                input,
                await getList(answers),
                { extract: (item: SqlInstance) => item.name }
            ) as Array<{ original: SqlInstance }>;
            if (!input && !fuzzyResult.length) {
                console.log('No SqlInstances, sorry! Will now exit');
                process.exit(0);
            }
            return fuzzyResult.map(item => ({
                name: item.original.name,
                value: item.original,
                short: item.original.name,
            }));
        },
    };
};

const podPicker = () => {
    let list = Promise.resolve([]) as Promise<Array<Pod>>;
    const getList = async (answers: any) => {
        const data = await list;
        if (data.length) {
            return data;
        }
        await gcloud.containerClustersGetCredentials(
            answers.cluster.name,
            {
                project: answers.project,
                zone: answers.cluster.zone,
            }
        );
        await kubectl.configUseContext({
            project: answers.project,
            region: answers.cluster.location,
            cluster: answers.cluster.name,
        });
        list = kubectl.getPods({ allNamespaces: true })
            .then(x => x.items);
        return list;
    };
    return {
        type: 'autocomplete',
        name: 'pod',
        message: 'Pick a Pod',
        source: async (answers: any, input: string = '') => {
            const fuzzyResult = fuzzy.filter(
                input,
                await getList(answers),
                { extract: (item: Pod) => item.metadata.name }
            ) as Array<{ original: Pod }>;
            if (!input && !fuzzyResult.length) {
                console.log('No Pods, sorry! Will now exit');
                process.exit(0);
            }
            return fuzzyResult.map(item => ({
                name: [
                    item.original.metadata.name,
                    item.original.metadata.namespace && `(${item.original.metadata.namespace})`,
                ].filter(x => x).join(' '),
                value: item.original,
                short: item.original.metadata.name,
            }));
        },
    };
};

const onlyTypes = (types: string[], ...pickers: any[]) => {
    return pickers
        .map(picker => ({
            ...picker,
            when: (answers: Answers) => types.includes(answers.type),
        }));
};

const main = async() => {
    await initializationCheck();
    const answers = await inquirer
        .prompt([
            gcProjectPicker(),
            typePicker(),
            ...onlyTypes(
                ['vm'],
                vmPicker(),
            ),
            ...onlyTypes(
                ['cloudsql'],
                cloudSqlPicker(),
            ),
            ...onlyTypes(
                ['pod'],
                clusterPicker(),
                podPicker(),
            ),
            remotePortPicker(),
            localPortPicker(),
        ]) as Answers & { pod?: Pod, cloudsql?: SqlInstance, localPort: number, remotePort: number, vminstance?: VMInstance, project: string };

    if (answers.pod) {
        await kubectl.portForward(answers.pod.metadata.name, answers.remotePort, answers.localPort, { namespace: answers.pod.metadata.namespace });
    } else if (answers.cloudsql) {
        await cloudSqlProxy.exec(answers.cloudsql, answers.localPort);
    } else if (answers.vminstance) {
        await gcloud.computeSsh(answers.vminstance, answers.localPort, answers.remotePort, { project: answers.project });
    }
};

export default main;

const inquirer = require('inquirer');
const fuzzy = require('fuzzy');
import getPort from 'get-port';
import { Answers } from 'inquirer';
import CloudSqlProxyCli from './CloudSqlProxyCli';
import GcloudCli, { Cluster, Project, SqlInstance, VMInstance } from './GcloudCli';
import KubectlCli, { Pod } from './KubectlCli';
const commandExists = require('command-exists');
import * as logSymbols from 'log-symbols';
import loading from 'ora';

export const globalOptions = {
    debug: !!/bescripts/.test(String(process.env.DEBUG)),
};

const gcloud = new GcloudCli(globalOptions);
const kubectl = new KubectlCli(globalOptions);
const cloudSqlProxy = new CloudSqlProxyCli(globalOptions);

inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));

const initializationCheck = async() => {
    const load = loading('Inspecting environment').start();
    const results = await Promise.all([
        {
            name: 'gcloud',
            check: () => commandExists('gcloud'),
        },
        {
            name: 'kubectl',
            check: () => commandExists('kubectl'),
        },
        {
            name: 'cloud_sql_proxy',
            check: () => commandExists('cloud_sql_proxy'),
        },
        {
            name: 'gcloud account',
            check: async() => {
                const auth = await gcloud.configListAccount();
                return auth && auth.core && auth.core.account;
            },
        },
    ]
        .map(async item => {
            try {
                const result = await item.check();
                return [null, result, item];
            } catch (error) {
                return [error, item];
            }
        }),
    );
    load.succeed();
    results.forEach(item => {
        if (item[0]) {
            console.log(` ${logSymbols.warning} ${item[1].name}`);
        } else {
            console.log(` ${logSymbols.success} ${item[2].name} (${item[1]})`);
        }
    });
    if (results.some(item => item[0])) {
        console.log(`${logSymbols.warning} Something is not right. App may not work properly.`);
    }
};

const searchable = <T>({ extract, getItems, display }: {
    extract: (item: T) => string;
    getItems: (answers: Answers) => Promise<T[]>;
    display: (item: T) => { name: string, value: any, short: string};
}) => {
    return async(answers: Answers, input: string = '') => {
        const fuzzyResult = fuzzy.filter(
            input,
            await getItems(answers),
            { extract }
        ) as Array<{ original: T }>;
        if (!input && !fuzzyResult.length) {
            console.log('No Results, sorry! Will now exit');
            process.exit(0);
        }
        return fuzzyResult.map(item => display(item.original));
    };
};

const vmPicker = () => {
    let list = Promise.resolve([]) as Promise<Array<VMInstance>>;
    const getList = async(answers: any) => {
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
        source: searchable({
            getItems: getList,
            extract: (item) => item.name,
            display: item => ({
                name: item.name,
                value: item,
                short: item.name,
            }),
        }),
    };
};

const gcProjectPicker = () => {
    return {
        type: 'autocomplete',
        name: 'project',
        message: 'GCP Project',
        source: searchable({
            extract: item => item.name,
            getItems: ((list) => () => list)(gcloud.projectsList()),
            display: item => ({
                name: item.name,
                value: item.projectId,
                short: item.name,
            }),
        }),
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
        source: searchable({
            getItems: async() => list,
            extract: item => item.name,
            display: item => ({
                name: item.name,
                value: item.value,
                short: item.name,
            }),
        }),
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
        default: async(answers: Answers) => {
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
    const getList = async(answers: any) => {
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
        source: searchable({
            getItems: getList,
            extract: item => item.name,
            display: item => ({
                name: [
                    item.name,
                    item.zone && `(${item.zone})`,
                ].filter(x => x).join(' '),
                value: { name: item.name, zone: item.zone, location: item.location },
                short: item.name,
            }),
        }),
    };
};

const cloudSqlPicker = () => {
    let list = Promise.resolve([]) as Promise<Array<SqlInstance>>;
    const getList = async(answers: any & { project: Project }) => {
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
        source: searchable({
            getItems: getList,
            extract: item => item.name,
            display: item => ({
                name: item.name,
                value: item,
                short: item.name,
            }),
        }),
    };
};

const podPicker = () => {
    let list = Promise.resolve([]) as Promise<Array<Pod>>;
    const getList = async(answers: any) => {
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
        source: searchable({
            getItems: getList,
            extract: item => item.metadata.name,
            display: item => ({
                name: [
                    item.metadata.name,
                    item.metadata.namespace && `(${item.metadata.namespace})`,
                ].filter(x => x).join(' '),
                value: item,
                short: item.metadata.name,
            }),
        }),
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
        await cloudSqlProxy.connect(answers.cloudsql, answers.localPort);
    } else if (answers.vminstance) {
        await gcloud.computeSsh(answers.vminstance, answers.localPort, answers.remotePort, { project: answers.project });
    }
};

export default main;

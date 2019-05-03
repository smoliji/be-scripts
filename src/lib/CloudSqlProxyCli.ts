import { SqlInstance } from './GcloudCli';
import OsCommand from './OsCommand';
import { globalOptions } from './proxie';

export default class CloudSqlProxyCli extends OsCommand<any> {
    constructor(public options: typeof globalOptions) {
        super('cloud_sql_proxy', options);
    }
    public async connect(instance: SqlInstance, port: number) {
        return this.spawn(
            `-instances=${instance.connectionName}=tcp:${port}`
        );
    }
}

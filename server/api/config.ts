import * as fs from "fs";
import {DriverOptions} from "typeorm";
import * as helpers from "../../helpers";

function load(): IConfiguration {
    let configDir: string = helpers.path.baseDir + "config/";
    config = <any>{};
    fs.readdirSync(configDir).forEach((filename) => {
        let configName: string = filename.split(".")[0];
        let rawConfig: string = fs.readFileSync(configDir + filename).toString();
        (<any>config)[configName] = JSON.parse(rawConfig);
    });
    config.content = JSON.parse(fs.readFileSync(helpers.path.baseDir + "content/config.json").toString());
    return config;
}

let config: IConfiguration;
export default config = load();

export interface IConfiguration {
    auth: IAuthConfiguration;
    content: IContentConfiguration;
    db: DriverOptions;
    dev: IDevConfiguration;
    http: IHttpConfiguration;
    https: IHttpsConfiguration;
    logger: ILoggerConfiguration;
}

interface IAuthConfiguration {
    cas: {
        url: string;
        svc: string;
    };
    provider: "cas";
}

interface IContentConfiguration {
    auth: string;
    lifecycleDirs: string[];
    modelDirs: string[];
}

interface IDevConfiguration {
    enable: boolean;
}

interface IHttpConfiguration {
    host: string;
    port: number;
    sessionSecret: string;
}

interface IHttpsConfiguration {
    enable: boolean;
    ca?: string;
    cert?: string;
    key?: string;
    port?: number;
}

interface ILoggerConfiguration {
    logDatabaseQueries: boolean;
}

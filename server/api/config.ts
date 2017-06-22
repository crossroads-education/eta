import * as fs from "fs";
import * as linq from "linq";
import * as api from "./index";
import {DriverOptions} from "typeorm";
import * as helpers from "../../helpers";

function load(): IConfiguration {
    let configDir: string = helpers.path.baseDir + "config/";
    config = <any>{};
    fs.readdirSync(configDir).forEach((filename) => {
        let configName: string = filename.split(".")[0];
        let rawConfig: string = fs.readFileSync(configDir + filename).toString();
        try {
            (<any>config)[configName] = JSON.parse(rawConfig);
        } catch (err) {
            api.logger.error(configDir + filename + " contains invalid JSON.");
        }
    });
    let raw: string = fs.readFileSync(helpers.path.baseDir + "config.json").toString();
    try {
        config.content = JSON.parse(raw);
    } catch (err) {
        api.logger.error(helpers.path.baseDir + "content/config.json contains invalid JSON.");
    }
    linq.from(Object.keys(process.env))
        .where(k => k.startsWith("ETA_"))
        .forEach(k => {
            let tokens: string[] = k.toLowerCase().split("_").splice(1);
            let category: string = tokens[0];
            let name: string = tokens[1];
            let value: any;
            try {
                value = JSON.parse(process.env[k]);
            } catch (err) {
                value = process.env[k];
            }
            if ((<any>config)[category]) {
                (<any>config)[category][name] = value;
            }
        });
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

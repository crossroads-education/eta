import * as fs from "fs";
import constants from "./constants";
import logger from "./logger";
import { DriverOptions } from "typeorm";

function load(): IConfiguration {
    const configDir: string = constants.basePath + "config/";
    config = <any>{};
    fs.readdirSync(configDir).forEach((filename) => {
        if (filename.endsWith(".sample.json")) return;
        const configName: string = filename.split(".")[0];
        const rawConfig: string = fs.readFileSync(configDir + filename).toString();
        try {
            (<any>config)[configName] = JSON.parse(rawConfig);
        } catch (err) {
            logger.error(configDir + filename + " contains invalid JSON.");
        }
    });
    const raw: string = fs.readFileSync(constants.basePath + "content/config.json").toString();
    try {
        config.content = JSON.parse(raw);
        config.content.lifecycleDirs.push("../server/lifecycle");
    } catch (err) {
        logger.error(constants.basePath + "content/config.json contains invalid JSON.");
    }
    Object.keys(process.env)
        .filter(k => k.startsWith("ETA_"))
        .forEach(k => {
            const tokens: string[] = k.toLowerCase().split("_").splice(1);
            const category: string = tokens[0];
            const name: string = tokens[1];
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
    provider: string;
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

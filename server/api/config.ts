import * as fs from "fs";
import constants from "./constants";
import logger from "./logger";

function load(): IConfiguration {
    const configDir: string = constants.basePath + "config/";
    config = <any>{};
    fs.readdirSync(configDir)
        .filter(f => f.endsWith(".json") && !f.endsWith(".sample.json"))
    .forEach((filename) => {
        const configName: string = filename.split(".")[0];
        const rawConfig: string = fs.readFileSync(configDir + filename).toString();
        try {
            (<any>config)[configName] = JSON.parse(rawConfig);
        } catch (err) {
            logger.error(configDir + filename + " contains invalid JSON.");
        }
    });
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
    db: any;
    dev: IDevConfiguration;
    http: IHttpConfiguration;
    https: IHttpsConfiguration;
    logger: ILoggerConfiguration;
    modules: {[key: string]: IModuleConfiguration};
}

export interface IAuthConfiguration {
    [key: string]: any;
    provider: string;
}

export interface IModuleConfiguration {
    controllerDirs: string[];
    css: {[key: string]: string};
    lifecycleDirs: string[];
    modelDirs: string[];
    name: string;
    redirects: {[key: string]: string};
    rootDir: string;
    staticDirs: string[];
    transformerDirs: string[];
    viewDirs: string[];
    [key: string]: any;
}

export interface IDevConfiguration {
    enable: boolean;
}

export interface IHttpConfiguration {
    host: string;
    port: number;
    session: {
        host: string;
        port: number;
        secret: string;
    };
}

export interface IHttpsConfiguration {
    enable: boolean;
    ca?: string;
    cert?: string;
    key?: string;
    port?: number;
    realPort?: number;
}

export interface ILoggerConfiguration {
    logDatabaseQueries: boolean;
}

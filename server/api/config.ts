import * as fs from "fs";
import constants from "./constants";
import logger from "./logger";

function load(): IConfiguration {
    const configDir: string = constants.basePath + "config/";
    config = <any>{};
    fs.readdirSync(configDir)
        .filter(f => f.endsWith(".json") && !f.endsWith(".sample.json"))
    .forEach((filename) => {
        const configNameTokens: string[] = filename.split(".");
        const configName: string = configNameTokens.splice(0, configNameTokens.length - 1).join(".");
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
    aws: {[key: string]: any};
    db: any;
    dev: IDevConfiguration;
    http: IHttpConfiguration;
    https: IHttpsConfiguration;
    logger: ILoggerConfiguration;
    modules: {[key: string]: IModuleConfiguration};
}

export interface IAuthConfiguration {
    // TODO Replace this with a module using DB for per-client API tokens
    apiToken: string;
    provider: string;
}

export interface IModuleConfiguration {
    /**
     * Directory definitions for various item types
     */
    dirs: {
        controllers: string[];
        models: string[];
        staticFiles: string[];
        views: string[];
        // hooks and handlers
        lifecycleHandlers: string[];
        requestTransformers: string[];
    };
    /**
     * CSS redirect mappings
     */
    css: {[key: string]: string};
    /**
     * The actual name of the module (in filesystem as well)
     */
    name: string;
    /**
     * Redirect definitions (i.e., "/home/index": "/home/otherPage" would redirect from index to otherPage)
     */
    redirects: {[key: string]: string};
    /**
     * Absolute path to module directory.
     * Generated on module load by ModuleLoader.
     */
    rootDir: string;
    /**
     * Modules that this module requires.
     * Format: username/repository
     * Only Github repositories are supported.
     */
    dependencies: string[];
    /**
     * Whether the module should be loaded or not.
     */
    disable?: boolean;
    hooks: {[key: string]: {cwd: string, exec: string}[]};
    [key: string]: any;
}

export interface IDevConfiguration {
    enable: boolean;
}

export interface IHttpConfiguration {
    /**
     * Host to redirect to when needed
     */
    host: string;
    /**
     * Port to listen on
     */
    port: number;
    session: {
        /**
         * Hostname to connect Redis to
         */
        host: string;
        /**
         * Port to connect Redis to
         */
        port: number;
        /**
         * Unique string to help encode session ids
         */
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

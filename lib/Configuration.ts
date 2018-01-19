import * as fs from "fs-extra";
import * as _ from "lodash";
import * as api from "../server/api/index";
import * as helpers from "../helpers/index";

export default class Configuration {
    private items: {[key: string]: any};
    public constructor(items: {[key: string]: any}) {
        this.items = items;
    }

    public set(key: string, value: any): void {
        this.items[key] = value;
    }

    public get<T>(key: string): T {
        return this.items[key];
    }

    public exists(key: string): boolean {
        return this.items[key] !== undefined;
    }

    public keys(): string[] {
        return Object.keys(this.items);
    }

    public modules(): string[] {
        return _.uniq(this.keys()
            .filter(k => k.startsWith("modules."))
            .map(k => k.split(".")[1]));
    }

    public buildChild(prefixes: string[] = ["global."]): Configuration {
        const items: {[key: string]: any} = {};
        for (const prefix of prefixes) {
            const keys = this.keys().filter(k => k.startsWith(prefix));
            for (const key of keys) {
                items[key.substring(prefix.length)] = this.items[key];
            }
        }
        return new Configuration(items);
    }

    public buildFromObject(obj: any, parentKeys: string[] = []): void {
        if (typeof(obj) !== "object" || obj instanceof Array) {
            this.set(parentKeys.join("."), obj);
            return;
        }
        for (const key in obj) {
            this.buildFromObject(obj[key], parentKeys.concat([key]));
        }
    }

    public buildToObject(prefix: string): {[key: string]: any} {
        const result: {[key: string]: any} = {};
        this.keys().filter(k => k.startsWith(prefix)).forEach(k => {
            const tokens = k.substring(prefix.length).split(".");
            let parent: any = result;
            for (const token of tokens.slice(0, -1)) {
                if (parent[token] === undefined) parent[token] = {};
                parent = parent[token];
            }
            parent[tokens[tokens.length - 1]] = this.get(k);
        });
        return result;
    }

    /**
     * Loads all config variables from disk / env
     */
    public static async load(): Promise<Configuration> {
        const config = new Configuration({});
        const configDir: string = api.constants.basePath + "config/";
        const hostnames: string[] = await fs.readdir(configDir);
        await Promise.all(hostnames.map(async host => {
            const configFiles: string[] = (await helpers.fs.recursiveReaddir(configDir + host))
                .filter(f => f.endsWith(".json") && !f.endsWith(".sample.json"));
            config.set(host + ".http.host", host);
            for (const filename of configFiles) {
                const configName: string = filename.substring((configDir + host + "/").length)
                    .replace(/[\\\/]/g, ".")
                    .split(".")
                    .slice(0, -1)
                    .join(".");
                const rawConfig: string = await fs.readFile(filename, "utf-8");
                let configItem: any;
                try {
                    configItem = JSON.parse(rawConfig);
                } catch (err) {
                    console.error(filename + " contains invalid JSON.", err);
                }
                config.buildFromObject(configItem, [host, configName]);
            }
        }));
        const envKeys: string[] = Object.keys(process.env).filter(k => k.startsWith("ETA_"));
        for (const key of envKeys) {
            let tokens: string[] = key.replace(/__/g, "-").split("_").slice(1);
            if (key.toUpperCase() === key) {
                tokens = tokens.map(t => t.toLowerCase());
            }
            let value: any;
            try { value = JSON.parse(process.env[key]); }
            catch (err) { value = process.env[key]; }
            config.set(tokens.join("."), value);
        }
        return config;
    }
}

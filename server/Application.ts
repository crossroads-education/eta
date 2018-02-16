import * as eta from "../eta";
import * as events from "events";
import * as fs from "fs-extra";
import * as orm from "typeorm";
import * as redis from "redis";
import ModuleLoader from "./ModuleLoader";
import WebServer from "./WebServer";
import * as db from "../db";
Object.keys(db); // initializes models
import { connect as connectRedis } from "./api/redis";
const EventEmitter: typeof events.EventEmitter = require("promise-events");

export default class Application extends EventEmitter {
    public server: WebServer;
    /**
     * Load module files
     */
    public moduleLoaders: {[key: string]: ModuleLoader} = {};
    public configs: {[key: string]: eta.Configuration} = {};
    public controllers: (typeof eta.IHttpController)[] = [];
    public requestTransformers: (typeof eta.IRequestTransformer)[] = [];
    public staticFiles: {[key: string]: string} = {};
    public viewFiles: {[key: string]: string} = {};
    public viewMetadata: {[key: string]: {[key: string]: any}} = {};

    public redis: redis.RedisClient;

    public async init(): Promise<boolean> {
        await this.loadConfiguration();
        process.env.eta_timezone = this.configs.global.get("server.timezone");
        eta.logger.config = this.configs.global;
        this.server = new WebServer();
        this.server.app = this;
        await this.loadModules();
        await this.emit("init");
        eta.logger.info("Connecting to the database and initalizing ORM...");
        await this.connectDatabases();
        eta.logger.info("Successfully connected to the database.");
        this.redis = await connectRedis(this.configs.global);
        eta.logger.info("Successfully connected to the Redis server.");
        await this.emit("database-connect");
        return await this.server.init();
    }

    public start(): void {
        this.server.start();
    }

    public close(): Promise<void> {
        return this.server.close();
    }

    public async loadConfiguration(): Promise<void> {
        this.configs.root = await eta.Configuration.load();
        const hosts: string[] = await fs.readdir(eta.constants.basePath + "/config");
        hosts.forEach(h => this.configs[h] = this.configs.root.buildChild(["global.", h + "."]));
        delete this.configs.root;
    }

    public connectDatabases(): Promise<orm.Connection[]> {
        return Promise.all(Object.keys(this.configs).filter(k => k !== "global").map(k => {
            const config = this.configs[k];
            const modelDirs = this.configs.global.modules()
                .map(m => this.configs.global.get<string[]>(`modules.${m}.dirs.models`))
                .reduce((p, v) => p.concat(v), [])
                .map(d => d + "*.js");
            const logOptions = config.get("logger.logDatabaseQueries") ? ["error", "query"] : [];
            return orm.createConnection(eta._.extend<Partial<orm.ConnectionOptions>, orm.ConnectionOptions>({
                entities: modelDirs,
                synchronize: !config.get("db.isReadOnly"),
                logging: <any>logOptions,
                name: config.get("http.host"),
                namingStrategy: new eta.DatabaseNamingStrategy()
            }, <any>config.buildToObject("db.")));
        }));
    }

    public async verifyStaticFile(mvcPath: string): Promise<boolean> {
        if (this.staticFiles[mvcPath]) {
            const exists: boolean = await fs.pathExists(this.staticFiles[mvcPath]);
            if (!exists) {
                delete this.staticFiles[mvcPath];
            }
            return exists;
        }
        const staticDirs: string[] = this.configs.global.modules()
            .map(m => this.configs.global.get<string[]>(`modules.${m}.dirs.staticFiles`) || [])
            .reduce((p, v) => p.concat(v), []);
        for (const staticDir of staticDirs) {
            if (await fs.pathExists(staticDir + mvcPath)) {
                this.staticFiles[mvcPath] = staticDir + mvcPath;
                return true;
            }
        }
        return false;
    }

    public getActionsWithFlag(flag: string, context: eta.IHttpController, flagValue?: string | boolean | number): {
        flagValue: string | boolean | number | RegExp;
        action: (...args: any[]) => Promise<void>;
    }[] {
        const actions = this.controllers.map(c => {
            let flaggedActionKeys: string[] = Object.keys(c.prototype.route.actions).filter(k => !!c.prototype.route.actions[k].flags[flag]);
            if (flagValue !== undefined) {
                flaggedActionKeys = flaggedActionKeys.filter(k => c.prototype.route.actions[k].flags[flag] === flagValue);
            }
            if (flaggedActionKeys.length === 0) return [];
            return flaggedActionKeys.map(k => {
                const action = (...args: any[]) => {
                    let params = { server: this };
                    if (context !== undefined) {
                        params = eta._.extend(params, {
                            req: context.req,
                            res: context.res,
                            next: context.next
                        });
                    }
                    const instance: eta.IHttpController = new (<any>c.prototype.constructor)(params);
                    return (<any>instance)[k].bind(instance)(...args);
                };
                return {
                    action, flagValue: c.prototype.route.actions[k].flags[flag]
                };
            });
        }).filter(a => a.length > 0);
        return actions.length > 0 ? actions.reduce((p, v) => p.concat(v)) : [];
    }

    private async loadModules(): Promise<void> {
        eta.constants.controllerPaths = [];
        eta.constants.staticPaths = [];
        eta.constants.viewPaths = [];
        const moduleDirs: string[] = await fs.readdir(eta.constants.modulesPath);
        eta.logger.info(`Found ${moduleDirs.length} modules: ${moduleDirs.join(", ")}`);
        for (const moduleName of moduleDirs) {
            this.moduleLoaders[moduleName] = new ModuleLoader(moduleName, this);
            this.moduleLoaders[moduleName].on("controller-load", (controllerType: typeof eta.IHttpController) => {
                this.controllers = this.controllers.filter(c => // remove duplicates
                    c.prototype.route.raw !== controllerType.prototype.route.raw);
                this.controllers.push(controllerType);
                this.emit("controller-load", controllerType);
            });
            await this.moduleLoaders[moduleName].loadAll();
            if (!this.moduleLoaders[moduleName].isInitialized) {
                delete this.moduleLoaders[moduleName];
            }
        }
        // map all modules' objects into webserver's global arrays
        Object.keys(this.moduleLoaders).sort().forEach(k => {
            const moduleLoader: ModuleLoader = this.moduleLoaders[k];
            moduleLoader.lifecycleHandlers.forEach(LifecycleHandler => {
                new (<any>LifecycleHandler)().register(this);
            });
            this.requestTransformers = this.requestTransformers.concat(moduleLoader.requestTransformers);
            this.staticFiles = eta._.defaults(moduleLoader.staticFiles, this.staticFiles);
            this.viewFiles = eta._.defaults(moduleLoader.viewFiles, this.viewFiles);
            this.viewMetadata = eta._.defaults(moduleLoader.viewMetadata, this.viewMetadata);
        });
    }
}

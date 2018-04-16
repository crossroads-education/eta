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
    public logger: eta.StackLogger;
    public server: WebServer;
    /**
     * Load module files
     */
    public moduleLoaders: {[key: string]: ModuleLoader} = {};
    public configs: {[key: string]: eta.Configuration} = {};
    public controllers: {[key: string]: eta.HttpRoute} = {};
    public staticFiles: {[key: string]: string} = {};
    public viewFiles: {[key: string]: string} = {};
    public viewMetadata: {[key: string]: {[key: string]: any}} = {};

    public redis: redis.RedisClient;

    public async init(): Promise<boolean> {
        await this.loadConfiguration();
        process.env.eta_timezone = this.configs.global.get("server.timezone");
        this.logger = await eta.StackLogger.new(__dirname + "/../logs");
        this.server = new WebServer();
        this.server.app = this;
        await this.loadModules();
        await this.emit("app:start");
        this.logger.info("Connecting to the database and initalizing ORM...");
        await this.connectDatabases();
        this.logger.info("Successfully connected to the database.");
        this.redis = await connectRedis(this.configs.global, err => this.logger.error(err));
        this.logger.info("Successfully connected to the Redis server.");
        await this.emit("database:connect");
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
                .filter(d => d !== undefined)
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

    /** checks that the static file referenced by mvcPath actually exists in filesystem */
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

    public getActionsWithFlag<T = void>(flag: string, context: eta.RequestHandler, flagValue?: string | boolean | number): {
        flagValue: any;
        action: (...args: any[]) => Promise<T>;
    }[] {
        return Object.values(this.controllers).map(route => {
            return route.actions.filter(a => !!a[flag] && (flagValue === undefined || a[flag] === flagValue)).map(a => {
                const action = (...args: any[]) => {
                    let params = { server: this };
                    if (context !== undefined) {
                        params = eta._.extend(params, {
                            req: context.req,
                            res: context.res,
                            next: context.next
                        });
                    }
                    const instance: eta.HttpController = new route.controller({ app: this });
                    return (<any>instance)[a.name].bind(instance)(...args);
                };
                return {
                    action, flagValue: a[flag]
                };
            });
        }).reduce((p, v) => p.concat(v), []);
    }

    private async loadModules(): Promise<void> {
        const moduleDirs: string[] = await fs.readdir(eta.constants.modulesPath);
        this.logger.info(`Found ${moduleDirs.length} modules: ${moduleDirs.join(", ")}`);
        for (const moduleName of moduleDirs) {
            this.moduleLoaders[moduleName] = new ModuleLoader(moduleName, this);
            this.moduleLoaders[moduleName].on("controller-load", (route: eta.HttpRoute) => {
                delete(this.controllers[route.route]);
                this.controllers[route.route] = route;
                this.emit("load:controller", route);
            }).on("metadata-load", (mvcPath: string) => {
                this.viewMetadata[mvcPath] = this.moduleLoaders[moduleName].viewMetadata[mvcPath];
                if (this.moduleLoaders[moduleName].isInitialized) {
                    const includePaths: string[] = (this.viewMetadata[mvcPath].include || []);
                    for (const includePath of includePaths) {
                        this.viewMetadata[mvcPath] = eta._.merge(this.viewMetadata[includePath] || {}, this.viewMetadata[mvcPath]);
                    }
                }
                this.emit("load:view-metadata");
            });
            await this.moduleLoaders[moduleName].loadAll();
            if (!this.moduleLoaders[moduleName].isInitialized) {
                delete this.moduleLoaders[moduleName];
            }
        }
        const lifecycleHandlers: (new (app: Application) => eta.LifecycleHandler)[] = [];
        // map all modules' objects into webserver's global arrays
        Object.keys(this.moduleLoaders).sort().forEach(k => {
            const moduleLoader: ModuleLoader = this.moduleLoaders[k];
            lifecycleHandlers.push(...<any[]>moduleLoader.lifecycleHandlers);
            this.staticFiles = eta._.defaults(moduleLoader.staticFiles, this.staticFiles);
            this.viewFiles = eta._.defaults(moduleLoader.viewFiles, this.viewFiles);
        });
        lifecycleHandlers.forEach(LifecycleHandler => new LifecycleHandler(this).register());
        let unvisitedPaths: string[] = Object.keys(this.viewMetadata).filter(k => (this.viewMetadata[k].include || []).length === 0);
        const nextPaths: string[] = [];
        while (unvisitedPaths.length > 0) {
            const currentPath = unvisitedPaths.splice(0, 1)[0];
            const otherPaths = Object.keys(this.viewMetadata).filter(k => (this.viewMetadata[k].include || []).includes(currentPath));
            for (const otherPath of otherPaths) {
                this.viewMetadata[otherPath] = eta._.merge(this.viewMetadata[otherPath], this.viewMetadata[currentPath]);
                nextPaths.push(otherPath);
            }
            if (unvisitedPaths.length === 0) unvisitedPaths = eta._.uniq(nextPaths.splice(0, nextPaths.length));
        }
    }
}

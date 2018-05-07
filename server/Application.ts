import * as eta from "../eta";
import * as events from "events";
import * as fs from "fs-extra";
import * as orm from "typeorm";
import * as redis from "redis";
import ModuleLoader from "./ModuleLoader";
import WebServer from "./WebServer";
import * as db from "../db";
Object.keys(db); // initializes models
const EventEmitter: typeof events.EventEmitter = require("promise-events");

export default class Application extends EventEmitter {
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
        (<any>eta).logger = await new eta.StackLogger(__dirname + "/../logs");
        this.server = new WebServer();
        this.server.app = this;
        await this.loadModules();
        await this.emit("app:start");
        eta.logger.info("Connecting to the database and initalizing ORM...");
        await this.connectDatabases();
        eta.logger.info("Successfully connected to the database.");
        try {
            this.redis = <any>await this.connectRedis();
        } catch (err) {
            eta.logger.error(err);
            return false;
        }
        eta.logger.info("Successfully connected to the Redis server.");
        await this.emit("database:connect");
        return await this.server.init();
    }

    start(): void {
        this.server.start();
    }

    close(): Promise<void> {
        return this.server.close();
    }

    private async loadConfiguration(): Promise<void> {
        this.configs.root = await eta.Configuration.load();
        const hosts: string[] = await fs.readdir(eta.constants.basePath + "/config");
        hosts.forEach(h => this.configs[h] = this.configs.root.buildChild(["global.", h + "."]));
        delete this.configs.root;
    }

    private connectDatabases(): Promise<orm.Connection[]> {
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

    private connectRedis(): Promise<redis.RedisClient> {
        const tempClient: redis.RedisClient = redis.createClient(
            this.configs.global.get("session.port"),
            this.configs.global.get("session.host"));
        return new Promise<redis.RedisClient>((resolve, reject) => {
            tempClient.on("error", reject);
            tempClient.on("ready", resolve);
        });
    }

    /** checks that the static file referenced by mvcPath actually exists in filesystem */
    async verifyStaticFile(path: string): Promise<boolean> {
        if (this.staticFiles[path]) {
            const exists: boolean = await fs.pathExists(this.staticFiles[path]);
            if (!exists) {
                delete this.staticFiles[path];
            }
            return exists;
        }
        const staticDirs: string[] = this.configs.global.modules()
            .map(m => this.configs.global.get<string[]>(`modules.${m}.dirs.staticFiles`) || [])
            .reduce((p, v) => p.concat(v), []);
        for (const staticDir of staticDirs) {
            if (await fs.pathExists(staticDir + path)) {
                this.staticFiles[path] = staticDir + path;
                return true;
            }
        }
        return false;
    }

    getActionsWithFlag<T = void>(flag: string, context: eta.RequestHandler, flagValue?: string | boolean | number): {
        flagValue: any;
        action: (...args: any[]) => Promise<T>;
    }[] {
        context = context || <any>{ server: this.server };
        return Object.values(this.controllers).map(route => {
            return route.actions.filter(a => !!a[flag] && (flagValue === undefined || a[flag] === flagValue)).map(a => ({
                flagValue: a[flag],
                action: (...args: any[]) => {
                    const instance: eta.HttpController = new route.controller(context);
                    return (<any>instance)[a.name].bind(instance)(...args);
                }
            }));
        }).reduce((p, v) => p.concat(v), []);
    }

    private async loadModules(): Promise<void> {
        const moduleDirs: string[] = await fs.readdir(eta.constants.modulesPath);
        eta.logger.info(`Found ${moduleDirs.length} modules: ${moduleDirs.join(", ")}`);
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
                this.viewMetadata[otherPath] = eta._.mergeWith(this.viewMetadata[otherPath], this.viewMetadata[currentPath],
                    (objValue: any, srcValue: any) => {
                        if (!objValue || !srcValue || objValue.constructor.name !== srcValue.constructor.name || objValue.constructor.name !== "Array") return undefined;
                        return srcValue.concat(objValue);
                    }
                );
                nextPaths.push(otherPath);
            }
            if (unvisitedPaths.length === 0) unvisitedPaths = eta._.uniq(nextPaths.splice(0, nextPaths.length));
        }
    }
}

import * as chokidar from "chokidar";
import * as eta from "../eta";
import * as events from "events";
import * as fs from "fs-extra";
import * as path from "path";
import Application from "./Application";

const requireReload: (path: string) => any = require("require-reload")(require);

export default class ModuleLoader extends events.EventEmitter {
    public controllers: {[key: string]: eta.HttpRoute};
    public lifecycleHandlers: (typeof eta.LifecycleHandler)[];
    /** webPath: fsPath */
    public staticFiles: {[key: string]: string};
    /** webPath: fsPath */
    public viewFiles: {[key: string]: string};
    public viewMetadata: {[key: string]: {[key: string]: any}};

    public moduleName: string;
    public config: eta.ModuleConfiguration;
    public isInitialized = false;

    private app: Application;
    private requireFunc: (path: string) => any = require;

    public constructor(moduleName: string, app: Application) {
        super();
        this.moduleName = moduleName;
        this.app = app;
    }

    public async loadAll(): Promise<void> {
        await this.loadConfig();
        if (this.config.disable || (process.env.ETA_TESTING === "true" && this.config.name !== this.app.configs.global.get("server.testModule"))) {
            return;
        }
        await Promise.all([
            this.loadControllers(),
            this.loadStatic(),
            this.loadViewMetadata(),
            this.loadViews(),
            this.loadLifecycleHandlers()
        ]);
        this.setupWatchers();
        this.requireFunc = requireReload;
        this.isInitialized = true;
    }

    public async loadConfig(): Promise<void> {
        const rootDir: string = eta.constants.modulesPath + this.moduleName + "/";
        const rawConfig: Buffer = await fs.readFile(rootDir + "eta.json");
        this.config = JSON.parse(rawConfig.toString());
        // prepend root dir to all config-based dirs
        this.config.rootDir = rootDir;
        Object.keys(this.config.dirs).forEach(k => {
            const dirs: string[] = (<any>this.config.dirs)[k];
            (<any>this.config.dirs)[k] = dirs.map(d => {
                if (!d.endsWith("/")) {
                    d += "/";
                }
                if (d.startsWith("/")) {
                    d = d.substr(1);
                }
                return this.config.rootDir + d;
            });
        });
        const configPath: string = eta.constants.basePath + "config/modules/" + this.moduleName + ".json";
        if ((await fs.pathExists(configPath)) === true) {
            this.config = eta._.defaults(JSON.parse(await fs.readFile(configPath, "utf-8")), this.config);
        }
        Object.values(this.app.configs).forEach(c => c.buildFromObject(this.config, ["modules", this.moduleName]));
    }

    public async loadControllers(): Promise<void> {
        this.controllers = {};
        const controllerFiles: string[] = (await eta.fs.recursiveReaddirs(this.config.dirs.controllers))
            .filter(f => f.endsWith(".js"));
        controllerFiles.forEach(this.loadController.bind(this));
    }

    private loadController(path: string): eta.HttpRoute {
        path = path.replace(/\\/g, "/");
        if (!path.endsWith(".js")) return undefined;
        let HttpController: new () => eta.HttpController;
        try {
            // load the controller
            HttpController = this.requireFunc(path).default;
        } catch (err) {
            eta.logger.warn("Couldn't load controller: " + path);
            eta.logger.error(err);
            return undefined;
        }
        if (!Reflect.hasMetadata("route", HttpController)) {
            // @controller() hasn't been applied
            eta.logger.warn("Couldn't load controller: " + path + ". Please ensure all decorators are properly applied.");
            return undefined;
        }
        let routeUrl: string = Reflect.getMetadata("route", HttpController);
        // clean up the route to look like /foo/bar (not foo/bar/, etc)
        if (!routeUrl.startsWith("/")) routeUrl = "/" + routeUrl; // absolute url
        if (routeUrl.endsWith("/")) routeUrl = routeUrl.slice(0, -1); // remove trailing slash
        const controller = new HttpController();
        const route: eta.HttpRoute = {
            controller: HttpController,
            route: routeUrl,
            actions: Object.getOwnPropertyNames(HttpController.prototype) // get all methods
                .filter(k => k !== "constructor" && typeof(HttpController.prototype[k]) === "function")
                .map(method => {
                    const action: Partial<eta.HttpAction> = Reflect.getMetadata("action", controller, method) || {};
                    // make sure action.url is an absolute path
                    if (action.url && !action.url.startsWith("/")) action.url = routeUrl + "/" + action.url;
                    const params: {[key: string]: eta.HttpActionParam} = {};
                    const paramTypes: Function[] = Reflect.getMetadata("design:paramtypes", controller, method) || [];
                    // parameter indices that aren't required
                    const optionalIndices: number[] = Reflect.getMetadata("optional", controller, method) || [];
                    eta.object.getFunctionParameterNames((<any>controller)[method]).forEach((name, index) =>
                        params[name] = {
                            name,
                            type: paramTypes[index] || Object,
                            isRequired: !optionalIndices.includes(index)
                        });
                    return eta._.defaults<Partial<eta.HttpAction>, eta.HttpAction>(action, {
                        name: method,
                        url: routeUrl + "/" + method,
                        method: "GET",
                        params,
                        groupParams: false
                    });
                })
        };
        this.emit("controller-load", route);
        return route;
    }

    public loadStatic(): Promise<void> {
        this.staticFiles = {};
        return <any>Promise.all(this.config.dirs.staticFiles.map(async d => {
            const files: string[] = await eta.fs.recursiveReaddirs([d]);
            files.forEach(f => {
                const webPath: string = f.substring(d.length - 1);
                this.staticFiles[webPath] = f;
            });
        }));
    }

    public async loadViewMetadata(): Promise<void> {
        this.viewMetadata = {};
        await Promise.all(this.config.dirs.views.map(async viewDir => {
            const files: string[] = (await eta.fs.recursiveReaddirs([viewDir]))
                .filter(f => f.endsWith(".json"));
            for (const filename of files) {
                await this.loadViewMetadataFile(filename, viewDir, false);
            }
        }));
    }

    private async loadViewMetadataFile(filename: string, viewDir: string, forceReload: boolean): Promise<void> {
        const mvcPath = filename.substring(viewDir.length - 1, filename.length - 5);
        if (this.viewMetadata[mvcPath] !== undefined && !forceReload) {
            eta.logger.warn("View metadata " + mvcPath + " was already loaded - keeping the first one found (not " + filename + ").");
            return;
        }
        let metadata: {[key: string]: any};
        try {
            metadata = await fs.readJson(filename);
        } catch (err) {
            eta.logger.warn("Encountered invalid JSON in " + path);
            eta.logger.error(err);
        }
        this.viewMetadata[mvcPath] = metadata;
        this.emit("metadata-load", mvcPath);
    }

    public loadViews(): Promise<void> {
        this.viewFiles = {};
        return <any>Promise.all(this.config.dirs.views.map(async d => {
            const files: string[] = await eta.fs.recursiveReaddirs([d]);
            files.filter(f => f.endsWith(".pug")).forEach(f => {
                const webPath: string = f.substring(d.length - 1);
                this.viewFiles[webPath.substring(0, webPath.length - 4)] = f;
            });
        }));
    }

    public async loadLifecycleHandlers(): Promise<void> {
        const loadResult = await eta.misc.loadModules(this.config.dirs.lifecycleHandlers, this.requireFunc);
        loadResult.errors.forEach(err => eta.logger.error(err));
        this.lifecycleHandlers = loadResult.modules.map(m => m.default);
    }

    private setupWatchers(): void {
        if (!this.app.configs.global.get("dev.enable")) return;
        // controllers
        chokidar.watch(this.config.dirs.controllers, {
            persistent: false
        }).on("change", (path: string) => {
            const route: eta.HttpRoute = this.loadController(path);
            if (route !== undefined) {
                eta.logger.trace(`Reloaded controller: ${route.controller.prototype.constructor.name} (${route.route})`);
            }
        });
        // view metadata
        chokidar.watch(this.config.dirs.views, {
            persistent: false,
            ignored: /\.pug$/
        }).on("change", (path: string) => {
            path = path.replace(/\\/g, "/");
            const viewDir = this.config.dirs.views.find(d => path.startsWith(d));
            this.loadViewMetadataFile(path, viewDir, true).then(() => {
                eta.logger.trace(`Reloaded view metadata: ${path.substring(viewDir.length)}`);
            }).catch(err => {
                eta.logger.error(err);
            });
        });
    }
}

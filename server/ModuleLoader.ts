import * as chokidar from "chokidar";
import * as eta from "../eta";
import * as events from "events";
import { IModuleConfiguration } from "./api/config";
import * as fs from "fs-extra";
import * as path from "path";

const requireReload: (path: string) => any = require("require-reload")(require);

export default class ModuleLoader extends events.EventEmitter {
    public authProvider: typeof eta.IAuthProvider;
    public controllers: {[key: string]: typeof eta.IHttpController};
    public lifecycleHandlers: (typeof eta.ILifecycleHandler)[];
    public requestTransformers: (typeof eta.IRequestTransformer)[];
    /** webPath: fsPath */
    public staticFiles: {[key: string]: string};
    /** webPath: fsPath */
    public viewFiles: {[key: string]: string};
    public viewMetadata: {[key: string]: {[key: string]: any}};

    public moduleName: string;
    public config: IModuleConfiguration;
    public isInitialized = false;

    private requireFunc: (path: string) => any = require;

    public constructor(moduleName: string) {
        super();
        this.moduleName = moduleName;
    }

    public async loadAll(): Promise<void> {
        await this.loadConfig();
        if (this.config.disable || (process.env.ETA_TESTING === "true" && this.config.name !== eta.config.server.testModule)) {
            return;
        }
        await Promise.all([
            this.loadControllers(),
            this.loadStatic(),
            this.loadViewMetadata(),
            this.loadViews(),
            this.loadLifecycleHandlers(),
            this.loadRequestTransformers(),
            this.loadAuthProvider()
        ]);
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
        eta.config.modules[this.moduleName] = this.config;
    }

    public async loadAuthProvider(): Promise<void> {
        const authPath: string = this.config.rootDir + "auth.js";
        if (!await fs.pathExists(authPath)) return;
        try {
            this.authProvider = require(authPath).default;
        } catch (err) {
            eta.logger.warn("Couldn't load authentication provider: " + authPath);
            eta.logger.error(err);
        }
    }

    public async loadControllers(): Promise<void> {
        this.controllers = {};
        const controllerFiles: string[] = (await eta.fs.recursiveReaddirs(this.config.dirs.controllers))
            .filter(f => f.endsWith(".js"));
        if (eta.config.dev.enable) {
            const watcher: fs.FSWatcher = chokidar.watch(this.config.dirs.controllers, {
                "persistent": false
            });
            watcher.on("change", (path: string) => {
                const controllerType: typeof eta.IHttpController = this.loadController(path);
                if (controllerType !== undefined) {
                    eta.logger.trace(`Reloaded controller ${controllerType.name} (${controllerType.prototype.route.raw})`);
                }
            });
        }
        controllerFiles.forEach(this.loadController.bind(this));
    }

    private loadController(path: string): typeof eta.IHttpController {
        path = path.replace(/\\/g, "/");
        if (!path.endsWith(".js")) {
            return undefined;
        }
        let controllerType: typeof eta.IHttpController;
        try {
            controllerType = this.requireFunc(path).default;
        } catch (err) {
            eta.logger.warn("Couldn't load controller: " + path);
            eta.logger.error(err);
            return undefined;
        }
        if (controllerType.prototype.route === undefined) {
            eta.logger.warn("Couldn't load controller: " + path + ". Please ensure all decorators are properly applied.");
            return undefined;
        }
        const actions: eta.HttpRouteAction[] = Object.values(controllerType.prototype.route.actions);
        for (const action of actions) { // checking @eta.mvc.flags({script})
            if (!action.flags.script) continue;
            const dir: string = eta._.first(this.config.dirs.controllers.filter(dir =>
                fs.pathExistsSync(dir + action.flags.script)));
            if (dir === undefined) eta.logger.warn("Couldn't find script file " + action.flags.script + " for controller " + path);
            else action.flags.script = dir + action.flags.script;
        }
        this.emit("controller-load", controllerType);
        return controllerType;
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

    public loadViewMetadata(): Promise<void> {
        this.viewMetadata = {};
        return <any>Promise.all(this.config.dirs.views.map(async viewDir => {
            const files: string[] = (await eta.fs.recursiveReaddirs([viewDir]))
                .filter(f => f.endsWith(".json"));
            for (const path of files) {
                await this.loadSingleViewMetadata(path, viewDir);
            }
        }));
    }

    private async loadSingleViewMetadata(path: string, viewDir: string): Promise<{[key: string]: any}> {
        const mvcPath: string = path.substring(viewDir.length - 1, path.length - 5);
        if (this.viewMetadata[mvcPath]) {
            return this.viewMetadata[mvcPath];
        }
        let metadata: {[key: string]: any};
        try {
            const rawJson: string = (await fs.readFile(path)).toString();
            metadata = JSON.parse(rawJson);
        } catch (err) {
            eta.logger.warn("Encountered invalid JSON in " + path);
            eta.logger.error(err);
            return undefined;
        }
        if (metadata.include !== undefined) {
            for (let p of metadata.include) {
                p = p.startsWith("/") ? p.substring(1) : p;
                const more: {[key: string]: any} = await this.loadSingleViewMetadata(viewDir + p, viewDir);
                if (more !== undefined) {
                    // TODO: Fix deprecated usage
                    metadata = eta.object.merge(more, metadata, true);
                }
            }
        }
        this.viewMetadata[mvcPath] = metadata;
        return metadata;
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

    public async loadRequestTransformers(): Promise<void> {
        const loadResult = await eta.misc.loadModules(this.config.dirs.requestTransformers, this.requireFunc);
        loadResult.errors.forEach(err => eta.logger.error(err));
        this.requestTransformers = loadResult.modules.map(m => m.default);
    }
}

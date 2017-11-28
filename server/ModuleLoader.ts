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
        const controllerFiles: string[] = (await this.getFiles(this.config.dirs.controllers))
            .filter(f => f.endsWith(".js"));
        if (eta.config.dev.enable) {
            const watcher: fs.FSWatcher = chokidar.watch(this.config.dirs.controllers, {
                "persistent": false
            });
            watcher.on("change", (path: string) => {
                const controllerType: typeof eta.IHttpController = this.loadController(path);
                if (controllerType !== undefined) {
                    eta.logger.trace(`Reloaded controller ${controllerType.name} (${controllerType.prototype.getRoutes().join(", ")})`);
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
        const requireTemp = this.isInitialized ? requireReload : require;
        let controllerType: typeof eta.IHttpController;
        try {
            controllerType = requireTemp(path).default;
        } catch (err) {
            eta.logger.warn("Couldn't load controller: " + path);
            eta.logger.error(err);
            return undefined;
        }
        if (!controllerType.prototype.routes) {
            eta.logger.warn("Couldn't load controller: " + path + ". Please ensure all decorators are properly applied.");
            return undefined;
        }
        this.emit("controller-load", controllerType);
        return controllerType;
    }

    public loadStatic(): Promise<void> {
        this.staticFiles = {};
        return <any>Promise.all(this.config.dirs.staticFiles.map(async d => {
            const files: string[] = await this.getFiles([d]);
            files.forEach(f => {
                const webPath: string = f.substring(d.length - 1);
                this.staticFiles[webPath] = f;
            });
        }));
    }

    public loadViewMetadata(): Promise<void> {
        this.viewMetadata = {};
        return <any>Promise.all(this.config.dirs.views.map(async viewDir => {
            const files: string[] = (await this.getFiles([viewDir]))
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
            const files: string[] = await this.getFiles([d]);
            files.filter(f => f.endsWith(".pug")).forEach(f => {
                const webPath: string = f.substring(d.length - 1);
                this.viewFiles[webPath.substring(0, webPath.length - 4)] = f;
            });
        }));
    }

    public async loadLifecycleHandlers(): Promise<void> {
        const lifecycleFiles: string[] = (await this.getFiles(this.config.dirs.lifecycleHandlers))
            .filter(f => f.endsWith(".js"));
        const requireTemp = this.isInitialized ? requireReload : require;
        this.lifecycleHandlers = lifecycleFiles.map(filename => {
            try {
                return <typeof eta.ILifecycleHandler>requireTemp(filename).default;
            } catch (err) {
                eta.logger.warn(`Couldn't load lifecycle handler ${filename}`);
                eta.logger.error(err);
            }
            return undefined;
        });
    }

    public async loadRequestTransformers(): Promise<void> {
        const transformerFiles: string[] = (await this.getFiles(this.config.dirs.requestTransformers))
            .filter(f => f.endsWith(".js"));
        const requireTemp = this.isInitialized ? requireReload : require;
        this.requestTransformers = transformerFiles.map(filename => {
            try {
                return <typeof eta.IRequestTransformer>requireTemp(filename).default;
            } catch (err) {
                eta.logger.warn(`Couldn't load request transformer ${filename}`);
                eta.logger.error(err);
            }
            return undefined;
        });
    }

    private async getFiles(rootDirectories: string[]): Promise<string[]> {
        let files: string[] = [];
        for (const dir of rootDirectories) {
            files = files.concat((await eta.fs.recursiveReaddir(dir)).sort()
                .map(f => f.replace(/\\/g, "/")));
        }
        return files;
    }
}

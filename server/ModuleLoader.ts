import * as eta from "../eta";
import { IModuleConfiguration } from "./api/config";
import * as fs from "fs-extra";

const requireReload: (path: string) => any = require("require-reload")(require);

export default class ModuleLoader {
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
        this.moduleName = moduleName;
    }

    public async loadAll(): Promise<void> {
        await this.loadConfig();
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
        Object.keys(this.config).filter(k => k.endsWith("Dirs")).forEach(k => {
            const dirs: string[] = (<any>this.config)[k];
            (<any>this.config)[k] = dirs.map(d => {
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
        if ((await eta.fs.exists(configPath)) === true) {
            this.config = eta.object.merge(JSON.parse(await fs.readFile(configPath, "utf-8")), this.config);
        }
        eta.config.modules[this.moduleName] = this.config;
    }

    public async loadAuthProvider(): Promise<void> {
        const authPath: string = this.config.rootDir + "auth.js";
        if (!await eta.fs.exists(authPath)) return;
        try {
            this.authProvider = require(authPath).default;
        } catch (err) {
            eta.logger.warn("Couldn't load authentication provider: " + authPath);
            eta.logger.error(err);
        }
    }

    public async loadControllers(): Promise<void> {
        this.controllers = {};
        const controllerFiles: string[] = (await this.getFiles(this.config.controllerDirs))
            .filter(f => f.endsWith(".js"));
        const requireTemp = this.isInitialized ? requireReload : require;
        controllerFiles.forEach(cf => {
            try {
                const controllerType: typeof eta.IHttpController = requireTemp(cf).default;
                if (!controllerType.prototype.routes) {
                    eta.logger.warn("Couldn't load controller: " + cf + ". Please ensure all decorators are properly applied.");
                    return;
                }
                controllerType.prototype.routes.forEach(r => {
                    this.controllers[r] = controllerType;
                });
            } catch (err) {
                eta.logger.warn("Couldn't load controller: " + cf);
                eta.logger.error(err);
            }
        });
    }

    public async loadStatic(): Promise<void> {
        this.staticFiles = {};
        await eta.array.forEachAsync(this.config.staticDirs, async d => {
            const files: string[] = await this.getFiles([d]);
            files.forEach(f => {
                const webPath: string = f.substring(d.length - 1);
                this.staticFiles[webPath] = f;
            });
        });
    }

    public async loadViewMetadata(): Promise<void> {
        this.viewMetadata = {};
        await eta.array.forEachAsync(this.config.viewDirs, async viewDir => {
            const files: string[] = (await this.getFiles([viewDir]))
                .filter(f => f.endsWith(".json"));
            await eta.array.forEachAsync(files, path => {
                return <Promise<any>>this.loadSingleViewMetadata(path, viewDir);
            }, true);
        });
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
            return undefined;
        }
        if (metadata.include !== undefined) {
            eta.array.forEachAsync(metadata.include, async (p: string) => {
                p = p.startsWith("/") ? p.substring(1) : p;
                const more: {[key: string]: any} = await this.loadSingleViewMetadata(viewDir + p, viewDir);
                if (more !== undefined) {
                    metadata = eta.object.merge(more, metadata, true);
                }
            }, true);
        }
        this.viewMetadata[mvcPath] = metadata;
        return metadata;
    }

    public async loadViews(): Promise<void> {
        this.viewFiles = {};
        await eta.array.forEachAsync(this.config.viewDirs, async d => {
            const files: string[] = await this.getFiles([d]);
            files.filter(f => f.endsWith(".pug")).forEach(f => {
                const webPath: string = f.substring(d.length - 1);
                this.viewFiles[webPath.substring(0, webPath.length - 4)] = f;
            });
        });
    }

    public async loadLifecycleHandlers(): Promise<void> {
        const lifecycleFiles: string[] = (await this.getFiles(this.config.lifecycleDirs))
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
        const transformerFiles: string[] = (await this.getFiles(this.config.transformerDirs))
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
        await eta.array.forEachAsync(rootDirectories, async dir => {
            files = files.concat((await eta.fs.recursiveReaddir(dir)).sort()
                .map(f => f.replace(/\\/g, "/")));
        }, true);
        return files;
    }
}

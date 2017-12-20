import * as eta from "../eta";
import * as events from "events";
import * as fs from "fs-extra";
import * as orm from "typeorm";
import ModuleLoader from "./ModuleLoader";
import WebServer from "./WebServer";
import { connect as connectDatabase } from "./api/db";
import { connect as connectRedis } from "./api/redis";
const EventEmitter: typeof events.EventEmitter = require("promise-events");

export default class Application extends EventEmitter {
    public server: WebServer;
    /**
     * Load module files
     */
    public moduleLoaders: {[key: string]: ModuleLoader} = {};

    /** key: route */
    public controllers: (typeof eta.IHttpController)[] = [];
    public requestTransformers: (typeof eta.IRequestTransformer)[] = [];
    public staticFiles: {[key: string]: string} = {};
    public viewFiles: {[key: string]: string} = {};
    public viewMetadata: {[key: string]: {[key: string]: any}} = {};

    public connection: orm.Connection;

    public async init(): Promise<boolean> {
        this.server = new WebServer();
        this.server.app = this;
        await this.loadModules();
        await this.emit("init");
        this.connection = await connectDatabase();
        (<any>eta).redis = connectRedis();
        eta.logger.info("Successfully connected to the database.");
        await this.emit("database-connect");
        return await this.server.init();
    }

    public start(): void {
        this.server.start();
    }

    public close(): Promise<void> {
        return this.server.close();
    }

    public async verifyStaticFile(mvcPath: string): Promise<boolean> {
        if (this.staticFiles[mvcPath]) {
            const exists: boolean = await fs.pathExists(this.staticFiles[mvcPath]);
            if (!exists) {
                delete this.staticFiles[mvcPath];
            }
            return exists;
        }
        const staticDirs: string[] = Object.keys(eta.config.modules)
            .map(k => eta.config.modules[k].dirs.staticFiles)
            .reduce((p, a) => p.concat(a));
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
            let flaggedActionKeys: string[] = Object.keys(c.prototype.actions).filter(k => !!c.prototype.actions[k].flags[flag]);
            if (flagValue !== undefined) {
                flaggedActionKeys = flaggedActionKeys.filter(k => c.prototype.actions[k].flags[flag] === flagValue);
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
                    action, flagValue: c.prototype.actions[k].flags[flag]
                };
            });
        }).filter(a => a.length > 0);
        return actions.length > 0 ? actions.reduce((p, v) => p.concat(v)) : [];
    }

    private async loadModules(): Promise<void> {
        eta.config.modules = {};
        eta.constants.controllerPaths = [];
        eta.constants.staticPaths = [];
        eta.constants.viewPaths = [];
        const moduleDirs: string[] = await fs.readdir(eta.constants.modulesPath);
        eta.logger.info(`Found ${moduleDirs.length} modules: ${moduleDirs.join(", ")}`);
        for (const moduleName of moduleDirs) {
            this.moduleLoaders[moduleName] = new ModuleLoader(moduleName);
            this.moduleLoaders[moduleName].on("controller-load", (controllerType: typeof eta.IHttpController) => {
                const realRoutes: string = controllerType.prototype.getRoutes().join(", ");
                this.controllers = this.controllers.filter(c => {
                    return c.prototype.getRoutes().join(", ") !== realRoutes;
                });
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

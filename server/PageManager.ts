import * as express from "express";
import * as fs from "fs";
import * as api from "./api";
import * as helpers from "../helpers";
import RequestHandler from "./RequestHandler";

const requireReload: (path: string) => any = require("require-reload")(require);

export default class PageManager {
    private isInitialized = false;
    private controllers: (typeof api.IHttpController)[] = undefined;
    private staticViewData: {[key: string]: any};
    public constructor() { }

    public async load(): Promise<void> {
        const controllerFiles: string[] = await helpers.fs.recursiveReaddir(api.constants.controllerPath);
        this.controllers = controllerFiles
            .filter(f => f.endsWith(".js"))
            .sort()
            .map(f => this.loadController(f.replace(/\\/g, "/")));
        const viewStaticFiles: string[] = await helpers.fs.recursiveReaddir(api.constants.viewPath);
        this.staticViewData = {};
        viewStaticFiles
            .filter(f => f.endsWith(".json"))
            .sort()
            .forEach(f => {
                this.loadStatic(f.replace(/\\/g, "/"));
            });
        this.isInitialized = true;
    }

    public async reload(): Promise<void> {
        this.controllers = undefined;
        this.staticViewData = {};
        return this.load();
    }

    private loadController(path: string): typeof api.IHttpController {
        const requireTemp = this.isInitialized ? requireReload : require;
        try {
            return require(path).default;
        } catch (err) {
            api.logger.warn(`Couldn't load controller ${path}`);
            api.logger.error(err);
        }
        return undefined;
    }

    private loadStatic(path: string): void {
        const mvcPath: string = path.substring(api.constants.viewPath.length - 1, path.length - 5);
        if (this.staticViewData[mvcPath]) {
            return this.staticViewData[mvcPath];
        }
        let view: any;
        try {
            view = JSON.parse(fs.readFileSync(path).toString());
            if (view.include !== undefined) {
                view.include.forEach((path: string) => {
                    path = path.startsWith("/") ? path.substring(1) : path;
                    const more: any = this.loadStatic(api.constants.viewPath + path);
                    view = helpers.object.merge(more, view);
                });
            }
        } catch (err) {
            api.logger.warn("Encountered invalid JSON in " + path);
            return;
        }
        this.staticViewData[mvcPath] = view;
        return view;
    }

    public handle(req: express.Request, res: express.Response, next: Function): void {
        const tokens: string[] = req.mvcPath.split("/");
        const action: string = tokens.splice(-1, 1)[0];
        const route: string = tokens.join("/");
        let controllerClass: typeof api.IHttpController;
        try {
            controllerClass = this.controllers
               .find(c => c.prototype.routes.indexOf(route) !== -1);
        } catch (err) {
            api.logger.warn("Couldn't load controller for request. Are there non-controller files in /content/controllers?");
        }
        if (this.staticViewData[req.mvcPath]) {
            res.view = this.staticViewData[req.mvcPath];
        }
        new RequestHandler({
            route,
            action,
            controllerPrototype: controllerClass ? controllerClass.prototype : undefined,
            req,
            res,
            next
        }).handle().then(() => { })
        .catch(err => {
            api.logger.error(err);
        });
    }
}

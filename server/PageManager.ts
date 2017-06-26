import * as express from "express";
import * as fs from "fs";
import * as linq from "linq";
import * as recursiveReaddir from "recursive-readdir";
import * as api from "./api";
import * as helpers from "../helpers";
import RequestHandler from "./RequestHandler";

export default class PageManager {
    private controllers: linq.IEnumerable<typeof api.IHttpController> = null;
    private staticViewData: {[key: string]: any};
    public constructor() { }

    public async load(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            recursiveReaddir(api.constants.controllerPath, (err: NodeJS.ErrnoException, files: string[]) => {
                if (err) {
                    api.logger.error(`Couldn't read the controller directory (${api.constants.controllerPath}): ${err.message}`);
                    return reject(err);
                }
                let controllers: (typeof api.IHttpController)[] = [];
                linq.from(files)
                    .where(f => f.endsWith(".js"))
                    .forEach(f => {
                        controllers.push(this.loadController(f.replace(/\\/g, "/")));
                    });
                this.controllers = linq.from(controllers);
                recursiveReaddir(api.constants.viewPath, (err: NodeJS.ErrnoException, files: string[]) => {
                    if (err) {
                        api.logger.error(`Couldn't read the view directory (${api.constants.viewPath}): ${err.message}`);
                        return reject(err);
                    }
                    this.staticViewData = {};
                    linq.from(files)
                        .where(f => f.endsWith(".json"))
                        .forEach(f => {
                            this.loadStatic(f.replace(/\\/g, "/"));
                        });
                    resolve();
                });
            });
        });
    }

    private loadController(path: string): typeof api.IHttpController {
        try {
            return require(path).default;
        } catch (err) {
            api.logger.warn(`Couldn't load controller ${path}`);
            api.logger.error(err);
        }
        return null;
    }

    private loadStatic(path: string): void {
        let mvcPath: string = path.substring(api.constants.viewPath.length - 1, path.length - 5);
        if (this.staticViewData[mvcPath]) {
            return this.staticViewData[mvcPath];
        }
        let view: any;
        try {
            view = JSON.parse(fs.readFileSync(path).toString());
            if (view.include) {
                view.include.forEach((path: string) => {
                    path = path.startsWith("/") ? path.substring(1) : path;
                    let more: any = this.loadStatic(api.constants.viewPath + path);
                    view = helpers.object.merge(more, view);
                });
            }
        } catch (err) {
            api.logger.warn("Encountered invalid JSON in " + path);
            return;
        }
        this.staticViewData[mvcPath] = view;
    }

    public handle(req: express.Request, res: express.Response, next: Function): void {
        let tokens: string[] = req.mvcPath.split("/");
        let action: string = tokens.splice(-1, 1)[0];
        let route: string = tokens.join("/");
        let controllerClass: typeof api.IHttpController;
        try {
            controllerClass = this.controllers
               .where(c => c.prototype.routes.indexOf(route) != -1)
               .firstOrDefault();
        } catch (err) {
            api.logger.warn("Couldn't load controller for request. Are there non-controller files in /content/controllers?");
        }
        if (this.staticViewData[req.mvcPath]) {
            res.view = this.staticViewData[req.mvcPath];
        }
        new RequestHandler({
            route: route,
            action: action,
            controllerPrototype: controllerClass ? controllerClass.prototype : null,
            req: req,
            res: res,
            next: next
        }).handle();
    }
}

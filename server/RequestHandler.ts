import * as express from "express";
import * as fs from "fs";
import * as linq from "linq";
import * as mime from "mime";
import * as api from "./api";
import * as helpers from "../helpers";
import Transformers from "./transformers";

export default class RequestHandler extends api.IRequestHandler {
    public route: string;
    public action: string;
    public controller: api.IHttpController;
    public controllerPrototype: api.IHttpController;

    public constructor(init: Partial<RequestHandler>) {
        super(init);
        Object.assign(this, init);
        if (this.controllerPrototype) {
            this.controller = new (<any>this.controllerPrototype.constructor)();
        }
    }

    public handle(): void {
        let staticDir: string = linq.from(api.constants.staticDirs)
            .where(d => this.req.mvcPath.startsWith("/" + d + "/"))
            .firstOrDefault();
        if (staticDir) {
            this.serveStatic();
        } else if (this.req.mvcPath == "/home/login" || this.req.mvcPath == "/home/register" || this.req.mvcPath == "/home/logout") {
            this.checkAuth(); // let authentication handler redirect
        } else {
            if (this.controller) {
                if (this.controllerPrototype.authRequired.indexOf(this.action) !== -1
                    && !this.req.session.userid) { // requires login but is not logged in
                    this.checkAuth();
                } else {
                    this.callController();
                }
            } else {
                this.serveView();
            }
        }
    }

    private async checkAuth(): Promise<void> {
        this.req.session.authFrom = this.req.mvcPath;
        if (!this.req.session.lastPage) {
            this.req.session.lastPage = this.req.mvcPath;
        }
        return new Promise<void>((resolve, reject) => {
            this.req.session.save((err: Error) => {
                if (err) {
                    reject(err);
                } else {
                    this.res.redirect("/auth/" + api.config.auth.provider + "/login");
                }
            });
        });
    }

    private callController(): void {
        if (this.controllerPrototype.actions[this.action] !== this.req.method) {
            api.logger.trace(`URL ${this.req.mvcPath} does not have a registered controller for its method (${this.req.method}).`);
            this.serveView();
            return;
        }
        this.controller.req = this.req;
        this.controller.res = this.res;
        let params: any[] = [];
        let actionParams: string[] = this.controllerPrototype.params[this.action];
        if (actionParams) {
            let queryParams: any = this.req[this.req.method === "GET" ? "query" : "body"];
            actionParams.forEach(p => {
                let param: any = queryParams[p];
                try {
                    params.push(JSON.parse(param));
                } catch (ex) {
                    params.push(param);
                }
            });
        }
        (<any>this.controller)[this.action].apply(this.controller, params).then(() => {
            if (this.res.finished) {
                return;
            }
            if (this.res.statusCode !== 200) {
                this.renderError(this.res.statusCode);
                return;
            }
            if (this.controllerPrototype.raw.indexOf(this.action) !== -1) {
                let val: string | Buffer = null;
                if (typeof(this.res.raw) === "string" || this.res.raw instanceof Buffer) {
                    val = this.res.raw;
                } else {
                    val = JSON.stringify(this.res.raw);
                    this.res.set("Content-Type", "application/json");
                }
                this.res.send(val);
            } else {
                this.serveView();
            }
        }).catch((err?: Error) => {
            api.logger.error(err);
            this.renderError(api.constants.http.InternalError);
        });
    }

    private serveView(): void {
        let viewPath: string = api.constants.viewPath + this.req.mvcPath.substring(1);
        Transformers().forEach((t: typeof api.IViewTransformer) => {
            let transformer: api.IViewTransformer = new (<any>t)({
                req: this.req,
                res: this.res,
                next: this.next
            });
            this.res.view = transformer.transform();
        });
        helpers.fs.exists(viewPath + ".pug", (exists: boolean) => {
            if (!exists) {
                api.logger.trace(`View ${viewPath}.pug does not exist.`);
                this.renderError(api.constants.http.NotFound);
                return;
            }
            if (api.config.dev.enable) {
                this.res.view["compileDebug"] = true;
            }
            this.res.render(viewPath, this.res.view, (err: Error, html: string) => {
                if (err) {
                    api.logger.error(`Rendering ${viewPath} failed: ${err.message}`);
                    this.renderError(api.constants.http.InternalError);
                    return;
                }
                if (!this.req.mvcPath.startsWith("/auth/")) {
                    this.req.session.lastPage = this.req.mvcPath;
                }
                this.res.send(html);
            });
        });
    }

    private serveStatic(): void {
        let staticPath: string = api.constants.staticPath + this.req.mvcPath;
        helpers.fs.exists(staticPath, (exists: boolean) => {
            if (!exists) {
                api.logger.trace(`Static file ${this.req.mvcPath} does not exist.`);
                this.renderError(api.constants.http.NotFound);
                return;
            }
            fs.readFile(staticPath, (err: NodeJS.ErrnoException, data: Buffer) => {
                if (err) {
                    api.logger.warn(`Error reading ${staticPath}`);
                    this.renderError(api.constants.http.InternalError);
                    return;
                }
                this.res.set("Content-Type", mime.lookup(this.req.mvcPath, "text/plain"));
                this.res.send(data);
            });
        });
    }

    private renderError(code: number): void {
        if (this.res.statusCode == 200) {
            this.res.statusCode = code;
        }
        let errorView: string = api.constants.viewPath + "errors/" + code.toString();
        helpers.fs.exists(errorView + ".pug", (exists: boolean) => {
            if (!exists) {
                errorView = api.constants.viewPath + "errors/layout";
            }
            this.res.render(errorView, {
                errorCode: code,
                email: "webmaster@" + api.config.http.host
            });
        });
    }
}

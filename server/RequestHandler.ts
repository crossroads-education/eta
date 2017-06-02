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
    public authProvider: api.IAuthHandler;

    public constructor(init: Partial<RequestHandler>) {
        super(init);
        Object.assign(this, init);
        if (this.controllerPrototype) {
            this.controller = new (<any>this.controllerPrototype.constructor)();
        }
        this.authProvider = new (<any>api.IAuthHandler.provider)({
            req: this.req,
            res: this.res,
            next: this.next
        });
    }

    public handle(): void {
        let staticDir: string = linq.from(api.constants.staticDirs)
            .where(d => this.req.mvcPath.startsWith("/" + d + "/"))
            .firstOrDefault();
        if (staticDir) {
            this.serveStatic();
        } else {
            if (this.controller) {
                if (this.controllerPrototype.authRequired.indexOf(this.action) !== -1
                    && !this.req.session["userid"]) { // requires login but is not logged in
                    this.checkAuth();
                } else {
                    this.callController();
                }
            } else {
                this.serveView();
            }
        }
    }

    private checkAuth(): void {
        this.authProvider.login((err: Error, result?: api.AuthResult) => {
            if (err) {
                api.logger.error(err);
                this.renderError(api.constants.http.InternalError);
                return;
            }
            switch (result) {
                case api.AuthResult.Forbidden:
                    this.renderError(api.constants.http.AccessDenied);
                    break;
                case api.AuthResult.NeedsRegistration:
                    this.tryRegister();
                    break;
                case api.AuthResult.Redirected:
                    break; // do nothing
                case api.AuthResult.Success:
                    this.callController(); // continue in lifecycle
                    break;
                default:
                    api.logger.warn("Unknown result from authentication provider for login(): " + result);
                    this.renderError(api.constants.http.InternalError);
            }
        });
    }

    private tryRegister() {
        this.authProvider.register((err: Error, result?: api.AuthResult) => {
            if (err) {
                api.logger.error(err);
                this.renderError(api.constants.http.InternalError);
                return;
            }
            switch (result) {
                case api.AuthResult.NotSupported:
                    api.logger.warn("Authentication provider does not support registration.");
                    this.renderError(api.constants.http.InternalError);
                    break;
                case api.AuthResult.Redirected:
                    break; // do nothing
                case api.AuthResult.Success:
                    this.checkAuth(); // continue in lifecycle
                    break;
                default:
                    api.logger.warn("Unknown result from authentication provider for register(): " + result);
                    this.renderError(api.constants.http.InternalError);
            }
        });
    }

    private callController(): void {
        if (this.controllerPrototype.actions[this.action] !== this.req.method) {
            api.logger.trace(`URL ${this.req.mvcPath} does not have a registered controller for its method (${this.controllerPrototype.actions[this.action]} is registered).`);
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
                return;
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
                this.res.set("Content-Type", mime.lookup(this.req.mvcPath));
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

import * as express from "express";
import * as fs from "fs";
import * as linq from "linq";
import * as mime from "mime";
import * as api from "./api";
import * as helpers from "../helpers";
import * as transformers from "./transformers";

export default class RequestHandler extends api.IRequestHandler {
    public route: string;
    public action: string;
    public controller: api.IHttpController;
    public controllerPrototype: api.IHttpController;
    private transformers: api.IRequestTransformer[];

    public constructor(init: Partial<RequestHandler>) {
        super(init);
        Object.assign(this, init);
        if (this.controllerPrototype) {
            this.controller = new (<any>this.controllerPrototype.constructor)();
        }
    }

    public async handle(): Promise<void> {
        let staticDir: string = linq.from(api.constants.staticDirs)
            .where(d => this.req.mvcPath.startsWith("/" + d + "/"))
            .firstOrDefault();
        if (staticDir) {
            return this.serveStatic();
        }
        this.initTransformers();
        this.fireTransformEvent("onRequest");
        if (this.res.finished) return;
        // ['', 'auth', 'login'] vs ['', 'auth', 'local', 'login']
        if (this.req.mvcPath.startsWith("/auth/") && this.req.mvcPath.split("/").length === 3) {
            this.req.session.authFrom = this.req.session.lastPage;
            await this.saveSession();
            this.redirect("/auth/" + api.config.auth.provider + "/" + this.action);
        } else {
            if (this.controller) {
                if (this.controllerPrototype.authRequired.indexOf(this.action) !== -1
                    && !this.isLoggedIn()) { // requires login but is not logged in
                    this.req.session.authFrom = this.req.mvcPath;
                    await this.saveSession();
                    this.redirect("/auth/" + api.config.auth.provider + "/login");
                } else {
                    this.callController();
                }
            } else {
                this.serveView();
            }
        }
    }

    private callController(): void {
        if (this.controllerPrototype.actions[this.action] !== this.req.method) {
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
                this.req.session["lastPage"] = this.req.mvcPath;
                this.req.session.save(function() {});
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
        helpers.fs.exists(viewPath + ".pug", (exists: boolean) => {
            if (!exists) {
                this.renderError(api.constants.http.NotFound);
                return;
            }
            this.fireTransformEvent("beforeResponse");
            if (this.res.finished) return;
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

    private initTransformers(): void {
        this.transformers = [];
        Object.keys(transformers).forEach(key => {
            let Transformer: typeof api.IRequestTransformer = (<any>transformers)[key];
            this.transformers.push(new (<any>Transformer)({
                req: this.req,
                res: this.res,
                next: this.next
            }));
        });
    }

    private fireTransformEvent(name: string): void {
        this.transformers.forEach(t => {
            let method: () => Promise<void> = (<any>t)[name];
            if (method) {
                method.apply(t);
            }
        });
    }
}

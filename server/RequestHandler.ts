import * as express from "express";
import * as fs from "fs-extra";
import * as mime from "mime";
import * as eta from "../eta";
import * as transformers from "./transformers";

export default class RequestHandler extends eta.IRequestHandler {
    public route: string;
    public action: string;
    public controller: eta.IHttpController;
    public controllerPrototype: eta.IHttpController;
    private static PermissionValidator: typeof eta.IPermissionValidator;
    private static Transformers: (typeof eta.IRequestTransformer)[] = [];
    private transformers: eta.IRequestTransformer[];

    public constructor(init: Partial<RequestHandler>) {
        super(init);
        Object.assign(this, init);
        if (this.controllerPrototype) {
            this.controller = new (<any>this.controllerPrototype.constructor)();
        }
    }

    public async handle(): Promise<void> {
        const staticDir: string = eta.constants.staticDirs.find(d => this.req.mvcPath.startsWith("/" + d + "/"));
        if (staticDir) {
            return this.serveStatic();
        }
        this.setupHandlers();
        await this.fireTransformEvent("onRequest");
        if (this.res.finished) return;
        // ['', 'auth', 'login'] vs ['', 'auth', 'local', 'login']
        if (this.req.mvcPath.startsWith("/auth/") && this.req.mvcPath.split("/").length === 3) {
            this.req.session.authFrom = this.req.session.lastPage;
            await this.saveSession();
            this.redirect("/auth/" + eta.config.auth.provider + "/" + this.action);
        } else {
            if (this.controller) {
                const permsRequired: any[] = this.controllerPrototype.permsRequired[this.action];
                if (this.controllerPrototype.authRequired.indexOf(this.action) !== -1
                    && !this.isLoggedIn()) { // requires login but is not logged in
                    this.req.session.authFrom = this.req.mvcPath;
                    await this.saveSession();
                    this.redirect("/auth/" + eta.config.auth.provider + "/login");
                } else if (permsRequired !== undefined) {
                        const validator: eta.IPermissionValidator = new (<any>RequestHandler.PermissionValidator)({
                            req: this.req,
                            res: this.res,
                            next: this.next
                        });
                        if (await validator.isRequestAuthorized(permsRequired)) {
                            this.callController();
                        } else {
                            this.renderError(eta.constants.http.AccessDenied);
                        }
                    }
                else {
                    this.callController();
                }
            } else {
                await this.serveView();
            }
        }
    }

    private async callController(): Promise<void> {
        if (this.controllerPrototype.actions[this.action] !== this.req.method) {
            await this.serveView();
            return;
        }
        this.controller.req = this.req;
        this.controller.res = this.res;
        const params: any[] = [];
        const actionParams: string[] = this.controllerPrototype.params[this.action];
        if (actionParams) {
            const queryParams: any = this.req[this.req.method === "GET" ? "query" : "body"];
            actionParams.forEach(p => {
                const param: any = queryParams[p];
                try {
                    params.push(JSON.parse(param));
                } catch (ex) {
                    params.push(param);
                }
            });
        }
        try {
            await (<any>this.controller)[this.action].apply(this.controller, params);
        } catch (err) {
            eta.logger.error(err);
            this.renderError(eta.constants.http.InternalError);
            return;
        }
        if (this.res.finished) {
            if (this.req.method === "GET") {
                this.req.session.lastPage = this.req.mvcPath;
                this.saveSession();
            }
            return;
        }
        if (this.res.statusCode !== 200) {
            this.renderError(this.res.statusCode);
            return;
        }
        if (this.controllerPrototype.raw.indexOf(this.action) !== -1) {
            let val: string | Buffer = undefined;
            if (typeof(this.res.raw) === "string" || this.res.raw instanceof Buffer) {
                val = this.res.raw;
            } else {
                val = JSON.stringify(this.res.raw);
                this.res.set("Content-Type", "application/json");
            }
            this.res.send(val);
        } else {
            await this.serveView();
        }
    }

    private async serveView(): Promise<void> {
        const viewPath: string = eta.constants.viewPath + this.req.mvcPath.substring(1);
        if (!await fs.exists(viewPath + ".pug")) {
            this.renderError(eta.constants.http.NotFound);
            return;
        }
        await this.fireTransformEvent("beforeResponse");
        if (this.res.finished) return;
        if (eta.config.dev.enable) {
            this.res.view["compileDebug"] = true;
        }
        let html: string;
        try {
            html = await this.renderView(viewPath);
        } catch (err) {
            return;
        }
        if (!this.req.mvcPath.startsWith("/auth/") && this.req.method === "GET") {
            this.req.session.lastPage = this.req.mvcPath;
        }
        this.res.send(html);
    }

    private serveStatic(): void {
        const staticPath: string = eta.constants.staticPath + this.req.mvcPath;
        eta.fs.exists(staticPath, (exists: boolean) => {
            if (!exists) {
                this.renderError(eta.constants.http.NotFound);
                return;
            }
            fs.readFile(staticPath, (err: NodeJS.ErrnoException, data: Buffer) => {
                if (err) {
                    eta.logger.warn(`Error reading ${staticPath}`);
                    this.renderError(eta.constants.http.InternalError);
                    return;
                }
                this.res.set("Content-Type", mime.lookup(this.req.mvcPath, "text/plain"));
                this.res.send(data);
            });
        });
    }

    private async renderView(viewPath: string): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            this.res.render(viewPath, this.res.view, (err: Error, html: string) => {
                if (err) {
                    eta.logger.error(`Rendering ${viewPath} failed: ${err.message}`);
                    this.renderError(eta.constants.http.InternalError);
                    reject();
                } else {
                    resolve(html);
                }
            });
        });
    }

    private renderError(code: number): void {
        if (this.res.statusCode === 200) {
            this.res.statusCode = code;
        }
        let errorView: string = eta.constants.viewPath + "errors/" + code.toString();
        eta.fs.exists(errorView + ".pug", (exists: boolean) => {
            if (!exists) {
                errorView = eta.constants.viewPath + "errors/layout";
            }
            this.res.render(errorView, {
                errorCode: code,
                email: "webmaster@" + eta.config.http.host
            });
        });
    }

    private setupHandlers(): void {
        if (RequestHandler.Transformers.length === 0) {
            RequestHandler.loadHandlers();
        }
        this.transformers = RequestHandler.Transformers.map(t => new (<any>t)({
            req: this.req,
            res: this.res,
            next: this.next
        }));
    }

    private static loadHandlers(): void {
        Object.keys(transformers).forEach(key => {
            this.Transformers.push((<any>transformers)[key]);
        });
        eta.config.content.transformerDirs.forEach(transformerDir => {
            transformerDir = eta.constants.contentPath + transformerDir + "/";
            fs.readdirSync(transformerDir).forEach(filename => {
                if (!filename.endsWith(".js")) {
                    return;
                }
                try {
                    this.Transformers.push(require(transformerDir + filename).default);
                } catch (err) {
                    eta.logger.error(`Couldn't load transformer ${filename}`);
                    eta.logger.error(err);
                }
            });
        });
        const validatorPath = eta.constants.contentPath + eta.config.content.validator + ".js";
        this.PermissionValidator = require(validatorPath).default;
    }

    private fireTransformEvent(name: string): Promise<void> {
        return eta.array.forEachAsync(this.transformers, async t => {
            const method: () => Promise<void> = (<any>t)[name];
            if (method) {
                await method.apply(t);
            }
        });
    }
}

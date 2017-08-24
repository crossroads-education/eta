import * as express from "express";
import * as fs from "fs-extra";
import * as mime from "mime";
import * as eta from "../eta";
import WebServer from "./WebServer";

export default class RequestHandler extends eta.IRequestHandler {
    public route: string;
    public action: string;
    public controller: eta.IHttpController;
    public controllerPrototype: eta.IHttpController;
    public server: WebServer;
    private transformers: eta.IRequestTransformer[];

    public constructor(init: Partial<RequestHandler>) {
        super(init);
        Object.assign(this, init);
        if (this.controllerPrototype) {
            this.controller = new (<any>this.controllerPrototype.constructor)();
        }
    }

    public async handle(): Promise<void> {
        if (await this.checkStatic()) return;
        this.transformers = this.server.requestTransformers.map(t => {
            return new (<any>t)({
                req: this.req,
                res: this.res,
                next: this.next
            });
        });
        await this.fireTransformEvent("onRequest");
        if (this.res.finished) return;
        if (this.controller) {
            const permsRequired: any[] = this.controllerPrototype.permsRequired[this.action];
            if (this.controllerPrototype.authRequired.indexOf(this.action) !== -1
                && !this.isLoggedIn()) { // requires login but is not logged in
                this.req.session.authFrom = this.req.mvcPath;
                if (this.shouldSaveLastPage) this.req.session.lastPage = this.req.mvcPath;
                await this.saveSession();
                this.redirect("/login");
            } else if (permsRequired !== undefined) {
                if ((await this.fireTransformEvent("isRequestAuthorized", permsRequired)) !== false) {
                    this.callController();
                } else {
                    this.renderError(eta.constants.http.AccessDenied);
                }
            } else {
                this.callController();
            }
        } else {
            await this.serveView();
        }
    }

    private async callController(): Promise<void> {
        if (this.controllerPrototype.actions[this.action] !== this.req.method) {
            await this.serveView();
            return;
        }
        this.controller.req = this.req;
        this.controller.res = this.res;
        this.controller.next = this.next;
        this.controller.server = this.server;
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
                await this.saveSession();
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
        const viewPath: string = this.server.viewFiles[this.req.mvcPath];
        if (viewPath === undefined || !await eta.fs.exists(viewPath)) {
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
            eta.logger.error(`Rendering ${viewPath} failed: ${err.message}`);
            this.renderError(eta.constants.http.InternalError);
            return;
        }
        if (this.shouldSaveLastPage()) {
            this.req.session.lastPage = this.req.mvcPath;
        }
        this.res.send(html);
    }

    private async checkStatic(): Promise<boolean> {
        const staticPath: string = this.server.staticFiles[this.req.mvcPath];
        if (!staticPath) return false;
        if (!await eta.fs.exists(staticPath)) {
            eta.logger.trace("A static file was deleted after the server started. " + staticPath);
            this.renderError(eta.constants.http.NotFound);
            return true;
        }
        let data: Buffer;
        try {
            data = await fs.readFile(staticPath);
        } catch (err) {
            eta.logger.warn(`Error reading ${staticPath}`);
            this.renderError(eta.constants.http.InternalError);
            return true;
        }
        if (eta.config.dev.enable) {
            this.res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
            this.res.setHeader("Pragma", "no-cache");
            this.res.setHeader("Expires", "0");
        } else {
            const hash: string = eta.crypto.getUnique(data);
            this.res.setHeader("Cache-Control", "max-age=" + 60 * 60 * 24 * 30); // 30 days
            this.res.setHeader("ETag", hash);
            if (this.req.header("If-None-Match") === hash) {
                this.res.sendStatus(eta.constants.http.NotModified);
                return true;
            }
        }
        this.res.setHeader("Content-Type", mime.lookup(this.req.mvcPath, "text/plain"));
        this.res.setHeader("Content-Length", data.byteLength.toString());
        this.res.send(data);
        return true;
    }

    private async renderView(viewPath: string): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            this.res.render(viewPath, this.res.view, (err: Error, html: string) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(html);
                }
            });
        });
    }

    private renderError(code: number): Promise<void> {
        return RequestHandler.renderError(this.res, code);
    }

    private shouldSaveLastPage(): boolean {
        return !this.req.mvcPath.includes("/auth/") && this.req.method === "GET" && this.req.mvcPath !== "/home/login" && this.req.mvcPath !== "/home/logout";
    }

    private async fireTransformEvent(name: string, ...args: any[]): Promise<boolean> {
        let result = true;
        await eta.array.forEachAsync(this.transformers, async t => {
            const method: () => Promise<void> = (<any>t)[name];
            if (method) {
                const value: boolean | void = await method.apply(t, args);
                if (typeof(value) === "boolean") {
                    if (!value) result = false;
                }
            }
        });
        return result;
    }

    public static async renderError(res: express.Response, code: number): Promise<void> {
        if (res.statusCode !== code) {
            res.statusCode = code;
        }
        const errorDir: string = eta.constants.basePath + "server/errors/";
        let errorView: string = errorDir + code.toString();
        if (!await eta.fs.exists(errorView + ".pug")) {
            errorView = errorDir + "layout";
        }
        res.render(errorView, {
            errorCode: code,
            email: "support@" + eta.config.http.host
        });
    }
}

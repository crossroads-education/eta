import * as eta from "../../eta";
import * as fs from "fs-extra";
import RequestHandler from "../RequestHandler";

export default class DynamicRequestHandler extends RequestHandler {
    public async handle(): Promise<void> {
        if (this.controllerPrototype) {
            this.controller = new (<any>this.controllerPrototype.constructor)({
                req: this.req,
                res: this.res,
                next: this.next,
                server: this.app.server,
                params: this.routeParams
            });
            this.actionItem = this.controllerPrototype.actions[this.action];
        }
        this.transformers = this.app.requestTransformers.map(t => {
            return new (<any>t)({
                req: this.req,
                res: this.res,
                next: this.next
            });
        });
        await this.fireTransformEvent("onRequest");
        if (this.res.finished) return;
        if (this.controller && this.actionItem) {
            if (this.actionItem.isAuthRequired && !this.isLoggedIn()) { // requires login but is not logged in
                this.req.session.authFrom = this.req.mvcFullPath;
                if (this.shouldSaveLastPage) this.req.session.lastPage = this.req.mvcFullPath;
                await this.saveSession();
                this.redirect("/login");
            } else if (this.actionItem.permissionsRequired.length > 0) {
                if ((await this.fireTransformEvent("isRequestAuthorized", this.actionItem.permissionsRequired)) !== false) {
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
    /**
     * Loads and calls any controller method applicable to this request.
     * It is assumed that a controller is defined for this request, if not an action / route.
     */
    private async callController(): Promise<void> {
        if (this.actionItem.method !== this.req.method) {
            await this.serveView();
            return;
        }
        const queryParams: {[key: string]: any} = this.buildQueryParams();
        try {
            const scriptFilename: string = <string>this.actionItem.flags["script"];
            if (!scriptFilename) { // Typescript (default)
                await (<any>this.controller)[this.action].apply(this.controller, [queryParams]);
            } else if (scriptFilename.endsWith(".py")) { // Python
                this.actionItem.useView = false;
                this.res.raw = (await eta.PythonLoader.load(scriptFilename)(queryParams))[0];
            } else { // Unknown script type
                throw new Error("Script " + scriptFilename + " cannot be handled.");
            }
        } catch (err) {
            eta.logger.error(err);
            this.renderError(eta.constants.http.InternalError);
            return;
        }
        if (this.res.finished) {
            // methods like IRequestHandler.redirect() mark res.finished as true,
            // and Express handles it poorly (usually by sending headers multiple times)
            if (this.req.method === "GET") {
                this.req.session.lastPage = this.req.mvcFullPath;
                await this.saveSession();
            }
            return;
        }
        if (this.res.statusCode !== 200) {
            this.renderError(this.res.statusCode);
            return;
        }
        if (this.actionItem.useView) {
            return await this.serveView();
        }
        // handle this.res.raw
        let val: string | Buffer = undefined;
        if (typeof(this.res.raw) === "string" || this.res.raw instanceof Buffer) {
            val = this.res.raw;
        } else {
            val = JSON.stringify(this.res.raw);
            this.res.set("Content-Type", "application/json");
        }
        this.res.send(val);
    }

    private buildQueryParams(): {[key: string]: any} {
        const queryParams: {[key: string]: any} = {};
        const rawQueryParams: {[key: string]: any} = this.req[this.req.method === "GET" ? "query" : "body"];
        // checks GET/POST for JSON-encoded values and "bad" JQuery-encoded keys
        const rawQueryKeys: string[] = Object.keys(rawQueryParams);
        rawQueryKeys.filter(k => !k.includes("[")).forEach(k => {
            try {
                queryParams[k] = JSON.parse(rawQueryParams[k]);
            } catch (err) {
                queryParams[k] = rawQueryParams[k];
            }
        });
        // transform JQuery-encoded keys
        rawQueryKeys.filter(k => k.includes("[")).forEach(k => {
            const tokens: string[] = k.split("[");
            const keys: string[] = [tokens.splice(0, 1)[0]].concat(tokens.map(t => t.slice(0, -1)));
            let lastItem: any = queryParams;
            keys.slice(0, -1).forEach(qk => {
                if (!lastItem[qk]) {
                    lastItem[qk] = {};
                }
                lastItem = lastItem[qk];
            });
            lastItem[keys.slice(-1)[0]] = rawQueryParams[k];
        });
        const nonArrayKeys: string[] = rawQueryKeys.filter(k => !k.includes("["));
        Object.keys(queryParams).filter(k => !nonArrayKeys.includes(k)).forEach(k => {
            // convert JQuery-encoded arrays from number-keyed objects to arrays in-memory
            const itemKeys: string[] = Object.keys(queryParams[k]);
            if (!(queryParams[k] instanceof Array) && itemKeys.every(k => !isNaN(Number(k)))) {
                const arr: any[] = [];
                itemKeys.forEach(key => arr[Number(key)] = queryParams[k][key]);
                queryParams[k] = arr;
            }
        });
        return queryParams;
    }

    private async serveView(): Promise<void> {
        const viewPath: string = this.app.viewFiles[this.req.mvcPath];
        if (viewPath === undefined || !await fs.pathExists(viewPath)) {
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
            this.req.session.lastPage = this.req.mvcFullPath;
        }
        this.res.send(html);
    }
}

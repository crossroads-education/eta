import * as eta from "@eta/eta";
import * as fs from "fs-extra";
import RequestHandler from "../RequestHandler";

export default class DynamicRequestHandler extends RequestHandler {
    private route: eta.HttpRoute;
    private action: eta.HttpAction;
    private controller: eta.HttpController;
    public async handle(): Promise<void> {
        this.route = this.app.controllers[this.path.route];
        this.req.db = this.db; // make repository handler available to custom middleware
        if (this.route !== undefined) {
            this.controller = new this.route.controller({
                req: this.req,
                res: this.res,
                next: this.next,
                app: this.app,
                config: this.config,
                db: this.db
            });
            this.action = this.route.actions.find(a => a.url === this.req.mvcPath && a.method === this.req.method);
        }
        await this.app.emit("request", this);
        if (this.res.finished) return;
        if (this.controller && this.action) {
            if (this.action.isAuthRequired && !this.isLoggedIn()) { // requires login but is not logged in
                if (this.req.header("x-requested-with") === "XMLHttpRequest") {
                    return this.renderError(eta.constants.http.AccessDenied);
                }
                this.req.session.authFrom = this.req.mvcFullPath;
                if (this.shouldSaveLastPage) this.req.session.lastPage = this.req.mvcFullPath;
                await this.saveSession();
                this.redirect("/login");
            } else if (this.action.isAuthRequired) {
                const isAuthorizedResults: boolean[] = await <any>this.app.emit("request:auth", this, this.action.permissionsRequired || []);
                if (!isAuthorizedResults.includes(false)) {
                    await this.callController();
                } else {
                    await this.renderError(eta.constants.http.AccessDenied);
                }
            } else {
                await this.callController();
            }
        } else {
            await this.serveView();
        }
    }
    /**
     * Loads and calls any controller method applicable to this request.
     * It is assumed that a controller is defined for this request, if not an action / route.
     */
    private async callController(skipMiddleWare = false): Promise<void> {
        if (!skipMiddleWare && this.action.middleWare) {
            const mwPromise = new Promise((succeed, fail) => {
                this.action.middleWare(this.req, this.res, (err: any, data: any) => {
                    if (err) fail(err); else succeed(data);
                });
            });
            return mwPromise.then(() => this.callController(true));
        }
        const queryParams: any[] = this.buildQueryParams();
        if (queryParams === undefined) {
            return this.renderError(eta.constants.http.MissingParameters);
        }
        let result: any; // return value from the controller's action
        try {
            // call the action with proper params (forcing correct context with `apply()`)
            result = await (<any>this.controller)[this.action.name](...queryParams);
        } catch (err) {
            eta.logger.verbose("error occurred in controller for " + this.route.route + "/" + this.action.name);
            eta.logger.error(err);
            await this.renderError(eta.constants.http.InternalError);
            return;
        }
        if ((this.req as any).etaFinished || this.res.finished || this.res.locals.finished) {
            // methods like IRequestHandler.redirect() mark res.finished as true,
            // and Express handles it poorly (usually by sending headers multiple times)
            if (this.req.method === "GET" && !this.res.locals.finished) {
                this.req.session.lastPage = this.req.mvcFullPath;
                await this.saveSession();
            }
            return;
        }
        if (this.res.statusCode !== 200) {
            return this.renderError(this.res.statusCode);
        }
        if (result === undefined) {
            // if the action returns undefined, it wants us to render the associated view
            return this.serveView();
        }
        let val: string | Buffer = undefined;
        if (typeof(result) === "string" || result instanceof Buffer) {
            val = result;
        } else {
            val = JSON.stringify(result);
            this.res.set("Content-Type", "application/json");
        }
        this.res.send(val);
    }

    private buildQueryParams(): any[] {
        const rawParams: {[key: string]: any} = this.req[this.req.method === "GET" ? "query" : "body"] || {};
        const checkParam = (name: string) => {
            // don't try to parse anything that isn't a string
            if (typeof(rawParams[name]) !== "string") return rawParams[name];
            try {
                return JSON.parse(rawParams[name]);
            } catch { return rawParams[name]; }
        };
        if (this.action.groupParams) {
            Object.keys(rawParams).forEach(k => rawParams[k] = checkParam(k));
            return [rawParams];
        }
        const params = Object.values(this.action.params);
        // check for required params which aren't provided
        if (params.find(p => p.isRequired && rawParams[p.name] === undefined)) return undefined;
        return params.map(p => {
            // don't try to convert params intended to be strings
            if (p.type === String) return rawParams[p.name];
            // try to parse this as JSON
            return checkParam(p.name);
        });
    }

    private async serveView(): Promise<void> {
        const viewPath: string = this.app.viewFiles[this.req.mvcPath];
        if (viewPath === undefined || !await fs.pathExists(viewPath)) {
            return this.renderError(eta.constants.http.NotFound);
        }
        await this.app.emit("request:pre-response", this);
        if (this.res.finished) return;
        if (this.config.get("dev.enable")) {
            this.res.view.compileDebug = true;
        }
        let html: string;
        try {
            html = await this.renderView(viewPath);
        } catch (err) {
            eta.logger.error(`Rendering ${viewPath} failed: ${err.message}`);
            return this.renderError(eta.constants.http.InternalError);
        }
        if (this.shouldSaveLastPage()) {
            this.req.session.lastPage = this.req.mvcFullPath;
        }
        this.res.send(html);
    }
}

import * as fs from "fs-extra";
import * as eta from "@eta/eta";
import * as path from "path";

/**
 * Logic for processing HTTP requests. Instantiated per request.
 */
export default class RequestHandler extends eta.RequestHandler {
    public path: {
        route: string;
        action: string;
    };

    public constructor(init: Partial<RequestHandler>) {
        super(init);
        Object.assign(this, init);
        if (!this.app.configs[this.req.hostname]) {
            eta.logger.warn("Unknown hostname being served: " + this.req.hostname);
        }
    }

    /**
     * Entry point for a new request. Called by WebServer.
     */
    public async handleRequest(): Promise<void> {
        // initialize custom express properties
        this.transformExpressObjects();
        const staticPath: string = await this.isStaticFile();
        if (staticPath !== undefined) {
            const staticHandler = new StaticRequestHandler(this);
            staticHandler.staticPath = staticPath;
            return await staticHandler.handle();
        }
        await new DynamicRequestHandler(this).handle();
    }

    private transformExpressObjects(): void {
        this.req.mvcPath = decodeURIComponent(this.req.path);
        // ensure that mvcPath always has a route and action (/route.../action)
        if (this.req.mvcPath.endsWith("/")) {
            this.req.mvcPath += "index";
        }
        this.req.mvcFullPath = this.req.mvcPath;
        const hostTokens: string[] = this.req.get("host").split(":");
        let host: string = this.config.get("http.host") + ":" + hostTokens[1];
        if (this.config.get("https.realPort") !== undefined) { // set the host properly based on https realPort
            let realPort = "";
            if (this.config.get("https.realPort") !== false) {
                realPort = ":" + this.config.get("https.realPort");
            }
            host = host.replace(":" + this.config.get("https.port"), realPort);
        }
        this.req.baseUrl = this.req.protocol + "://" + host + "/";
        this.res.view = {};
        const tokens: string[] = this.req.mvcPath.split("/");
        // action is the last token of mvcPath
        const action: string = tokens.splice(-1, 1)[0];
        // route is everything else
        const route: string = tokens.join("/");
        this.req.fullUrl = this.req.baseUrl + this.req.mvcPath.substring(1);
        if (this.req.originalUrl.includes("?")) {
            this.req.mvcFullPath += "?" + this.req.originalUrl.split("?").slice(-1)[0];
        }
        if (this.app.viewMetadata[this.req.mvcPath]) { // clone static view metadata into this request's metadata
            this.res.view = eta._.cloneDeep(this.app.viewMetadata[this.req.mvcPath]);
        }
        this.path = { action, route };
    }

    /**
     * Checks if this request is for a static file.
     * Returns the static file's path if the request is for a static file, undefined otherwise.
     */
    public async isStaticFile(): Promise<string> {
        const staticPath: string = this.app.staticFiles[this.req.path];
        if (staticPath) return staticPath;
        if (!this.config.get("dev.enable")) return undefined; // no live-reloading without dev mode
        if (await this.app.verifyStaticFile(this.req.path)) {
            return this.app.staticFiles[this.req.path]; // changed by verifyStaticFile()
        }
        return undefined;
    }

    protected async renderView(viewPath: string): Promise<string> {
        this.res.view.plugins = [{
            name: "eta-multiple-paths",
            resolve: (filename: string, source: string): string => {
                if (!filename.startsWith("/")) return path.resolve(path.dirname(source), filename);
                return this.app.viewFiles[filename.replace(/\.pug$/, "")];
            }
        }];
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

    protected renderError(code: number): Promise<void> {
        return RequestHandler.renderError(this, code);
    }

    protected shouldSaveLastPage(): boolean {
        return !this.req.mvcPath.includes("/auth/") && this.req.method === "GET" && this.req.mvcPath !== "/home/login" && this.req.mvcPath !== "/home/logout";
    }

    public static async renderError(http: eta.HttpRequest, code: number): Promise<void> {
        if (http.res.statusCode !== code) {
            http.res.statusCode = code;
        }
        const errorDir: string = eta.constants.basePath + "server/errors/";
        let errorView: string = errorDir + code.toString();
        if (!await fs.pathExists(errorView + ".pug")) {
            errorView = errorDir + "layout";
        }
        http.res.render(errorView, {
            errorCode: code,
            email: "support@" + http.config.get("http.host")
        });
    }
}

import DynamicRequestHandler from "./request-handlers/DynamicRequestHandler";
import StaticRequestHandler from "./request-handlers/StaticRequestHandler";

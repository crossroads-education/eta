/// <reference path="../def/express.d.ts"/>
import * as bodyParser from "body-parser";
import * as redisSession from "connect-redis";
import * as events from "events";
import * as express from "express";
import * as expressSession from "express-session";
import * as fs from "fs-extra";
import * as http from "http";
import * as https from "https";
import * as multer from "multer";
import * as orm from "typeorm";
import * as passport from "passport";
import * as pg from "pg";
import * as redis from "redis";
import * as eta from "../eta";
import { connect as connectDatabase } from "./api/db";
import { connect as connectRedis } from "./api/redis";
import ModuleLoader from "./ModuleLoader";
import RequestHandler from "./RequestHandler";

export default class WebServer extends events.EventEmitter {
    /**
     * Express application powering the web server
     */
    public app: express.Application;

    /**
     * Main HTTP(S) web server
     */
    public server: http.Server | https.Server;

    /**
     * Server listening on port 80, in order to redirect HTTP requests to HTTPS
     */
    public redirectServer?: http.Server = undefined;

    /**
     * Load module files
     */
    public moduleLoaders: {[key: string]: ModuleLoader} = {};

    /** key: route */
    public controllers: {[key: string]: typeof eta.IHttpController} = {};
    public lifecycleHandlers: eta.ILifecycleHandler[] = [];
    public requestTransformers: (typeof eta.IRequestTransformer)[] = [];
    public staticFiles: {[key: string]: string} = {};
    public viewFiles: {[key: string]: string} = {};
    public viewMetadata: {[key: string]: {[key: string]: any}} = {};

    public connection: orm.Connection;

    // TODO: Document WebServer.init()
    public async init(): Promise<boolean> {
        await this.loadModules();
        await this.fireLifecycleEvent("onAppStart");

        this.app = express();
        this.connection = await connectDatabase();
        (<any>eta).redis = connectRedis();
        eta.logger.info("Successfully connected to the database.");
        await this.fireLifecycleEvent("onDatabaseConnect");

        this.configureExpress();
        this.setupMiddleware();
        try {
            this.setupAuthProvider();
        } catch (err) {
            eta.logger.error(err.message);
            return false;
        }
        this.app.all("/*", this.onRequest.bind(this));
        this.setupHttpServer();
        await this.fireLifecycleEvent("beforeServerStart");
        return true;
    }

    public async close(): Promise<void> {
        await this.fireLifecycleEvent("onServerStop");
        if (this.server) {
            this.server.close();
        }
        if (this.redirectServer) {
            this.redirectServer.close();
        }
    }

    public start(): void {
        const onHttpServerError: (err: Error) => void = (err: Error) => {
            eta.logger.error("Web server error occurred: " + err.message);
        };
        this.server.on("error", onHttpServerError);
        if (this.redirectServer) {
            this.redirectServer.on("error", onHttpServerError);
        }

        const port: number = eta.config.https.enable ? eta.config.https.port : eta.config.http.port;

        this.server.listen(port, () => {
            eta.logger.info("Web server (main) started on port " + port);
            this.fireLifecycleEvent("onServerStart").catch(err => {
                eta.logger.error(err);
            });
        });

        if (this.redirectServer !== undefined) {
            this.redirectServer.listen(eta.config.http.port, () => {
                eta.logger.info("Web server (redirect) started on port " + eta.config.http.port);
            });
        }
    }

    public async verifyStaticFile(mvcPath: string): Promise<boolean> {
        if (this.staticFiles[mvcPath]) {
            const exists: boolean = await fs.pathExists(this.staticFiles[mvcPath]);
            if (!exists) {
                delete this.staticFiles[mvcPath];
            }
            return exists;
        }
        const staticDirs: string[] = Object.keys(eta.config.modules)
            .map(k => eta.config.modules[k].dirs.staticFiles)
            .reduce((p, a) => p.concat(a));
        for (const staticDir of staticDirs) {
            if (await fs.pathExists(staticDir + mvcPath)) {
                this.staticFiles[mvcPath] = staticDir + mvcPath;
                return true;
            }
        }
        return false;
    }

    public getActionsWithFlag(flag: string, context: eta.IHttpController): ((...args: any[]) => Promise<void>)[] {
        const actions = eta._.values(this.controllers).map(c => {
            const flaggedActionKeys: string[] = Object.keys(c.prototype.actions).filter(k => c.prototype.actions[k].flags.includes(flag));
            if (flaggedActionKeys.length === 0) return [];
            return flaggedActionKeys.map(k => {
                return (...args: any[]) => {
                    const instance: eta.IHttpController = new (<any>c.prototype.constructor)({
                        req: context.req,
                        res: context.res,
                        next: context.next,
                        server: context.server
                    });
                    return (<any>instance)[k].bind(instance)(...args);
                };
            });
        }).filter(a => a.length > 0);
        return actions.length > 0 ? actions.reduce((p, v) => p.concat(v)) : [];
    }

    // TODO: Document actual methodology
    private async loadModules(): Promise<void> {
        eta.config.modules = {};
        eta.constants.controllerPaths = [];
        eta.constants.staticPaths = [];
        eta.constants.viewPaths = [];
        const moduleDirs: string[] = await fs.readdir(eta.constants.modulesPath);
        eta.logger.info(`Found ${moduleDirs.length} modules: ${moduleDirs.join(", ")}`);
        for (const moduleName of moduleDirs) {
            this.moduleLoaders[moduleName] = new ModuleLoader(moduleName);
            this.moduleLoaders[moduleName].on("controller-load", (controllerType: typeof eta.IHttpController) => {
                for (const route of controllerType.prototype.routes) {
                    this.controllers[route] = controllerType;
                }
            });
            await this.moduleLoaders[moduleName].loadAll();
            if (!this.moduleLoaders[moduleName].isInitialized) {
                delete this.moduleLoaders[moduleName];
            }
        }
        let lifecycleHandlerTypes: (typeof eta.ILifecycleHandler)[] = [];
        // map all modules' objects into webserver's global arrays
        Object.keys(this.moduleLoaders).sort().forEach(k => {
            const moduleLoader: ModuleLoader = this.moduleLoaders[k];
            lifecycleHandlerTypes = lifecycleHandlerTypes.concat(moduleLoader.lifecycleHandlers);
            this.requestTransformers = this.requestTransformers.concat(moduleLoader.requestTransformers);
            this.staticFiles = eta._.defaults(moduleLoader.staticFiles, this.staticFiles);
            this.viewFiles = eta._.defaults(moduleLoader.viewFiles, this.viewFiles);
            this.viewMetadata = eta._.defaults(moduleLoader.viewMetadata, this.viewMetadata);
        });
        this.lifecycleHandlers = lifecycleHandlerTypes.map((LifecycleHandler: any) => new LifecycleHandler({ server: this }));
    }

    private async fireLifecycleEvent(name: string): Promise<void> {
        for (const handler of this.lifecycleHandlers) {
            const method: () => Promise<void> = (<any>handler)[name];
            if (method) {
                handler.server = this;
                try {
                    await method.apply(handler);
                } catch (err) {
                    eta.logger.warn("Error while firing lifecycle event " + name + " on " + handler.constructor.name);
                    eta.logger.error(err);
                }
            }
        }
    }

    private configureExpress(): void {
        this.app.set("view engine", "pug");

        if (eta.config.dev.enable) {
            this.app.locals.pretty = true; // render Pug as readable HTML
            this.app.disable("view cache"); // pull Pug views from filesystem on request
        }
    }

    /**
     * Initializes ExpressJS middleware
     */
    private setupMiddleware(): void {
        this.app.use(expressSession({ // sets up req.session provider
            store: new (redisSession(expressSession))({
                client: eta.redis
            }),
            resave: true,
            saveUninitialized: false,
            secret: eta.config.http.session.secret
        }));

        this.app.use(multer({ // sets up support for file uploads
            storage: multer.memoryStorage()
        }).any());

        this.app.use(bodyParser.urlencoded({ // sets up support for standard POST bodies
            extended: false
        }));

        // sets up auth provider
        this.app.use(passport.initialize());
        this.app.use(passport.session());
    }

    private onRequest(req: express.Request, res: express.Response, next: Function): void {
        // initialize custom express properties
        req.mvcPath = decodeURIComponent(req.path);
        // ensure that mvcPath always has a route and action (/route.../action)
        if (req.mvcPath === "/") {
            req.mvcPath = "/home/index";
        } else if (req.mvcPath.endsWith("/")) {
            req.mvcPath += "index";
        }
        if (req.mvcPath.split("/").length === 2) {
            req.mvcPath = "/home" + req.mvcPath;
        }
        const hostTokens: string[] = req.get("host").split(":");
        let host: string = eta.config.http.host + ":" + hostTokens[1];
        if (eta.config.https.realPort !== undefined) {
            let realPort = "";
            if (<any>eta.config.https.realPort !== false) {
                realPort = ":" + eta.config.https.realPort.toString();
            }
            host = host.replace(":" + eta.config.https.port, realPort);
        }
        req.baseUrl = req.protocol + "://" + host + "/";
        req.fullUrl = req.baseUrl + req.mvcPath.substring(1);
        req.mvcFullPath = req.mvcPath;
        if (req.originalUrl.includes("?")) {
            req.mvcFullPath += "?" + req.originalUrl.split("?").slice(-1)[0];
        }
        res.view = {};
        const tokens: string[] = req.mvcPath.split("/");
        // action is the last token of mvcPath
        const action: string = tokens.splice(-1, 1)[0];
        // route is everything else
        const route: string = tokens.join("/");
        // get this for instantiation in RequestHandler
        const controllerClass: typeof eta.IHttpController = this.controllers[route];
        if (this.viewMetadata[req.mvcPath]) { // clone static view metadata into this request's metadata
            res.view = eta._.cloneDeep(this.viewMetadata[req.mvcPath]);
        }
        new RequestHandler({
            route, action,
            controllerPrototype: controllerClass ? controllerClass.prototype : undefined,
            req, res, next,
            server: this
        }).handle().then(() => { })
        .catch(err => {
            eta.logger.error(err);
        });
    }

    private setupHttpServer(): void {
        if (!eta.config.https.enable) { // only http
            this.server = http.createServer(this.app);
            return;
        }

        // HTTPS (and redirect server)
        const sslOptions: any = {
            "key": fs.readFileSync(eta.config.https.key),
            "cert": fs.readFileSync(eta.config.https.cert),
            "secureProtocol": "TLSv1_2_method"
        };

        if (eta.config.https.ca) {
            sslOptions.ca = fs.readFileSync(eta.config.https.ca);
        }

        this.server = https.createServer(sslOptions, this.app);

        this.redirectServer = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
            res.writeHead(301, {
                Location: "https://" + eta.config.http.host + ":" + eta.config.https.realPort + req.url
            });
            res.end();
        });
    }

    // TODO Document authentication handling
    private setupAuthProvider(): void {
        if (!eta.config.auth.provider) {
            throw new Error("No authentication provider is set.");
        }
        if (!this.moduleLoaders[eta.config.auth.provider]) {
            throw new Error("The authentication provider specified (" + eta.config.auth.provider + ") is invalid.");
        }
        const AuthProvider: typeof eta.IAuthProvider = this.moduleLoaders[eta.config.auth.provider].authProvider;
        if (!AuthProvider) {
            throw new Error("The authentication provider specified (" + eta.config.auth.provider + ") + does not expose an IAuthProvider class.");
        }
        const tempProvider: eta.IAuthProvider = new (<any>AuthProvider)();
        const overrideRoutes: string[] = tempProvider.getOverrideRoutes();
        const strategy: passport.Strategy = tempProvider.getPassportStrategy();
        passport.use(strategy.name, strategy);
        const getHandler = (req: express.Request, res: express.Response, next: express.NextFunction): (err: Error, user: any) => void => {
            const provider: eta.IAuthProvider = new (<any>AuthProvider)({ req, res, next });
            return (err: Error, user: any) => {
                if (err) {
                    eta.logger.error(err);
                    RequestHandler.renderError(res, eta.constants.http.InternalError);
                    return;
                }
                if (!user) return res.redirect("/login");
                provider.onPassportLogin(user).then(() => {
                    if (res.finished) return;
                    req.session.userid = user.id;
                    req.session.save(() => {
                        res.redirect(req.session.lastPage);
                    });
                }).catch(err => {
                    eta.logger.error(err);
                    RequestHandler.renderError(res, eta.constants.http.InternalError);
                });
            };
        };
        this.app.all("/login", (req, res, next) => {
            if (req.method === "GET" && strategy.name === "local") {
                if (req.session.lastPage) {
                    req.session.authFrom = req.session.lastPage;
                    req.session.save(() => {
                        res.redirect("/auth/local/login");
                    });
                } else {
                    res.redirect("/auth/local/login");
                }
                return;
            }
            passport.authenticate(strategy.name, getHandler(req, res, next))(req, res, next);
        });
        overrideRoutes.forEach(r => {
            this.app.post(r, (req, res, next) => {
                passport.authenticate(strategy.name, getHandler(req, res, next))(req, res, next);
            });
        });
    }
}

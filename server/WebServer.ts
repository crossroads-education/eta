/// <reference path="../def/express.d.ts"/>
import * as bodyParser from "body-parser";
import * as express from "express";
import * as expressSession from "express-session";
import * as fs from "fs-extra";
import * as http from "http";
import * as https from "https";
import * as multer from "multer";
import * as orm from "typeorm";
import * as pg from "pg";
import * as eta from "../eta";
import { connect } from "./api/db";
import ModuleLoader from "./ModuleLoader";
import RequestHandler from "./RequestHandler";

export default class WebServer {
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
    public lifecycleHandlers: (typeof eta.ILifecycleHandler)[] = [];
    public requestTransformers: (typeof eta.IRequestTransformer)[] = [];
    public staticFiles: {[key: string]: string} = {};
    public viewFiles: {[key: string]: string} = {};
    public viewMetadata: {[key: string]: {[key: string]: any}} = {};

    public async init(): Promise<void> {
        await this.loadModules();
        await this.fireLifecycleEvent("onAppStart");

        this.app = express();
        const conn: orm.Connection = await connect();
        (<any>eta).db = conn;
        eta.logger.info("Successfully connected to the database.");
        await this.fireLifecycleEvent("onDatabaseConnect");

        this.configureExpress();
        this.setupMiddleware();
        this.app.all("/*", this.onRequest.bind(this));
        this.setupHttpServer();
        await this.fireLifecycleEvent("beforeServerStart");
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

    private async loadModules(): Promise<void> {
        eta.config.modules = {};
        eta.constants.controllerPaths = [];
        eta.constants.staticPaths = [];
        eta.constants.viewPaths = [];
        const moduleDirs: string[] = await fs.readdir(eta.constants.modulesPath);
        await eta.array.forEachAsync(moduleDirs, moduleName => {
            this.moduleLoaders[moduleName] = new ModuleLoader(moduleName);
            eta.logger.trace("Loading module " + moduleName);
            return this.moduleLoaders[moduleName].loadAll();
        });
        Object.keys(this.moduleLoaders).sort().forEach(k => {
            const moduleLoader: ModuleLoader = this.moduleLoaders[k];
            this.controllers = eta.object.merge(moduleLoader.controllers, this.controllers);
            this.lifecycleHandlers = this.lifecycleHandlers.concat(moduleLoader.lifecycleHandlers);
            this.requestTransformers = this.requestTransformers.concat(moduleLoader.requestTransformers);
            this.staticFiles = eta.object.merge(moduleLoader.staticFiles, this.staticFiles);
            this.viewFiles = eta.object.merge(moduleLoader.viewFiles, this.viewFiles);
            this.viewMetadata = eta.object.merge(moduleLoader.viewMetadata, this.viewMetadata);
        });
    }

    private fireLifecycleEvent(name: string): Promise<void> {
        return eta.array.forEachAsync(this.lifecycleHandlers, async (handler: any) => {
            const method: () => Promise<void> = handler[name];
            if (method) {
                handler.server = this;
                await method.apply(handler);
            }
        });
    }

    private configureExpress(): void {
        this.app.set("view engine", "pug");

        if (eta.config.dev.enable) {
            this.app.locals.pretty = true; // render Pug as readable HTML
            this.app.disable("view cache"); // pull Pug views from filesystem on request
        }
    }

    private setupMiddleware(): void {
        const dbcfg: any = eta.config.db;
        const connectionString = `postgres://${dbcfg.username}:${dbcfg.password}@${dbcfg.host}:${dbcfg.port}/${dbcfg.database}`;
        this.app.use(expressSession({
            store: new (require("connect-pg-simple")(expressSession))({
                pg,
                conString: connectionString
            }),
            resave: true,
            saveUninitialized: false,
            secret: eta.config.http.sessionSecret
        }));

        this.app.use(multer({
            storage: multer.memoryStorage()
        }).any());

        this.app.use(bodyParser.urlencoded({
            extended: false
        }));
    }

    private onRequest(req: express.Request, res: express.Response, next: Function): void {
        // initialize custom express properties
        req.mvcPath = decodeURIComponent(req.path);
        if (req.mvcPath === "/") {
            req.mvcPath = "/home/index";
        } else if (req.mvcPath.endsWith("/")) {
            req.mvcPath += "index";
        }
        if (req.mvcPath.split("/").length === 2) {
            req.mvcPath = "/home" + req.mvcPath;
        }
        let host: string = req.get("host");
        if (eta.config.https.realPort !== undefined) {
            let realPort = "";
            if (<any>eta.config.https.realPort !== false) {
                realPort = ":" + eta.config.https.realPort.toString();
            }
            host = host.replace(":" + eta.config.https.port, realPort);
        }
        req.baseUrl = req.protocol + "://" + host + "/";
        req.fullUrl = req.baseUrl + req.mvcPath.substring(1);
        res.view = {};
        const tokens: string[] = req.mvcPath.split("/");
        const action: string = tokens.splice(-1, 1)[0];
        const route: string = tokens.join("/");
        const controllerClass: typeof eta.IHttpController = this.controllers[route];
        if (this.viewMetadata[req.mvcPath]) {
            res.view = eta.object.clone(this.viewMetadata[req.mvcPath]);
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
}

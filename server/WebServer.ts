/// <reference path="../def/express.d.ts"/>
import * as bodyParser from "body-parser";
import * as express from "express";
import * as expressSession from "express-session";
import * as fs from "fs";
import * as http from "http";
import * as https from "https";
import * as multer from "multer";
import * as orm from "typeorm";
import * as pg from "pg";
import * as eta from "../eta";
import {connect} from "./api/db";
import PageManager from "./PageManager";

export default class WebServer {
    /**
    Express application powering the web server
    */
    public app: express.Application;

    /**
    Main HTTP(S) web server
    */
    public server: http.Server | https.Server;

    /**
    Server listening on port 80, in order to redirect HTTP requests to HTTPS
    */
    public redirectServer?: http.Server = null;

    /**
    Routes requests and loads controllers
    */
    public pageManager: PageManager;

    /**
    Handle lifecycle events (server start, app start, etc)
    */
    public lifecycleHandlers: eta.ILifecycleHandler[] = [];

    public async init(): Promise<void> {
        this.setupLifecycleHandlers();
        await this.fireLifecycleEvent("onAppStart");

        this.app = express();
        let conn: orm.Connection = await connect();
        (<any>eta).db = conn;
        eta.logger.info("Successfully connected to the database.");
        await this.fireLifecycleEvent("onDatabaseConnect");

        this.configureExpress();
        this.setupMiddleware();
        await this.setupListeners();
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
        let onHttpServerError: (err: Error) => void = (err: Error) => {
            eta.logger.error("Web server error occurred: " + err.message);
        };
        this.server.on("error", onHttpServerError);
        if (this.redirectServer) {
            this.redirectServer.on("error", onHttpServerError);
        }

        let port: number = eta.config.https.enable ? eta.config.https.port : eta.config.http.port;

        this.server.listen(port, () => {
            eta.logger.info("Web server (main) started on port " + port);
            this.fireLifecycleEvent("onServerStart").catch(err => {
                eta.logger.error(err);
            });
        });


        if (this.redirectServer != null) {
            this.redirectServer.listen(eta.config.http.port, () => {
                eta.logger.info("Web server (redirect) started on port " + eta.config.http.port);
            });
        }
    }

    private setupLifecycleHandlers() {
        eta.config.content.lifecycleDirs.forEach(lifecycleDir => {
            lifecycleDir = eta.constants.basePath + "content/" + lifecycleDir + "/";
            fs.readdirSync(lifecycleDir).forEach(filename => {
                if (!filename.endsWith(".js")) {
                    return;
                }
                try {
                    let lifecycleHandler: typeof eta.ILifecycleHandler = require(lifecycleDir + filename).default;
                    this.lifecycleHandlers.push(new (<any>lifecycleHandler)({server: this}));
                } catch (err) {
                    eta.logger.error(`Couldn't load lifecycle handler ${filename}`);
                    eta.logger.error(err);
                }
            });
        });
    }

    private async fireLifecycleEvent(name: string): Promise<void> {
        for (let i in this.lifecycleHandlers) {
            let handler: any = (<any>this.lifecycleHandlers[i]);
            let method: () => Promise<void> = handler[name];
            if (method) {
                handler.server = this;
                await method.apply(handler);
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

    private setupMiddleware(): void {
        let dbcfg: any = eta.config.db;
        let connectionString: string = `postgres://${dbcfg.username}:${dbcfg.password}@${dbcfg.host}:${dbcfg.port}/${dbcfg.database}`;
        this.app.use(expressSession({
            store: new (require("connect-pg-simple")(expressSession))({
                pg: pg,
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

    private async setupListeners(): Promise<void> {
        this.pageManager = new PageManager();
        await this.pageManager.load();
        this.app.all("/*", (req: express.Request, res: express.Response, next: Function) => {
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
            req.baseUrl = req.protocol + "://" + req.get("host") + "/";
            req.fullUrl = req.baseUrl + req.mvcPath.substring(1);
            res.view = {};
            return this.pageManager.handle(req, res, next);
        });
    }

    private setupHttpServer(): void {
        if (!eta.config.https.enable) { // only http
            this.server = http.createServer(this.app);
            return;
        }

        // HTTPS (and redirect server)
        let sslOptions: any = {
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
                Location: "https://" + eta.config.http.host + ":" + eta.config.https.port + req.url
            });
            res.end();
        });
    }
}

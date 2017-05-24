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
    private app: express.Application;

    /**
    Main HTTP(S) web server
    */
    private server: http.Server | https.Server;

    /**
    Server listening on port 80, in order to redirect HTTP requests to HTTPS
    */
    private redirectServer?: http.Server = null;

    /**
    Routes requests and loads controllers
    */
    private pageManager: PageManager;

    private lifecycleHandlers: eta.ILifecycleHandler[] = [];

    public constructor() {
        this.setupLifecycleHandlers();
        this.fireLifecycleEvent("onAppStart").then(() => {
            this.app = express();
            connect().then((conn: orm.Connection) => {
                (<any>eta).db = conn;
                eta.logger.info("Successfully connected to the database.");
                this.fireLifecycleEvent("onDatabaseConnect").then(() => {
                    this.configureExpress();
                    this.setupMiddleware();
                    this.setupListeners();
                    this.setupHttpServer();
                    this.start();
                }).catch(err => {
                    eta.logger.error(err);
                });
            }).catch(err => {
                if (err.code == "42704" || (err[0] && err[0].code == "42704")) {
                    eta.logger.error("Please make sure you have the latest commit version of Eta.");
                    eta.logger.trace(err.message);
                } else {
                    eta.logger.error(err);
                }
            });
        }).catch(err => {
            eta.logger.error(err);
        });
    }

    private start(): void {
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
            lifecycleDir = eta.path.baseDir + "content/" + lifecycleDir + "/";
            fs.readdirSync(lifecycleDir).forEach(filename => {
                if (!filename.endsWith(".js")) {
                    return;
                }
                try {
                    let lifecycleHandler: typeof eta.ILifecycleHandler = require(lifecycleDir + filename).default;
                    this.lifecycleHandlers.push(new (<any>lifecycleHandler)());
                } catch (err) {
                    eta.logger.error(`Couldn't load lifecycle handler ${filename}`);
                    eta.logger.error(err);
                }
            });
        });
    }

    private async fireLifecycleEvent(name: string): Promise<void> {
        for (let i in this.lifecycleHandlers) {
            let method: () => Promise<void> = (<any>this.lifecycleHandlers[i])[name];
            if (method) {
                await method();
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

    private setupListeners(): void {
        this.pageManager = new PageManager();
        this.pageManager.load();
        this.app.all("/*", (req: express.Request, res: express.Response, next: Function) => {
            // initialize custom express properties
            req.mvcPath = req.path;
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

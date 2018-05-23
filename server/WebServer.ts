/// <reference path="../def/express.d.ts"/>
import * as bodyParser from "body-parser";
import * as redisSession from "connect-redis";
import * as express from "express";
import * as expressSession from "express-session";
import * as fs from "fs-extra";
import * as http from "http";
import * as https from "https";
import * as multer from "multer";
import * as passport from "passport";
import * as eta from "@eta/eta";
import Application from "./Application";
import Authenticator from "./Authenticator";
import RepositoryManager from "@eta/db";
import RequestHandler from "./RequestHandler";

export default class WebServer {
    public app: Application;
    /**
     * Express application powering the web server
     */
    public express: express.Application;

    /**
     * Main HTTP(S) web server
     */
    public server: http.Server | https.Server;

    /**
     * Server listening on port 80, in order to redirect HTTP requests to HTTPS
     */
    public redirectServer?: http.Server = undefined;

    public middleware: {[key: string]: express.Handler} = <any>{};

    private get config(): eta.Configuration {
        return this.app.configs.global;
    }

    public async init(): Promise<boolean> {
        this.express = express();
        this.configureExpress();
        await this.app.emit("server:middleware:before");
        this.setupMiddleware();
        await this.app.emit("server:middleware:after");
        try {
            Authenticator.setup(this.app);
        } catch (err) {
            eta.logger.error(err);
            return false;
        }
        this.express.all("/*", this.onRequest.bind(this));
        this.setupHttpServer();
        return true;
    }

    public async close(): Promise<void> {
        await this.app.emit("server:stop");
        if (this.server) {
            this.server.close();
        }
        if (this.redirectServer) {
            this.redirectServer.close();
        }
    }

    public start(): void {
        const onHttpServerError = (err: Error) => {
            eta.logger.error("Web server error occurred: " + err.message);
        };
        this.server.on("error", onHttpServerError);
        if (this.redirectServer) {
            this.redirectServer.on("error", onHttpServerError);
        }
        const port: number = this.config.get(`http${this.config.get("https.enable") ? "s" : ""}.port`);
        this.server.listen(port, () => {
            eta.logger.info("Web server (main) started on port " + port);
            (<Promise<void>><any>this.app.emit("server:start")).catch(err => {
                eta.logger.error(err);
            });
        });
        if (this.redirectServer !== undefined) {
            this.redirectServer.listen(this.config.get("http.port"), () => {
                eta.logger.info("Web server (redirect) started on port " + this.config.get("http.port"));
            });
        }
    }

    private configureExpress(): void {
        this.express.set("view engine", "pug");
        if (this.config.get("dev.enable")) {
            this.express.locals.pretty = true; // render Pug as readable HTML
            this.express.disable("view cache"); // pull Pug views from filesystem on request
        }
    }

    /**
     * Initializes ExpressJS middleware
     */
    private setupMiddleware(): void {
        this.middleware = {
            session: expressSession({ // sets up req.session provider
                store: new (redisSession(expressSession))({
                    client: this.app.redis
                }),
                resave: true,
                saveUninitialized: false,
                secret: this.config.get("session.secret")
            }),
            multer: multer({ // sets up support for file uploads
                storage: multer.memoryStorage()
            }).any(),
            bodyParser: bodyParser.urlencoded({ // sets up support for standard POST bodies
                extended: true
            }),
            bodyParserJSON: bodyParser.json(),
            passport: passport.initialize(),
            passportSession: passport.session()
        };
        if (this.config.get("dev.enable")) { // basically disable any CORS security if dev mode is enabled
            this.express.all("/*", (req, res, next) => {
                if (!req.headers.origin) return next();
                res.setHeader("Access-Control-Allow-Origin", req.headers.origin);
                res.setHeader("Access-Control-Allow-Headers", "*");
                res.setHeader("Access-Control-Allow-Methods", "*");
                res.setHeader("Access-Control-Allow-Credentials", "true");
                if (req.method === "OPTIONS") {
                    res.sendStatus(200);
                } else {
                    next();
                }
            });
        }
        // check for a static file before anything else
        this.express.use((req, res, next) => {
            const handler = this.createRequestHandler(req, res, next);
            (async () => {
                if (await handler.isStaticFile()) {
                    return handler.handleRequest();
                }
                next();
            })().catch(err => eta.logger.error(err));
        });
        Object.keys(this.middleware).forEach(m => {
            this.express.use(this.middleware[m]);
        });
    }

    private onRequest(req: express.Request, res: express.Response, next: express.NextFunction): void {
        this.createRequestHandler(req, res, next)
            .handleRequest().catch(err => {
                eta.logger.error(err);
            });
    }

    private setupHttpServer(): void {
        if (!this.config.get("https.enable")) { // only http
            this.server = http.createServer(this.express);
            return;
        }
        // HTTPS (and redirect server)
        const sslOptions: any = {
            "key": fs.readFileSync(this.config.get("https.privateKey") || this.config.get("https.key")),
            "cert": fs.readFileSync(this.config.get("https.publicKey") || this.config.get("https.cert")),
            "secureProtocol": "TLSv1_2_method"
        };
        const chainFilename: string = this.config.get("https.chainKey") || this.config.get("https.ca");
        if (chainFilename) {
            sslOptions.ca = fs.readFileSync(chainFilename);
        }
        this.server = https.createServer(sslOptions, this.express);
        this.redirectServer = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
            res.writeHead(301, {
                Location: "https://" + this.config.get("http.host") + ":" + this.config.get("https.realPort") + req.url
            });
            res.end();
        });
    }

    private createRequestHandler(req: express.Request, res: express.Response, next: express.NextFunction) {
        return new RequestHandler({
            req, res, next,
            app: this.app,
            config: this.app.configs[req.hostname] || this.config,
            db: new RepositoryManager(req.hostname)
        });
    }
}

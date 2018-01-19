import * as eta from "../eta";
import * as express from "express";
import * as passport from "passport";
import Application from "./Application";
import RequestHandler from "./RequestHandler";

export default class Authenticator {
    private static app: Application;
    private static onLogout(req: express.Request, res: express.Response): void {
        const newSession: {[key: string]: any} = {
            authFrom: req.session.authFrom,
            lastPage: req.session.lastPage
        };
        req.session.regenerate(err => {
            if (err) {
                eta.logger.error(err);
                res.statusCode = eta.constants.http.InternalError;
                res.send("Internal error");
                return;
            }
            Object.keys(newSession).forEach(k => req.session[k] = newSession[k]);
            if (!req.session.authFrom) req.session.authFrom = "/home/index";
            req.session.save(err => {
                if (err) eta.logger.error(err);
                if (req.query.noRedirect !== undefined) {
                    res.send("Logged out successfully.");
                } else {
                    res.redirect(303, req.session.authFrom);
                    res.end();
                }
            });
        });
    }

    private static onLogin(req: express.Request, res: express.Response, next: express.NextFunction): void {
        const http: eta.HttpRequest = {
            req, res, next,
            config: this.app.configs[req.hostname] || this.app.configs.global
        };
        (<Promise<void>><any>this.app.server.emit("pre-auth", http)).then(() => {
            if (res.finished) return;
            passport.authenticate(http.config.get("auth.provider"), (err: Error, user: any) => {
                (async () => {
                    if (err) throw err;
                    if (user === undefined) return res.redirect("/login");
                    await this.app.server.emit("auth", { req, res, next }, user);
                    if (res.finished) return;
                    req.session.save(() => {
                        res.redirect(req.session.lastPage);
                    });
                })().catch(err => {
                    eta.logger.error(err);
                    RequestHandler.renderError(http, eta.constants.http.InternalError);
                });
            })(req, res, next);
        });
    }

    public static setup(app: Application): void {
        this.app = app;
        app.server.express.all("/login", this.onLogin.bind(this));
        app.server.express.all("/logout", this.onLogout.bind(this));
    }
}

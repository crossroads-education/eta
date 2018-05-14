import * as eta from "../eta";
import * as express from "express";
import * as passport from "passport";
import Application from "./Application";

export default class Authenticator {
    private static app: Application;
    private static async onLogout(req: express.Request, res: express.Response) {
        const newSession: {[key: string]: any} = {
            authFrom: req.session.authFrom,
            lastPage: req.session.lastPage
        };
        await eta.session.promise(req.session, "regenerate");
        Object.keys(newSession).forEach(k => req.session[k] = newSession[k]);
        await eta.session.promise(req.session, "save");
        if (req.query.noRedirect !== undefined) {
            res.send("Logged out successfully.");
        } else {
            res.redirect(303, req.session.authFrom || "/");
            res.end();
        }
    }

    private static async onLogin(req: express.Request, res: express.Response, next: express.NextFunction) {
        const http: eta.HttpRequest = {
            req, res, next,
            config: this.app.configs[req.hostname] || this.app.configs.global
        };
        if (req.query.redirectTo) {
            req.session.lastPage = req.session.authFrom = req.query.redirectTo;
            await eta.session.promise(req.session, "save");
        }
        await this.app.emit("auth:pre", http);
        if (res.finished) return;
        const user = await new Promise((resolve, reject) => {
            passport.authenticate(http.config.get("http.host") + "-" + http.config.get("auth.provider"), (err: Error, user: any) => {
                if (err) reject(err);
                else resolve(user);
            });
        });
        if (user === undefined) return res.redirect("/login");
        await this.app.emit("auth", http, user);
        if (res.finished) return;
        await eta.session.promise(req.session, "save");
        res.redirect(req.session.lastPage || "/");
    }

    public static setup(app: Application): void {
        this.app = app;
        const onExpressError = (res: express.Response) => (err: any) => {
            eta.logger.error(err);
            res.sendStatus(500);
        };
        app.server.express.all("/login", (req, res, next) => this.onLogin(req, res, next).catch(onExpressError(res)));
        app.server.express.all("/logout", (req, res) => this.onLogout(req, res).catch(onExpressError(res)));
    }
}

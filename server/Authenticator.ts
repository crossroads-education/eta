import * as eta from "../eta";
import * as express from "express";
import * as passport from "passport";
import Application from "./Application";
import RequestHandler from "./RequestHandler";

export default class Authenticator extends eta.IRequestHandler {
    public static AuthProvider: typeof eta.IAuthProvider;
    public static strategy: passport.Strategy;

    public provider: eta.IAuthProvider;

    public handleAuth(err: Error, user: any): void {
        if (err) {
            eta.logger.error(err);
            RequestHandler.renderError(this.res, eta.constants.http.InternalError);
            return;
        }
        if (!user) return this.res.redirect("/login");
        this.provider.onPassportLogin(user).then(() => {
            if (this.res.finished) return;
            this.req.session.userid = user.id;
            this.req.session.save(() => {
                this.res.redirect(this.req.session.lastPage);
            });
        }).catch(err => {
            eta.logger.error(err);
            RequestHandler.renderError(this.res, eta.constants.http.InternalError);
        });
    }

    public handleLocalAuth(): void {
        if (this.req.session.lastPage) {
            this.req.session.authFrom = this.req.session.lastPage;
            this.req.session.save(() => {
                this.res.redirect("/auth/local/login");
            });
        } else {
            this.res.redirect("/auth/local/login");
        }
    }

    public logout(): void {
        const newSession: {[key: string]: any} = {
            authFrom: this.req.session.authFrom,
            lastPage: this.req.session.lastPage
        };
        this.req.session.regenerate(err => {
            if (err) {
                eta.logger.error(err);
                this.res.statusCode = eta.constants.http.InternalError;
                this.res.send("Internal error");
                return;
            }
            Object.keys(newSession).forEach(k => this.req.session[k] = newSession[k]);
            if (!this.req.session.authFrom) this.req.session.authFrom = "/home/index";
            this.req.session.save(err => {
                if (err) eta.logger.error(err);
                this.res.redirect(303, this.req.session.authFrom);
                this.res.end();
            });
        });
    }
    public static setup(app: Application): void {
        if (!eta.config.auth.provider) {
            throw new Error("No authentication provider is set.");
        }
        if (!app.moduleLoaders[eta.config.auth.provider]) {
            throw new Error("The authentication provider specified (" + eta.config.auth.provider + ") is invalid.");
        }
        this.AuthProvider = app.moduleLoaders[eta.config.auth.provider].authProvider;
        if (!this.AuthProvider) {
            throw new Error("The authentication provider specified (" + eta.config.auth.provider + ") + does not expose an IAuthProvider class.");
        }
        const tempProvider: eta.IAuthProvider = new (<any>this.AuthProvider)();
        const overrideRoutes: string[] = tempProvider.getOverrideRoutes();
        this.strategy = tempProvider.getPassportStrategy();
        passport.use(this.strategy.name, this.strategy);
        app.server.express.all("/login", (req, res, next) => {
            if (req.method === "GET" && this.strategy.name === "local") {
                new Authenticator({req, res, next}).handleLocalAuth();
                return;
            }
            passport.authenticate(this.strategy.name, this.buildHandler({req, res, next}))(req, res, next);
        });
        app.server.express.all("/logout", (req, res, next) => {
            new Authenticator({req, res, next}).logout();
        });
        for (const overrideRoute of overrideRoutes) {
            app.server.express.post(overrideRoute, (req, res, next) => {
                passport.authenticate(this.strategy.name, this.buildHandler({req, res, next}))(req, res, next);
            });
        }
    }

    private static buildHandler(init: Partial<eta.IRequestHandler>): (err: Error, user: any) => void {
        const authenticator = new Authenticator(init);
        authenticator.provider = new (<any>this.AuthProvider)(init);
        return authenticator.handleAuth.bind(authenticator);
    }
}

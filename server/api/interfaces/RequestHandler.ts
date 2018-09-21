import * as express from "express";
import Application from "@eta/server/Application";
import * as helpers from "@eta/helpers/index";
import Configuration from "@eta/lib/Configuration";
import RepositoryManager from "@eta/db";

abstract class RequestHandler {
    public app: Application;
    public req: express.Request & { db?: RepositoryManager };
    public res: express.Response;
    public next: express.NextFunction;
    public config: Configuration;
    public db: RepositoryManager;

    public constructor(init: Partial<RequestHandler>) {
        Object.assign(this, init);
    }

    public redirect(url: string): void {
        helpers.http.redirect(this.res, url);
    }

    public saveSession(): Promise<void> {
        return helpers.session.promise(this.req.session, "save");
    }

    public isLoggedIn(): boolean {
        return this.req.session !== undefined && this.req.session.userid !== undefined;
    }
}

export default RequestHandler;

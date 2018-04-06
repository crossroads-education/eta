import * as express from "express";
import * as helpers from "../../../helpers/index";
import Configuration from "../../../lib/Configuration";
import RepositoryManager from "../../../db";
import WebServer from "../../WebServer";

abstract class RequestHandler {
    public server: WebServer;
    public req: express.Request;
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

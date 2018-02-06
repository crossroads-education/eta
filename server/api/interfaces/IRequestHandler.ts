import * as express from "express";
import * as helpers from "../../../helpers/index";
import Configuration from "../../../lib/Configuration";
import RepositoryManager from "../../../db";

abstract class IRequestHandler {
    public req: express.Request;
    public res: express.Response;
    public next: express.NextFunction;
    public config: Configuration;
    public db: RepositoryManager;

    public constructor(init: Partial<IRequestHandler>) {
        Object.assign(this, init);
    }

    public error(code: number, more?: {[key: string]: any}): void { this.sendRawResponse("error", code, more); }
    public result(code: number, more?: {[key: string]: any}): void { this.sendRawResponse("result", code, more); }

    public redirect(url: string): void {
        IRequestHandler.redirect(this.res, url);
    }

    public static redirect(res: express.Response, url: string): void {
        res.redirect(302, url);
        res.end();
        res.finished = true;
    }

    public saveSession(): Promise<void> {
        return helpers.session.promise(this.req.session, "save");
    }

    public isLoggedIn(): boolean {
        return this.req.session !== undefined && this.req.session.userid !== undefined;
    }

    private sendRawResponse(name: string, code: number, more?: {[key: string]: any}): void {
        if (!more) more = {};
        more[name] = code;
        this.res.raw = more;
    }
}

export default IRequestHandler;

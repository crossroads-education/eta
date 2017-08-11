import * as express from "express";
import * as helpers from "../../../helpers/index";

abstract class IRequestHandler {
    public req: express.Request;
    public res: express.Response;
    public next: Function;

    public constructor(init: Partial<IRequestHandler>) {
        Object.assign(this, init);
    }

    public error(err: number, more?: {[key: string]: any}): void {
        if (!more) {
            more = {};
        }
        more["error"] = err;
        this.res.raw = more;
    }

    public result(result: number, more?: {[key: string]: any}): void {
        if (!more) {
            more = {};
        }
        more["result"] = result;
        this.res.raw = more;
    }

    public redirect(url: string): void {
        this.res.redirect(url, 307);
        this.res.end();
        this.res.finished = true;
    }

    public async saveSession(): Promise<void> {
        return helpers.session.save(this.req.session);
    }

    public isLoggedIn(): boolean {
        return this.req.session !== undefined && this.req.session.userid !== undefined;
    }
}

export default IRequestHandler;

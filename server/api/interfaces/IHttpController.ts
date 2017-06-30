import * as express from "express";
import IRequestHandler from "./IRequestHandler";

abstract class IHttpController extends IRequestHandler {
    public actions: {[key: string]: string} = {};
    public authRequired: string[] = [];
    public params: {[key: string]: string[]} = {};
    public raw: string[] = [];
    public routes: string[] = [];

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
        this.res.redirect(url);
        this.res.end();
        this.res.finished = true;
    }

    public async saveSession(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.req.session.save((err: Error) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    public isLoggedIn(): boolean {
        return !!this.req.session && !!this.req.session.userid;
    }
}

export default IHttpController;

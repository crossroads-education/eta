import * as express from "express";

export default class HttpHelper {
    public static redirect(res: express.Response, url: string): void {
        res.redirect(303, url);
        res.end();
        res.finished = true;
    }
}

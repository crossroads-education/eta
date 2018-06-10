import * as express from "express";

export default class HttpHelper {
    public static redirect(res: express.Response, url: string): void {
        res.redirect(303, url);
        res.end();
        res.finished = true;
    }

    public static getClientIP(req: express.Request) {
        // x-forwarded-for can be a CSV of IPs, get the first
        return ((req.headers["x-forwarded-for"] as string) || req.connection.remoteAddress || "").split(",")[0].trim();
    }
}

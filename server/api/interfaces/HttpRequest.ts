import * as express from "express";

export default interface HttpRequest {
    req: express.Request;
    res: express.Response;
    next: express.NextFunction;
}

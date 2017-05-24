import * as express from "express";

abstract class IRequestHandler {
    public req: express.Request;
    public res: express.Response;
    public next: Function;

    public constructor(init: Partial<IRequestHandler>) {
        Object.assign(this, init);
    }
}

export default IRequestHandler;

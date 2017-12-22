import * as express from "express";
import HttpRoute from "./HttpRoute";
import IRequestHandler from "./IRequestHandler";
import WebServer from "../../WebServer";

abstract class IHttpController extends IRequestHandler {
    public route: HttpRoute;
    public server: WebServer;
    public params: {[key: string]: string} = {};

    public constructor(init: Partial<IHttpController>) {
        super(init);
        Object.assign(this, init);
    }
}

export default IHttpController;

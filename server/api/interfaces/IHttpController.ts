import * as express from "express";
import HttpRoute from "./HttpRoute";
import IRequestHandler from "./IRequestHandler";

abstract class IHttpController extends IRequestHandler {
    public route: HttpRoute;
    public params: {[key: string]: string} = {};

    public constructor(init: Partial<IHttpController>) {
        super(init);
        Object.assign(this, init);
    }

    public redis<T>(method: string, ...args: any[]): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            (<any>this.server.app.redis)[method].bind(this.server.app.redis)(...args, (err: Error, result: T) => {
                if (err) reject(err);
                else resolve(result);
            });
        });
    }
}

export default IHttpController;

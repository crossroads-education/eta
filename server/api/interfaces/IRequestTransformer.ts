import * as express from "express";
import IRequestHandler from "./IRequestHandler";

abstract class IRequestTransformer extends IRequestHandler {
    public get sortOrder(): number { return 100; }
    public async onRequest(): Promise<void> { }
    public async beforeResponse(): Promise<void> { }
    /**
     * Returns true if this request is authorized for the given permissions.
     */
    public isRequestAuthorized(permissions: any[]): Promise<boolean> {
        return Promise.resolve(true);
    }
}

export default IRequestTransformer;

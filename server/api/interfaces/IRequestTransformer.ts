import * as express from "express";
import IRequestHandler from "./IRequestHandler";

abstract class IRequestTransformer extends IRequestHandler {
    public async onRequest(): Promise<void> { }
    public async beforeResponse(): Promise<void> { }
}

export default IRequestTransformer;

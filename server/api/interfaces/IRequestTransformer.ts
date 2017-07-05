import * as express from "express";
import IRequestHandler from "./IRequestHandler";

abstract class IRequestTransformer extends IRequestHandler {
    onRequest(): void { }
    beforeResponse(): void { }
}

export default IRequestTransformer;

import * as express from "express";
import IRequestHandler from "./IRequestHandler";

abstract class IViewTransformer extends IRequestHandler {
    abstract transform(): {[key: string]: any};
}

export default IViewTransformer;

import * as express from "express";
import IRequestHandler from "./IRequestHandler";

abstract class IHttpController extends IRequestHandler {
    public actions: {[key: string]: string} = {};
    public authRequired: string[] = [];
    public params: {[key: string]: string[]} = {};
    public raw: string[] = [];
    public routes: string[] = [];

    public error(err: number, more?: {[key: string]: any}): void {
        if (!more) {
            more = {};
        }
        more["error"] = err;
        this.res.raw = more;
    }

    public result(result: number, more?: {[key: string]: any}): void {
        if (!more) {
            more = {};
        }
        more["result"] = result;
        this.res.raw = more;
    }
}

export default IHttpController;

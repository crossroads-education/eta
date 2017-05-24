import * as express from "express";
import IRequestHandler from "./IRequestHandler";

abstract class IHttpController extends IRequestHandler {
    public actions: {[key: string]: string} = {};
    public authRequired: string[] = [];
    public params: {[key: string]: string[]} = {};
    public raw: string[] = [];
    public routes: string[] = [];
}

export default IHttpController;

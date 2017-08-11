import * as express from "express";
import IRequestHandler from "./IRequestHandler";
import WebServer from "../../WebServer";

abstract class IHttpController extends IRequestHandler {
    public actions: {[key: string]: string} = {};
    public authRequired: string[] = [];
    public params: {[key: string]: string[]} = {};
    public permsRequired: {[key: string]: any[]} = {};
    public raw: string[] = [];
    public routes: string[] = [];

    public server: WebServer;
}

export default IHttpController;

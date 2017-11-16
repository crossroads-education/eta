import * as express from "express";
import IRequestHandler from "./IRequestHandler";
import WebServer from "../../WebServer";

abstract class IHttpController extends IRequestHandler {
    public routes: string[] = [];
    public actions: {[key: string]: {
        flags: string[];
        method: "GET" | "POST";
        useView: boolean;
        isAuthRequired: boolean;
        permissionsRequired: string[];
    }} = {};
    public server: WebServer;
}

export default IHttpController;

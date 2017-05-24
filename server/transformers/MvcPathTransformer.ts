import * as express from "express";
import * as api from "../api";

export default class MvcPathTransformer extends api.IViewTransformer {
    public transform(): {[key: string]: any} {
        this.res.view["mvcPath"] = this.req.mvcPath;
        return this.res.view;
    }
}

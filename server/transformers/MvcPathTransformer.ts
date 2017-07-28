import * as express from "express";
import * as api from "../api";

export default class MvcPathTransformer extends api.IRequestTransformer {
    public async beforeResponse(): Promise<void> {
        this.res.view["mvcPath"] = this.req.mvcPath;
    }
}

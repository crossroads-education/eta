import * as express from "express";
import * as fs from "fs-extra";
import * as eta from "../../eta";

export default class RedirectTransformer extends eta.IRequestTransformer {
    private static redirects: {[key: string]: string};

    private static init(): void {
        if (this.redirects) {
            return;
        }
        this.redirects = {};
        Object.keys(eta.config.modules).forEach(k => {
            this.redirects = eta.object.merge(eta.config.modules[k].redirects, this.redirects);
        });
    }

    public async onRequest(): Promise<void> {
        RedirectTransformer.init();
        const redirectUrl: string = RedirectTransformer.redirects[this.req.mvcPath];
        if (redirectUrl) {
            this.redirect(redirectUrl);
        }
    }
}

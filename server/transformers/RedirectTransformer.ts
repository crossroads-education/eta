import * as express from "express";
import * as fs from "fs-extra";
import * as eta from "../../eta";

export default class RedirectTransformer extends eta.IRequestTransformer {
    private static redirects: {[key: string]: string};

    private static init(): void {
        if (this.redirects) {
            return;
        }
        const filenames: string[] = [
            eta.constants.basePath + "redirects.json",
            eta.constants.contentPath + "redirects.json"
        ];
        this.redirects = {};
        filenames.forEach(filename => {
            if (!fs.existsSync(filename)) {
                return;
            }
            let data: any = fs.readFileSync(filename);
            try {
                data = JSON.parse(data.toString());
            } catch (err) {
                eta.logger.error("Couldn't parse JSON in " + filename + ": " + err.message);
                return;
            }
            eta.object.merge(data, this.redirects);
        });
    }

    public onRequest(): void {
        RedirectTransformer.init();
        const redirectUrl: string = RedirectTransformer.redirects[this.req.mvcPath];
        if (redirectUrl) {
            this.redirect(redirectUrl);
        }
    }
}

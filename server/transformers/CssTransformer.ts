import * as express from "express";
import * as fs from "fs";
import * as eta from "../../eta";
import * as helpers from "../../helpers";

export default class CssTransformer extends eta.IRequestTransformer {
    private static redirects: {[key: string]: string};

    private static init(): void {
        if (this.redirects) {
            return;
        }
        const filename: string = eta.constants.contentPath + "css.json";
        if (!helpers.fs.existsSync(filename)) {
            eta.logger.warn("CSS redirect file was not found: " + filename);
            return;
        }
        try {
            this.redirects = JSON.parse(fs.readFileSync(filename).toString());
        } catch (err) {
            eta.logger.warn("CSS redirect file is not valid JSON: " + filename);
        }
    }

    public async beforeResponse(): Promise<void> {
        CssTransformer.init();
        const view: {[key: string]: any} = this.res.view;
        if (!view["css"]) {
            view["css"] = [];
        }
        const css: string[] = view["css"];
        for (let i = 0; i < css.length; i++) {
            if (css[i][0] === "@") {
                const name: string = css[i].substring(1);
                if (CssTransformer.redirects[name]) {
                    css[i] = CssTransformer.redirects[name];
                } else {
                    eta.logger.warn("CSS redirect " + name + " could not be found.");
                }
            }
        }
        view["css"] = css;
        this.res.view = view;
    }
}

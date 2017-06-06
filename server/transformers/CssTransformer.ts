import * as express from "express";
import * as fs from "fs";
import * as api from "../api";
import * as helpers from "../../helpers";

export default class CssTransformer extends api.IViewTransformer {
    private static redirects: {[key: string]: string};

    private static init(): void {
        if (this.redirects) {
            return;
        }
        let filename: string = api.constants.contentPath + "css.json";
        if (!helpers.fs.existsSync(filename)) {
            api.logger.warn("CSS redirect file was not found: " + filename);
            return;
        }
        try {
            this.redirects = JSON.parse(fs.readFileSync(filename).toString());
        } catch (err) {
            api.logger.warn("CSS redirect file is not valid JSON: " + filename);
        }
    }

    public transform(): {[key: string]: any} {
        CssTransformer.init();
        let view: {[key: string]: any} = this.res.view;
        if (!view["css"]) {
            view["css"] = [];
        }
        let css: string[] = view["css"];
        for (let i: number = 0; i < css.length; i++) {
            if (css[i][0] === "@") {
                let name: string = css[i].substring(1);
                if (CssTransformer.redirects[name]) {
                    css[i] = CssTransformer.redirects[name];
                } else {
                    api.logger.warn("CSS redirect " + name + " could not be found.");
                }
            }
        }
        view["css"] = css;
        return view;
    }
}

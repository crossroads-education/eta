import * as express from "express";
import * as api from "../api";

export default class CssTransformer extends api.IViewTransformer {
    private static redirects: {[key: string]: string} = {
        "bootstrap": "https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.7/css/bootstrap.min.css",
        "jquery-ui": "https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.1/jquery-ui.min.css",
        "select2": "https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.3/css/select2.min.css",
        "select2-bootstrap": "https://cdnjs.cloudflare.com/ajax/libs/select2-bootstrap-css/1.4.6/select2-bootstrap.min.css",
        "source-sans-pro": "https://fonts.googleapis.com/css?family=Source+Sans+Pro:400,500,600,800"
    };

    public transform(): {[key: string]: any} {
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

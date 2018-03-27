import * as _ from "lodash";
import * as supertest from "supertest";

export default class TestRunner {
    private agent: supertest.SuperTest<supertest.Test>;
    private pathPrefix: string;

    public constructor(baseUrl = "http://localhost:3000", pathPrefix = "") {
        this.agent = supertest.agent(baseUrl);
        this.pathPrefix = pathPrefix;
    }

    public request(url: string, options?: Partial<RequestOptions>): supertest.Test {
        if (!url.startsWith("/")) url = this.pathPrefix + url;
        options = _.defaults<Partial<RequestOptions>, Partial<RequestOptions>>(options, {
            method: "get",
            apiToken: process.env.API_TOKEN,
            params: {}
        });
        let req: supertest.Test = this.agent[options.method].bind(this.agent)(url);
        if (options.apiToken !== undefined) req = req.set("Authorization", "Bearer " + options.apiToken);
        if (options.method === "get") req = req.query(options.params);
        else req = req.send(options.params).type("form");
        return req;
    }
}

interface RequestOptions {
    method: "get" | "post" | "patch" | "put" | "delete";
    apiToken: string;
    params: {[key: string]: any};
}
